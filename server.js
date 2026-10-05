import express from 'express';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';
import crypto from 'node:crypto';
import { all, one, run, setup, hashPassword, checkPassword, slugify, uniqueSlug, uniqueColumnistSlug, uniqueBookSlug, LIVE } from './db.js';
import * as V from './views.js';

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const SESSION_MS = 1000 * 60 * 60 * 8;
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_IMG = 4 * 1024 * 1024; // a Vercel aceita até 4,5 MB por envio

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': `default-src 'self'; img-src 'self' data: ${SB_URL}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-src https://www.youtube.com https://www.facebook.com https://www.instagram.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'`,
  });
  next();
});
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(async (req, res, next) => { try { await setup(); next(); } catch (e) { next(e); } });

/* ---------------- fotos no Supabase Storage ---------------- */
const sb = (p, init = {}) => fetch(`${SB_URL}/storage/v1/${p}`, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...init.headers } });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
async function storeImage(file) {
  const name = crypto.randomBytes(12).toString('hex') + EXT[file.mimetype];
  const r = await sb(`object/uploads/${name}`, { method: 'POST', headers: { 'Content-Type': file.mimetype, 'Cache-Control': '604800' }, body: file.buffer });
  if (!r.ok) throw new Error(`Falha ao enviar imagem: ${r.status} ${await r.text()}`);
  return name;
}
const removeImage = async (name) => { if (name && /^[a-f0-9]+\.(jpg|png|webp)$/.test(name)) await sb(`object/uploads/${name}`, { method: 'DELETE' }).catch(() => {}); };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMG, files: 1 }, fileFilter: (_r, f, cb) => cb(null, Boolean(EXT[f.mimetype])) });
/* confere os primeiros bytes: o tipo declarado pelo navegador não é confiável */
function realImage(f) {
  const b = f.buffer;
  if (f.mimetype === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8;
  if (f.mimetype === 'image/png') return b.subarray(0, 4).toString('hex') === '89504e47';
  return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
}
function takeUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    req.uploadError = null;
    if (err) req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem muito grande: o limite é 4 MB.' : 'Não foi possível enviar a imagem.';
    else if (req.file && !realImage(req.file)) { req.file = null; req.uploadError = 'Imagem inválida: use JPG, PNG ou WEBP.'; }
    next();
  });
}
const uploadSocial = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMG, files: 30 }, fileFilter: (_r, f, cb) => cb(null, Boolean(EXT[f.mimetype])) });
/* as redes são cadastradas pelo painel, então os campos de foto variam: aceita qualquer nome e confere cada imagem */
function takeSocialUpload(req, res, next) {
  uploadSocial.any()(req, res, (err) => {
    req.uploadError = null;
    req.socialFiles = {};
    if (err) { req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem muito grande: o limite é 4 MB.' : 'Não foi possível enviar a imagem.'; return next(); }
    for (const f of req.files || []) {
      if (realImage(f)) req.socialFiles[f.fieldname] = f;
      else req.uploadError = 'Imagem inválida: use JPG, PNG ou WEBP.';
    }
    next();
  });
}

/* ---------------- sessão ---------------- */
const parseCookies = (h = '') => Object.fromEntries(h.split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
async function loadSession(req) {
  const tok = parseCookies(req.headers.cookie).sid;
  if (!tok) return null;
  const s = await one(`SELECT s.token, s.csrf, s.expires_at, u.id uid, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`, [tok]);
  if (!s || Number(s.expires_at) < Date.now()) { if (s) await run('DELETE FROM sessions WHERE token = ?', [tok]); return null; }
  return s;
}
async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  await run('INSERT INTO sessions (token, user_id, csrf, expires_at) VALUES (?,?,?,?)', [token, userId, crypto.randomBytes(24).toString('base64url'), Date.now() + SESSION_MS]);
  res.append('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${IS_PROD ? '; Secure' : ''}`);
}
const endSession = (res) => res.append('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');

/* proteção contra tentativas em massa de senha (por instância do servidor) */
const attempts = new Map();
const blocked = (ip) => { const a = attempts.get(ip); return a && a.n >= 8 && a.until > Date.now(); };
const fail = (ip) => { const a = attempts.get(ip); const n = a && a.until > Date.now() ? a.n + 1 : 1; attempts.set(ip, { n, until: Date.now() + 15 * 60e3 }); };

async function requireAuth(req, res, next) {
  const s = await loadSession(req);
  if (!s) return res.redirect('/admin/entrar');
  req.user = { id: s.uid, email: s.email, name: s.name };
  req.csrf = s.csrf;
  res.set('Cache-Control', 'no-store');
  next();
}
function checkCsrf(req, res, next) {
  const given = Buffer.from(String(req.body?._csrf || ''));
  const want = Buffer.from(req.csrf);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(403).send('Sessão inválida. Volte e tente de novo.');
  next();
}

/* ---------------- texto seguro ---------------- */
const UPLOADS_PREFIX = `${SB_URL}/storage/v1/object/public/uploads/`;
const sanitizeBody = (html) => sanitizeHtml(html || '', {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'span', 'img', 'hr'],
  allowedAttributes: { a: ['href', 'rel', 'target'], img: ['src', 'alt'], '*': ['style'] },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
      'font-size': [/^(14|17|22|28)px$/],
      'line-height': [/^(1|1\.5|2)$/], /* simples, 1,5 (ABNT) e duplo; valores antigos caem no padrão */
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true), div: 'p' },
  exclusiveFilter: (frame) => frame.tag === 'img' && !(frame.attribs.src || '').startsWith(UPLOADS_PREFIX),
}).trim();

/* Limpa o excesso de espaço do texto sem tirar a linha em branco que a pessoa colocou de propósito:
   parágrafos vazios viram uma única linha em branco (<p><br /></p>), várias seguidas viram uma só,
   as das pontas somem, e quebras repetidas e texto solto são arrumados.
   O espaço do texto vem da entrelinha 1,5 da NBR 14724 (CSS), sem margens extras entre parágrafos. */
const VAZIO = '(?:\\s|&nbsp;|<br\\s*\\/?>)*';
const LINHA_EM_BRANCO = '<p><br /></p>';
function normalizeBody(html) {
  let h = String(html || '');
  const primeiroBloco = h.search(/<(p|h2|h3|ul|ol|blockquote|hr)\b/i);
  const solto = primeiroBloco === -1 ? h : h.slice(0, primeiroBloco);
  if (solto.replace(/<[^>]*>|&nbsp;|\s/g, '')) h = `<p>${solto.trim()}</p>${primeiroBloco === -1 ? '' : h.slice(primeiroBloco)}`;
  h = h.replace(/(?:&nbsp;\s*){2,}/g, ' ');
  h = h.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br /><br />');
  h = h.replace(new RegExp(`<p(?:\\s[^>]*)?>${VAZIO}<\\/p>`, 'gi'), LINHA_EM_BRANCO);
  h = h.replace(/(<(?:p|h2|h3|li|blockquote)(?:\s[^>]*)?>)[\s\u00a0]+/gi, '$1').replace(/[\s\u00a0]+(<\/(?:p|h2|h3|li|blockquote)>)/gi, '$1');
  h = h.replace(/(<(?:p|h2|h3|li|blockquote)(?:\s[^>]*)?>)(?:\s*<br\s*\/?>)+\s*(?!<\/)/gi, '$1').replace(/(?<!<p(?:\s[^>]*)?>)(?:\s*<br\s*\/?>)+\s*(<\/(?:p|h2|h3|li|blockquote)>)/gi, '$1');
  const vazio = new RegExp(`<(h2|h3|blockquote|li)(?:\\s[^>]*)?>${VAZIO}<\\/\\1>`, 'gi');
  let antes;
  do { antes = h; h = h.replace(vazio, ''); } while (h !== antes);
  const sequencia = new RegExp(`(?:${LINHA_EM_BRANCO.replace(/[/]/g, '\\/')}\\s*){2,}`, 'g');
  h = h.replace(sequencia, LINHA_EM_BRANCO);
  h = h.replace(new RegExp(`^(?:${LINHA_EM_BRANCO.replace(/[/]/g, '\\/')}\\s*)+`), '').replace(new RegExp(`(?:\\s*${LINHA_EM_BRANCO.replace(/[/]/g, '\\/')})+$`), '');
  return h.trim();
}
const cleanBody = (html) => normalizeBody(sanitizeBody(html));
const plain = (h) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const cleanLine = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/* ---------------- estatísticas de audiência ---------------- */
/* hash anônimo do visitante: muda todo dia, não guarda IP nem user-agent em texto puro */
const visitorHash = (req) => crypto.createHash('sha256')
  .update(`${new Date().toISOString().slice(0, 10)}|${req.ip}|${req.headers['user-agent'] || ''}|${process.env.ANALYTICS_SALT || 'pinhao'}`).digest('hex').slice(0, 32);
const logView = (req, kind, path, articleId = null) =>
  run('INSERT INTO pageviews (path, kind, article_id, visitor_hash) VALUES (?,?,?,?)', [path, kind, articleId, visitorHash(req)]).catch(() => {});
const EVENT_TYPES = ['social_click', 'share_click'];
app.post('/evento', express.json({ limit: '2kb' }), (req, res) => {
  const tipo = cleanLine(req.body?.tipo, 40);
  const meta = cleanLine(req.body?.meta, 60);
  if (EVENT_TYPES.includes(tipo)) run('INSERT INTO events (type, meta, visitor_hash) VALUES (?,?,?)', [tipo, meta, visitorHash(req)]).catch(() => {});
  res.status(204).end();
});

const cats = () => all('SELECT * FROM categories ORDER BY position, id');
const socialRows = () => all('SELECT * FROM social_links ORDER BY position, network');
const getSetting = async (key) => (await one('SELECT value FROM settings WHERE key = ?', [key]))?.value;
const setSetting = (key, value) => run('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
/* redes dos botões de compartilhar: sem escolha salva, vale o padrão (Facebook, WhatsApp e Instagram) */
const shareNets = async () => { const v = await getSetting('share_networks'); return v === undefined ? V.DEFAULT_SHARE : v.split(',').filter(Boolean); };
const safeUrl = (u) => (/^https?:\/\/\S+$/i.test(u) ? u : '');
const allColumnists = () => all('SELECT * FROM columnists ORDER BY position, id');
const SELECT_A = `SELECT a.*, c.name cat_name, c.slug cat_slug, col.name columnist_name, col.slug columnist_slug, col.photo columnist_photo
  FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN columnists col ON col.id = a.columnist_id`;
const ORDER = 'ORDER BY a.published_at DESC, a.id DESC';
const site = async (res, opts) => res.send(V.siteLayout({ cats: await cats(), social: opts.social || await socialRows(), ...opts }));

/* =============== SITE PÚBLICO =============== */
const PER_PAGE = 15;
app.get('/', async (req, res) => {
  const live = await all(`${SELECT_A} WHERE ${LIVE} ${ORDER} LIMIT 500`);
  const lead = live.find((a) => a.featured) || live[0];
  const rest = live.filter((a) => a !== lead);
  const apoio = rest.slice(0, 2);
  const feed = rest.slice(2);
  const pages = Math.max(1, Math.ceil(feed.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.pagina, 10) || 1));
  const social = await socialRows();
  const livros = await all(`SELECT b.*, c.name colunista_nome, c.slug colunista_slug FROM columnist_books b
    JOIN columnists c ON c.id = b.columnist_id WHERE b.featured AND c.active ORDER BY b.id DESC LIMIT 8`);
  logView(req, 'home', '/');
  await site(res, { social, body: V.homeView({ lead, apoio, feed: feed.slice((page - 1) * PER_PAGE, page * PER_PAGE), page, pages, social, livros }) });
});

app.get('/noticia/:slug', async (req, res, next) => {
  const a = await one(`${SELECT_A} WHERE a.slug = ? AND ${LIVE}`, [req.params.slug]);
  if (!a) return next();
  const related = await all(`${SELECT_A} WHERE ${LIVE} AND a.id != ? AND a.category_id IS NOT DISTINCT FROM ? ${ORDER} LIMIT 3`, [a.id, a.category_id]);
  logView(req, 'article', req.path, a.id);
  a.body = cleanBody(a.body);
  await site(res, { title: a.title, description: V.excerptOf(a), image: a.image ? V.imgUrl(a.image) : '', type: 'article', current: a.cat_slug, body: V.articleView(a, related, await shareNets()) });
});

app.get('/categoria/:slug', async (req, res, next) => {
  const cat = await one('SELECT * FROM categories WHERE slug = ?', [req.params.slug]);
  if (!cat) return next();
  const items = await all(`${SELECT_A} WHERE ${LIVE} AND a.category_id = ? ${ORDER} LIMIT 60`, [cat.id]);
  logView(req, 'category', req.path);
  await site(res, { title: cat.name, current: cat.slug, description: `Notícias de ${cat.name} no Portal do Pinhão.`, body: V.listView({ heading: cat.name, items }) });
});

app.get('/busca', async (req, res) => {
  const q = cleanLine(req.query.q, 80);
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const items = q ? await all(`${SELECT_A} WHERE ${LIVE} AND (a.title ILIKE ? ESCAPE '\\' OR a.summary ILIKE ? ESCAPE '\\' OR a.body ILIKE ? ESCAPE '\\' OR a.tags ILIKE ? ESCAPE '\\') ${ORDER} LIMIT 40`, [like, like, like, like]) : [];
  if (q) logView(req, 'search', req.path);
  await site(res, { title: q ? `Busca: ${q}` : 'Busca', q, body: V.listView({ heading: q ? `Resultados para “${q}”` : 'Buscar notícias', items, note: q ? `<p class="meta" style="margin-top:6px">${items.length} resultado(s)</p>` : '' }) });
});

app.get('/colunistas', async (req, res) => {
  const items = await all('SELECT * FROM columnists WHERE active ORDER BY position, id');
  await site(res, { title: 'Colunistas', current: 'colunistas', description: 'Colunistas do Portal do Pinhão.', body: V.columnistsView(items) });
});
app.get('/colunistas/:slug', async (req, res, next) => {
  const col = await one('SELECT * FROM columnists WHERE slug = ?', [req.params.slug]);
  if (!col) return next();
  const items = await all(`${SELECT_A} WHERE ${LIVE} AND a.columnist_id = ? ${ORDER} LIMIT 500`, [col.id]);
  const books = await all('SELECT * FROM columnist_books WHERE columnist_id = ? ORDER BY position, id', [col.id]);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.pagina, 10) || 1));
  logView(req, 'columnist', req.path);
  await site(res, { title: col.name, current: 'colunistas', description: col.tagline || `Coluna de ${col.name} no Portal do Pinhão.`, image: col.photo ? V.imgUrl(col.photo) : '',
    body: V.columnistView({ col, items: items.slice((page - 1) * PER_PAGE, page * PER_PAGE), books, page, pages }) });
});
app.get('/colunistas/:slug/livros/:bookSlug', async (req, res, next) => {
  const col = await one('SELECT * FROM columnists WHERE slug = ?', [req.params.slug]);
  const b = col && await one('SELECT * FROM columnist_books WHERE columnist_id = ? AND slug = ?', [col.id, req.params.bookSlug]);
  if (!col || !b) return next();
  await site(res, { title: `${b.title} — ${col.name}`, current: 'colunistas', description: (b.synopsis || '').slice(0, 200) || `Livro de ${col.name}.`,
    body: V.bookView({ col, book: b }) });
});

/* =============== ADMIN: acesso =============== */
app.get('/admin/entrar', async (req, res) => (await loadSession(req) ? res.redirect('/admin') : res.send(V.loginView({}))));
app.post('/admin/entrar', async (req, res) => {
  const ip = req.ip;
  if (blocked(ip)) return res.status(429).send(V.loginView({ erro: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' }));
  const email = cleanLine(req.body.email, 120).toLowerCase();
  const u = await one('SELECT * FROM users WHERE email = ?', [email]);
  const ok = u ? checkPassword(String(req.body.senha || ''), u.password_hash) : (checkPassword('x', hashPassword('y')), false);
  if (!ok) { fail(ip); return res.status(401).send(V.loginView({ erro: 'E-mail ou senha incorretos.', email })); }
  attempts.delete(ip);
  await startSession(res, u.id);
  res.redirect('/admin');
});
app.post('/admin/sair', requireAuth, checkCsrf, async (req, res) => {
  await run('DELETE FROM sessions WHERE token = ?', [parseCookies(req.headers.cookie).sid]);
  endSession(res);
  res.redirect('/admin/entrar');
});

app.use('/admin', requireAuth);
const page = (req, res, o) => res.send(V.adminLayout({ user: req.user, csrf: req.csrf, ...o }));
const flash = (req) => ({ msg: { ok: 'Feito.', pub: 'Notícia publicada com sucesso.', draft: 'Rascunho salvo.', del: 'Notícia apagada.', ag: 'Notícia agendada com sucesso.', cat: 'Categoria salva.', conta: 'Conta atualizada.', img: 'Imagem enviada.', redes: 'Redes sociais atualizadas.', col: 'Colunista salvo.' }[req.query.ok] || '' });

/* =============== ADMIN: painel =============== */
app.get('/admin', async (req, res) => {
  const n = async (w) => Number((await one(`SELECT COUNT(*) c FROM articles a WHERE ${w}`)).c);
  const tz = `AT TIME ZONE 'America/Sao_Paulo'`;
  const counts = {
    published: await n(LIVE), draft: await n(`a.status = 'draft'`),
    scheduled: await n(`a.status = 'published' AND a.published_at > now()`),
    today: await n(`${LIVE} AND (a.published_at ${tz})::date = (now() ${tz})::date`),
  };
  const recent = await all(`${SELECT_A} ORDER BY a.updated_at DESC LIMIT 8`);
  page(req, res, { title: 'Visão geral', crumb: 'PAINEL', active: '/admin', body: V.dashboardView({ counts, recent, csrf: req.csrf }), ...flash(req) });
});

app.get('/admin/estatisticas', async (req, res) => {
  const desde = (sql) => `created_at >= ${sql}`;
  const HOJE = desde(`date_trunc('day', now())`);
  const D7 = desde(`now() - interval '7 days'`);
  const D30 = desde(`now() - interval '30 days'`);
  const total = async (w) => Number((await one(`SELECT COUNT(*) c FROM pageviews WHERE ${w}`)).c);
  const uniq = async (w) => Number((await one(`SELECT COUNT(DISTINCT visitor_hash) c FROM pageviews WHERE ${w}`)).c);
  const stats = {
    viewsHoje: await total(HOJE), viewsD7: await total(D7), viewsD30: await total(D30),
    visitantesHoje: await uniq(HOJE), visitantesD7: await uniq(D7), visitantesD30: await uniq(D30),
  };
  const topArtigos = await all(`SELECT a.id, a.title, a.slug, c.name cat_name, COUNT(*)::int views
    FROM pageviews p JOIN articles a ON a.id = p.article_id LEFT JOIN categories c ON c.id = a.category_id
    WHERE p.${D7} GROUP BY a.id, c.name ORDER BY views DESC LIMIT 10`);
  const porDia = await all(`SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date::text dia, COUNT(*)::int c
    FROM pageviews WHERE ${D30} GROUP BY dia ORDER BY dia`);
  const porPagina = await all(`SELECT kind, COUNT(*)::int c FROM pageviews WHERE ${D7} GROUP BY kind ORDER BY c DESC`);
  const conversoes = await all(`SELECT type, meta, COUNT(*)::int c FROM events WHERE ${D7} GROUP BY type, meta ORDER BY c DESC`);
  const nomes = Object.fromEntries((await socialRows()).map((r) => [r.network, V.networkName(r)]));
  page(req, res, { title: 'Estatísticas', crumb: 'ESTATÍSTICAS', active: '/admin/estatisticas', body: V.statsView({ stats, topArtigos, porDia, porPagina, conversoes, nomes }), ...flash(req) });
});

app.get('/admin/noticias', async (req, res) => {
  const filter = ['published', 'draft', 'scheduled'].includes(req.query.status) ? req.query.status : 'todas';
  const where = { todas: 'true', published: LIVE, draft: `a.status = 'draft'`, scheduled: `a.status = 'published' AND a.published_at > now()` }[filter];
  const items = await all(`${SELECT_A} WHERE ${where} ORDER BY a.updated_at DESC LIMIT 200`);
  page(req, res, { title: 'Todas as notícias', crumb: 'NOTÍCIAS / TODAS', active: '/admin/noticias', body: V.articlesListView({ items, filter, csrf: req.csrf }), ...flash(req) });
});

const blank = { title: '', summary: '', body: '', category_id: '', columnist_id: '', tags: '', author: '', image: '', image_credit: '', video_url: '', status: 'draft', featured: 0 };
const renderForm = async (req, res, a, erros = [], code = 200) =>
  res.status(code).send(V.adminLayout({ user: req.user, csrf: req.csrf, title: a.id ? 'Editar notícia' : 'Nova notícia', crumb: a.id ? 'NOTÍCIAS / EDITAR' : 'NOTÍCIAS / NOVA PUBLICAÇÃO', active: a.id ? '/admin/noticias' : '/admin/noticias/nova',
    erro: erros.map(V.esc).join('<br>'), body: V.articleForm({ a, cats: await cats(), columnists: await allColumnists(), csrf: req.csrf }) }));

app.post('/admin/editor/imagem', takeUpload, checkCsrf, async (req, res) => {
  if (req.uploadError || !req.file) return res.status(400).json({ erro: req.uploadError || 'Escolha uma imagem JPG, PNG ou WEBP.' });
  const name = await storeImage(req.file);
  res.json({ url: V.imgUrl(name) });
});

app.get('/admin/noticias/nova', (req, res) => renderForm(req, res, { ...blank, author: req.user.name }));
app.get('/admin/noticias/:id', async (req, res, next) => {
  const a = await one('SELECT * FROM articles WHERE id = ?', [Number(req.params.id) || 0]);
  if (!a) return next();
  await renderForm(req, res, { ...a, body: cleanBody(a.body) });
});

const nowIso = () => new Date().toISOString();
async function saveArticle(req, res, id) {
  const old = id ? await one('SELECT * FROM articles WHERE id = ?', [id]) : null;
  if (id && !old) return res.status(404).send('Notícia não encontrada.');
  const b = req.body || {};
  const publish = b.action === 'publish';
  const body = cleanBody(b.body);
  const catId = (await one('SELECT id FROM categories WHERE id = ?', [Number(b.category_id) || 0]))?.id || null;
  const columnistId = (await one('SELECT id FROM columnists WHERE id = ?', [Number(b.columnist_id) || 0]))?.id || null;
  const videoUrl = cleanLine(b.video_url, 300);
  const a = { ...(old || blank), id: old?.id, title: cleanLine(b.title, 160), summary: cleanLine(b.summary, 220), body, category_id: catId, columnist_id: columnistId, tags: cleanLine(b.tags, 120), author: cleanLine(b.author, 80),
    image: old?.image || '', image_credit: cleanLine(b.image_credit, 120), video_url: videoUrl, featured: b.featured ? 1 : 0, status: publish ? 'published' : 'draft' };

  const erros = [];
  if (req.uploadError) erros.push(req.uploadError + ' O conteúdo preenchido permanece.');
  if (!a.title) erros.push('Preencha o título.');
  if (publish && !catId) erros.push('Escolha uma categoria para publicar.');
  if (publish && !plain(body)) erros.push('Escreva o texto da notícia para publicar.');
  if (videoUrl && !V.videoEmbed(videoUrl)) erros.push('Não reconheci esse link de vídeo. Cole um link do YouTube, Instagram ou Facebook.');

  let when = old?.published_at || null;
  if (publish) {
    if (b.quando === 'schedule') {
      const t = new Date(`${b.quando_em}:00-03:00`);
      if (!b.quando_em || isNaN(t) || t <= new Date()) erros.push('Escolha uma data e hora futuras para agendar.');
      else when = t.toISOString();
    } else if (!when || new Date(when) > new Date() || old?.status !== 'published') when = nowIso();
  }
  if (erros.length) return renderForm(req, res, { ...a, published_at: old?.published_at, image: old?.image || '' }, erros, 422);

  if (req.file) { await removeImage(old?.image); a.image = await storeImage(req.file); }
  else if (b.remove_image) { await removeImage(old?.image); a.image = ''; }
  a.slug = old && old.title === a.title ? old.slug : await uniqueSlug(a.title, id || 0);
  if (old && old.status === 'published' && old.title !== a.title) a.slug = old.slug; // mantém o endereço já divulgado
  if (a.featured) await run('UPDATE articles SET featured = 0');

  const vals = [a.title, a.slug, a.summary, a.body, a.category_id, a.columnist_id, a.image || null, a.image_credit, a.tags, a.author, a.status, a.featured, when, a.video_url];
  if (old) await run(`UPDATE articles SET title=?, slug=?, summary=?, body=?, category_id=?, columnist_id=?, image=?, image_credit=?, tags=?, author=?, status=?, featured=?, published_at=?, video_url=?, updated_at=now() WHERE id=?`, [...vals, id]);
  else await run(`INSERT INTO articles (title, slug, summary, body, category_id, columnist_id, image, image_credit, tags, author, status, featured, published_at, video_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, vals);
  res.redirect(`/admin/noticias?ok=${!publish ? 'draft' : b.quando === 'schedule' ? 'ag' : 'pub'}`);
}
app.post('/admin/noticias', takeUpload, checkCsrf, (req, res) => saveArticle(req, res, 0));
app.post('/admin/noticias/:id', takeUpload, checkCsrf, (req, res) => saveArticle(req, res, Number(req.params.id) || 0));
app.post('/admin/noticias/:id/apagar', checkCsrf, async (req, res) => {
  const id = Number(req.params.id) || 0;
  const a = await one('SELECT image FROM articles WHERE id = ?', [id]);
  if (a) { await run('DELETE FROM articles WHERE id = ?', [id]); await removeImage(a.image); }
  res.redirect('/admin/noticias?ok=del');
});

/* =============== ADMIN: categorias, mídia, conta =============== */
const catsWithTotals = () => all('SELECT c.*, (SELECT COUNT(*) FROM articles WHERE category_id = c.id)::int total FROM categories c ORDER BY position, id');
app.get('/admin/categorias', async (req, res) => page(req, res, { title: 'Categorias', crumb: 'CATEGORIAS', active: '/admin/categorias', body: V.categoriesView({ cats: await catsWithTotals(), csrf: req.csrf }), ...flash(req) }));
app.post('/admin/categorias', checkCsrf, async (req, res) => {
  const name = cleanLine(req.body.name, 40);
  const slug = slugify(name);
  if (!name || await one('SELECT 1 x FROM categories WHERE slug = ? OR name = ?', [slug, name]))
    return page(req, res, { title: 'Categorias', crumb: 'CATEGORIAS', active: '/admin/categorias', erro: name ? 'Já existe uma categoria com esse nome.' : 'Digite o nome da categoria.', body: V.categoriesView({ cats: await catsWithTotals(), csrf: req.csrf }) });
  await run('INSERT INTO categories (name, slug, position) VALUES (?,?,(SELECT COALESCE(MAX(position),0)+1 FROM categories))', [name, slug]);
  res.redirect('/admin/categorias?ok=cat');
});
app.post('/admin/categorias/:id/apagar', checkCsrf, async (req, res) => {
  const id = Number(req.params.id) || 0;
  if (!await one('SELECT 1 x FROM articles WHERE category_id = ?', [id])) await run('DELETE FROM categories WHERE id = ?', [id]);
  res.redirect('/admin/categorias?ok=cat');
});
app.post('/admin/categorias/:id/mover', checkCsrf, async (req, res) => {
  const id = Number(req.params.id) || 0;
  const passo = req.body.direcao === 'cima' ? -1 : 1;
  const ordenadas = await all('SELECT id, position FROM categories ORDER BY position, id');
  const i = ordenadas.findIndex((c) => c.id === id);
  const j = i + passo;
  if (i > -1 && j > -1 && j < ordenadas.length) {
    await run('UPDATE categories SET position = ? WHERE id = ?', [ordenadas[j].position, ordenadas[i].id]);
    await run('UPDATE categories SET position = ? WHERE id = ?', [ordenadas[i].position, ordenadas[j].id]);
  }
  res.redirect('/admin/categorias?ok=cat');
});

/* =============== ADMIN: colunistas =============== */
const columnistsWithTotals = () => all('SELECT c.*, (SELECT COUNT(*) FROM articles WHERE columnist_id = c.id)::int total FROM columnists c ORDER BY position, id');
app.get('/admin/colunistas', async (req, res) => page(req, res, { title: 'Colunistas', crumb: 'COLUNISTAS', active: '/admin/colunistas', body: V.columnistsListView({ items: await columnistsWithTotals(), csrf: req.csrf }), ...flash(req) }));

const blankCol = { name: '', tagline: '', email: '', bio: '', photo: '', facebook_url: '', instagram_url: '', youtube_url: '', active: 1 };
const renderColForm = async (req, res, c, erros = [], code = 200) =>
  res.status(code).send(V.adminLayout({ user: req.user, csrf: req.csrf, title: c.id ? 'Editar colunista' : 'Novo colunista', crumb: c.id ? 'COLUNISTAS / EDITAR' : 'COLUNISTAS / NOVO', active: '/admin/colunistas',
    erro: erros.map(V.esc).join('<br>'), body: V.columnistForm({
      c, csrf: req.csrf,
      arts: c.id ? await all(`${SELECT_A} WHERE a.columnist_id = ? ORDER BY a.updated_at DESC LIMIT 200`, [c.id]) : [],
      books: c.id ? await all('SELECT * FROM columnist_books WHERE columnist_id = ? ORDER BY position, id', [c.id]) : [],
    }) }));

app.get('/admin/colunistas/novo', (req, res) => renderColForm(req, res, blankCol));
app.get('/admin/colunistas/:id', async (req, res, next) => {
  const c = await one('SELECT * FROM columnists WHERE id = ?', [Number(req.params.id) || 0]);
  if (!c) return next();
  await renderColForm(req, res, c);
});

async function saveColumnist(req, res, id) {
  const old = id ? await one('SELECT * FROM columnists WHERE id = ?', [id]) : null;
  if (id && !old) return res.status(404).send('Colunista não encontrado.');
  const b = req.body || {};
  const name = cleanLine(b.name, 80);
  const c = { name, tagline: cleanLine(b.tagline, 120), email: cleanLine(b.email, 120), bio: String(b.bio || '').slice(0, 4000).trim(),
    facebook_url: cleanLine(b.facebook_url, 300), instagram_url: cleanLine(b.instagram_url, 300), youtube_url: cleanLine(b.youtube_url, 300), active: b.active ? 1 : 0 };

  const erros = [];
  if (req.uploadError) erros.push(req.uploadError + ' Os demais campos preenchidos permanecem.');
  if (!name) erros.push('Preencha o nome do colunista.');
  if (erros.length) return renderColForm(req, res, { ...(old || blankCol), ...c, id }, erros, 422);

  let photo = old?.photo || '';
  if (req.file) { await removeImage(old?.photo); photo = await storeImage(req.file); }
  else if (b.remove_image) { await removeImage(old?.photo); photo = ''; }

  const slug = old && old.name === name ? old.slug : await uniqueColumnistSlug(name, id || 0);
  const vals = [name, slug, c.tagline, c.email, c.bio, c.facebook_url, c.instagram_url, c.youtube_url, photo || null, c.active];
  if (old) await run('UPDATE columnists SET name=?, slug=?, tagline=?, email=?, bio=?, facebook_url=?, instagram_url=?, youtube_url=?, photo=?, active=? WHERE id=?', [...vals, id]);
  else await run('INSERT INTO columnists (name, slug, tagline, email, bio, facebook_url, instagram_url, youtube_url, photo, active, position) VALUES (?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM columnists))', vals);
  res.redirect('/admin/colunistas?ok=col');
}
app.post('/admin/colunistas', takeUpload, checkCsrf, (req, res) => saveColumnist(req, res, 0));
app.post('/admin/colunistas/:id', takeUpload, checkCsrf, (req, res) => saveColumnist(req, res, Number(req.params.id) || 0));
app.post('/admin/colunistas/:id/apagar', checkCsrf, async (req, res) => {
  const id = Number(req.params.id) || 0;
  const c = await one('SELECT photo FROM columnists WHERE id = ?', [id]);
  if (c && !await one('SELECT 1 x FROM articles WHERE columnist_id = ?', [id])) { await run('DELETE FROM columnists WHERE id = ?', [id]); await removeImage(c.photo); }
  res.redirect('/admin/colunistas?ok=col');
});
app.post('/admin/colunistas/:id/mover', checkCsrf, async (req, res) => {
  const id = Number(req.params.id) || 0;
  const passo = req.body.direcao === 'cima' ? -1 : 1;
  const ordenadas = await all('SELECT id, position FROM columnists ORDER BY position, id');
  const i = ordenadas.findIndex((c) => c.id === id);
  const j = i + passo;
  if (i > -1 && j > -1 && j < ordenadas.length) {
    await run('UPDATE columnists SET position = ? WHERE id = ?', [ordenadas[j].position, ordenadas[i].id]);
    await run('UPDATE columnists SET position = ? WHERE id = ?', [ordenadas[i].position, ordenadas[j].id]);
  }
  res.redirect('/admin/colunistas?ok=col');
});

/* =============== ADMIN: livros do colunista =============== */
const renderBookForm = async (req, res, col, b, erros = [], code = 200) =>
  res.status(code).send(V.adminLayout({ user: req.user, csrf: req.csrf, title: b.id ? 'Editar livro' : 'Novo livro', crumb: 'COLUNISTAS / LIVROS', active: '/admin/colunistas',
    erro: erros.map(V.esc).join('<br>'), body: V.bookForm({ col, b, csrf: req.csrf }) }));

app.get('/admin/colunistas/:id/livros/novo', async (req, res, next) => {
  const col = await one('SELECT * FROM columnists WHERE id = ?', [Number(req.params.id) || 0]);
  if (!col) return next();
  await renderBookForm(req, res, col, { title: '', synopsis: '', cover: '', featured: 0 });
});
app.get('/admin/colunistas/:id/livros/:bookId', async (req, res, next) => {
  const col = await one('SELECT * FROM columnists WHERE id = ?', [Number(req.params.id) || 0]);
  const b = col && await one('SELECT * FROM columnist_books WHERE id = ? AND columnist_id = ?', [Number(req.params.bookId) || 0, col.id]);
  if (!col || !b) return next();
  await renderBookForm(req, res, col, b);
});

async function saveBook(req, res, colId, id) {
  const col = await one('SELECT * FROM columnists WHERE id = ?', [colId]);
  if (!col) return res.status(404).send('Colunista não encontrado.');
  const old = id ? await one('SELECT * FROM columnist_books WHERE id = ? AND columnist_id = ?', [id, colId]) : null;
  if (id && !old) return res.status(404).send('Livro não encontrado.');
  const title = cleanLine(req.body.title, 160);
  const synopsis = String(req.body.synopsis || '').slice(0, 6000).trim();
  const featured = req.body.featured ? 1 : 0;

  const erros = [];
  if (req.uploadError) erros.push(req.uploadError + ' Os demais campos preenchidos permanecem.');
  if (!title) erros.push('Preencha o título do livro.');
  if (erros.length) return renderBookForm(req, res, col, { id, title, synopsis, featured, cover: old?.cover || '' }, erros, 422);

  let cover = old?.cover || '';
  if (req.file) { await removeImage(old?.cover); cover = await storeImage(req.file); }
  else if (req.body.remove_image) { await removeImage(old?.cover); cover = ''; }

  const slug = old && old.title === title ? old.slug : await uniqueBookSlug(colId, title, id || 0);
  const vals = [title, slug, synopsis, cover || null, featured];
  if (old) await run('UPDATE columnist_books SET title=?, slug=?, synopsis=?, cover=?, featured=? WHERE id=?', [...vals, id]);
  else await run('INSERT INTO columnist_books (columnist_id, title, slug, synopsis, cover, featured, position) VALUES (?,?,?,?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM columnist_books WHERE columnist_id = ?))', [colId, title, slug, synopsis, cover || null, featured, colId]);
  res.redirect(`/admin/colunistas/${colId}?ok=col`);
}
app.post('/admin/colunistas/:id/livros', takeUpload, checkCsrf, (req, res) => saveBook(req, res, Number(req.params.id) || 0, 0));
app.post('/admin/colunistas/:id/livros/:bookId', takeUpload, checkCsrf, (req, res) => saveBook(req, res, Number(req.params.id) || 0, Number(req.params.bookId) || 0));
app.post('/admin/colunistas/:id/livros/:bookId/apagar', checkCsrf, async (req, res) => {
  const b = await one('SELECT cover FROM columnist_books WHERE id = ? AND columnist_id = ?', [Number(req.params.bookId) || 0, Number(req.params.id) || 0]);
  if (b) { await run('DELETE FROM columnist_books WHERE id = ? AND columnist_id = ?', [Number(req.params.bookId) || 0, Number(req.params.id) || 0]); await removeImage(b.cover); }
  res.redirect(`/admin/colunistas/${Number(req.params.id) || 0}?ok=col`);
});

async function listMedia() {
  const r = await sb('object/list/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 200, sortBy: { column: 'created_at', order: 'desc' } }) });
  const items = r.ok ? await r.json() : [];
  const used = new Set([
    ...(await all(`SELECT image FROM articles WHERE image IS NOT NULL AND image != ''`)).map((x) => x.image),
    ...(await all(`SELECT photo FROM columnists WHERE photo IS NOT NULL AND photo != ''`)).map((x) => x.photo),
  ]);
  return items.filter((f) => /\.(jpg|png|webp)$/.test(f.name)).map((f) => ({ name: f.name, used: used.has(f.name) }));
}
app.get('/admin/midia', async (req, res) => page(req, res, { title: 'Mídia', crumb: 'MÍDIA', active: '/admin/midia', body: V.mediaView({ files: await listMedia(), csrf: req.csrf }), ...flash(req) }));
app.post('/admin/midia', takeUpload, checkCsrf, async (req, res) => {
  if (req.uploadError || !req.file)
    return page(req, res, { title: 'Mídia', crumb: 'MÍDIA', active: '/admin/midia', erro: V.esc(req.uploadError || 'Escolha uma imagem JPG, PNG ou WEBP.'), body: V.mediaView({ files: await listMedia(), csrf: req.csrf }) });
  await storeImage(req.file);
  res.redirect('/admin/midia?ok=img');
});
app.post('/admin/midia/apagar', checkCsrf, async (req, res) => {
  const name = String(req.body.name || '');
  if (!await one('SELECT 1 x FROM articles WHERE image = ?', [name])) await removeImage(name);
  res.redirect('/admin/midia?ok=ok');
});

const redesPage = async (req, res, extra = {}) => page(req, res, { title: 'Redes sociais', crumb: 'REDES SOCIAIS', active: '/admin/redes', body: V.socialView({ links: await socialRows(), shareSel: await shareNets(), csrf: req.csrf }), ...extra });
app.get('/admin/redes', async (req, res) => redesPage(req, res, flash(req)));
app.post('/admin/redes', takeSocialUpload, checkCsrf, async (req, res) => {
  const erro = (m) => redesPage(req, res, { erro: V.esc(m) });
  if (req.uploadError) return erro(req.uploadError);
  const b = req.body || {};
  const atuais = await socialRows();

  /* confere tudo antes de gravar qualquer coisa */
  const urls = {};
  for (const s of atuais) {
    if (b[`${s.network}_delete`]) continue;
    const bruto = cleanLine(b[`${s.network}_url`], 300);
    urls[s.network] = safeUrl(bruto);
    if (bruto && !urls[s.network]) return erro(`O link de ${V.networkName(s)} precisa começar com http:// ou https://.`);
    if (!V.NETWORK_LABEL[s.network] && !cleanLine(b[`${s.network}_name`], 60)) return erro('A rede personalizada precisa de um nome.');
  }
  const escolha = String(b.nova_rede || '');
  let nova = null;
  if (escolha) {
    const nome = cleanLine(b.nova_name, 60);
    const url = safeUrl(cleanLine(b.nova_url, 300));
    if (escolha !== 'outra' && (!V.FOLLOW_CATALOG.includes(escolha) || atuais.some((l) => l.network === escolha))) return erro('Essa rede não pode ser adicionada.');
    if (escolha === 'outra' && !nome) return erro('Digite o nome da outra rede.');
    if (!url) return erro('Preencha o link da nova rede, começando com http:// ou https://.');
    let chave = escolha;
    if (escolha === 'outra') {
      const base = `outra-${slugify(nome)}`.slice(0, 40);
      chave = base;
      for (let n = 2; atuais.some((l) => l.network === chave); n++) chave = `${base}-${n}`;
    }
    nova = { chave, nome: escolha === 'outra' ? nome : '', url };
  }

  for (const s of atuais) {
    const k = s.network;
    if (b[`${k}_delete`]) { await removeImage(s.photo); await run('DELETE FROM social_links WHERE network = ?', [k]); continue; }
    let photo = s.photo || null;
    const file = req.socialFiles[`${k}_photo`];
    if (file) { await removeImage(photo); photo = await storeImage(file); }
    else if (b[`${k}_remove`]) { await removeImage(photo); photo = null; }
    await run('UPDATE social_links SET url=?, name=?, photo=?, updated_at=now() WHERE network=?', [urls[k], cleanLine(b[`${k}_name`], 60), photo, k]);
  }
  if (nova) {
    const file = req.socialFiles.nova_photo;
    await run('INSERT INTO social_links (network, url, name, photo, position) VALUES (?,?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM social_links))',
      [nova.chave, nova.url, nova.nome, file ? await storeImage(file) : null]);
  }
  await setSetting('share_networks', V.SHARE_OPTIONS.map(([k]) => k).filter((k) => b[`share_${k}`]).join(','));
  res.redirect('/admin/redes?ok=redes');
});

app.get('/admin/conta', (req, res) => page(req, res, { title: 'Minha conta', crumb: 'CONTA', active: '/admin/conta', body: V.accountView({ user: req.user, csrf: req.csrf }), ...flash(req) }));
app.post('/admin/conta', checkCsrf, async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const nova = String(req.body.nova || '');
  const erro = !checkPassword(String(req.body.atual || ''), u.password_hash) ? 'A senha atual está incorreta.' : nova && nova.length < 10 ? 'A nova senha precisa ter pelo menos 10 caracteres.' : '';
  if (erro) return page(req, res, { title: 'Minha conta', crumb: 'CONTA', active: '/admin/conta', erro, body: V.accountView({ user: req.user, csrf: req.csrf }) });
  await run('UPDATE users SET name = ?, password_hash = ? WHERE id = ?', [cleanLine(req.body.name, 60) || u.name, nova ? hashPassword(nova) : u.password_hash, u.id]);
  if (nova) await run('DELETE FROM sessions WHERE user_id = ? AND token != ?', [u.id, parseCookies(req.headers.cookie).sid]);
  res.redirect('/admin/conta?ok=conta');
});

/* =============== erros =============== */
app.use(async (req, res) => res.status(404).send(V.siteLayout({ title: 'Página não encontrada', cats: await cats(), body: `<div class="vazio vazio-404"><img src="/mascote-pinho.png" alt="" loading="lazy" width="180" height="225"><h2>Essa página fugiu do noticiário</h2><p>O endereço pode ter mudado. <a href="/"><b>Volte para a página inicial</b></a> ou use a busca.</p></div>` })));
app.use((err, req, res, _next) => { console.error(err); res.status(500).send('Algo deu errado. Tente novamente em instantes.'); });

if (!process.env.VERCEL) app.listen(PORT, () => console.log(`\nPortal do Pinhão em http://localhost:${PORT}   (painel: http://localhost:${PORT}/admin)\n`));
export default app;
