/* Templates HTML: site público e painel administrativo */
export const imgUrl = (name) => `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/uploads/${name}`;
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TZ = 'America/Sao_Paulo';
const toDate = (s) => new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'));
export const fmtFull = (s) => toDate(s).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtShort = (s) => toDate(s).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export function fmtRecent(s) {
  const d = toDate(s);
  const day = (x) => x.toLocaleDateString('pt-BR', { timeZone: TZ });
  return day(d) === day(new Date())
    ? d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
}
/* "YYYY-MM-DD HH:MM:SS" (UTC) -> valor de <input type=datetime-local> no horário de Brasília */
export function toLocalInput(s) {
  if (!s) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(toDate(s)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export const todayLabel = () => new Date().toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const stripTags = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const excerptOf = (a) => a.summary || stripTags(a.body).slice(0, 160);

/* =============== VÍDEO (YouTube, Instagram, Facebook) =============== */
/* Reconhece o link colado e devolve como embutir — só iframe, sem script de terceiro (mais simples e mais seguro) */
export function videoEmbed(raw) {
  const url = String(raw || '').trim();
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)))
    return { platform: 'youtube', src: `https://www.youtube.com/embed/${m[1]}` };
  if ((m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/)))
    return { platform: 'instagram', src: `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed` };
  if (/facebook\.com\/.+\/videos\/|facebook\.com\/watch\/?\?|facebook\.com\/reel\/|fb\.watch\//.test(url))
    return { platform: 'facebook', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false` };
  return null;
}

/* =============== REDES SOCIAIS =============== */
/* redes que o painel oferece para "seguir" (além da opção de digitar uma rede própria) */
export const NETWORK_LABEL = {
  facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', x: 'X (Twitter)', tiktok: 'TikTok', whatsapp: 'WhatsApp',
  telegram: 'Telegram', linkedin: 'LinkedIn', threads: 'Threads', spotify: 'Spotify', email: 'E-mail', copiar: 'Copiar link',
};
export const FOLLOW_CATALOG = ['facebook', 'instagram', 'youtube', 'x', 'tiktok', 'whatsapp', 'telegram', 'linkedin', 'threads', 'spotify'];
/* botões de compartilhar que podem aparecer embaixo de cada notícia */
export const SHARE_OPTIONS = [['facebook', 'Facebook'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram (copia o link)'], ['x', 'X (Twitter)'], ['telegram', 'Telegram'], ['linkedin', 'LinkedIn'], ['email', 'E-mail'], ['copiar', 'Copiar link']];
export const DEFAULT_SHARE = ['facebook', 'whatsapp', 'instagram'];
export const networkName = (s) => s.name || NETWORK_LABEL[s.network] || s.network;
const SOCIAL_ICON = {
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.2-1.5 1.6-1.5h1.7V3.7C15.9 3.6 15 3.5 13.9 3.5c-2.7 0-4.4 1.6-4.4 4.6V10H6.8v3.1h2.7v8h4z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9.2v5.6l5-2.8z" fill="currentColor"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5A9.3 9.3 0 003.4 16l-1.1 5.5 5.6-1.5a9.3 9.3 0 004.1 1 9.3 9.3 0 100-18.5zm0 17a7.6 7.6 0 01-3.9-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A7.7 7.7 0 1112 19.5zm4.2-5.7c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.2 6.2 0 01-1.9-1.2 7 7 0 01-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.4.2-.4a.5.5 0 000-.4c0-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a1 1 0 00-.7.3 2.8 2.8 0 00-.9 2.1c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.7 4.3 3.7a6.9 6.9 0 001.4.5 3 3 0 001.4.1c.4-.1 1.4-.5 1.5-1.1s.2-1 .1-1.1-.2-.2-.4-.3z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h4.2l4.1 5.6L17.2 4H19l-5.9 6.8L20 20h-4.2l-4.4-6L6.2 20H4.5l6.3-7.2z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.3 2.2 1.7 3.8 3.9 4v2.9c-1.4 0-2.7-.4-3.9-1.2v6.2a6 6 0 11-5.2-6v3a3 3 0 103 3V3z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3.5L3 10.8l5.6 2 1.6 5.4 3-3.4 4.6 3.5z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 9h3v10H5zM6.5 4.5a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 3.6 2 3.6 4.5V19h-3v-5c0-1.2 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19h-3z"/></svg>`,
  threads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M16.2 9.4c-.6-2-2.2-3.1-4.4-3.1-3 0-4.8 2.2-4.8 5.7s1.8 5.7 4.9 5.7c2.4 0 4.2-1.2 4.2-3.3 0-1.9-1.6-2.8-3.6-2.8-1.6 0-2.8.7-2.8 1.9s1 1.8 2.1 1.8c1.7 0 2.6-1.5 2.6-3.7"/></svg>`,
  spotify: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7.5 9.6c3.1-.9 6.4-.6 9.1.9M8 12.6c2.5-.6 5-.4 7.4.9M8.6 15.4c2-.4 3.9-.2 5.8.7"/></svg>`,
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/></svg>`,
  copiar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>`,
};
const iconFor = (network) => SOCIAL_ICON[network] || SOCIAL_ICON.link;
/* botões de compartilhar embaixo de cada notícia/coluna: as redes vêm da escolha feita no painel */
function compartilharBotoes(redes = DEFAULT_SHARE) {
  const itens = SHARE_OPTIONS.filter(([k]) => redes.includes(k));
  if (!itens.length) return '';
  return `<div class="compartilhar" aria-label="Compartilhar esta notícia"><span>Compartilhar</span>
${itens.map(([k, nome]) => `<a href="#" class="share-btn" data-share="${k}" aria-label="${k === 'instagram' || k === 'copiar' ? 'Copiar o link para compartilhar' + (k === 'instagram' ? ' no Instagram' : '') : 'Compartilhar ' + (k === 'email' ? 'por e-mail' : 'no ' + nome)}" title="${esc(nome)}">${iconFor(k)}</a>`).join('\n')}
<span class="compartilhar-aviso" aria-live="polite"></span>
</div>`;
}
/* Um botão por rede com link preenchido; sem foto cadastrada, mostra o ícone da rede */
export function socialButtons(links) {
  const active = (links || []).filter((s) => s.url);
  if (!active.length) return '';
  return `<div class="social" aria-label="Redes sociais">${active.map((s) => `<a class="social-btn" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-rede="${esc(s.network)}">${s.photo ? `<img src="${esc(imgUrl(s.photo))}" alt="">` : `<span class="social-ico">${iconFor(s.network)}</span>`}<span>${esc(networkName(s))}</span></a>`).join('')}</div>`;
}
/* Só os ícones, discretos, para o cabeçalho — aparece em toda página */
export function socialIconsCompact(links) {
  const active = (links || []).filter((s) => s.url);
  if (!active.length) return '';
  return `<div class="social-topo" aria-label="Redes sociais">${active.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(networkName(s))}" title="${esc(networkName(s))}" data-rede="${esc(s.network)}">${s.photo ? `<img src="${esc(imgUrl(s.photo))}" alt="">` : iconFor(s.network)}</a>`).join('')}</div>`;
}
/* Faixa de destaque na home, logo abaixo da manchete */
export function socialBand(links) {
  if (!(links || []).some((s) => s.url)) return '';
  return `<section class="faixa-social"><div class="faixa-social-in"><div class="faixa-social-txt"><h2>Acompanhe o Portal do Pinhão</h2>${socialButtons(links)}</div><img class="faixa-mascote" src="/mascote-pinho.png" alt="" loading="lazy" width="220" height="275"></div></section>`;
}

/* =============== SITE PÚBLICO =============== */
export function siteLayout({ title, description = 'Seu portal de informação. Notícias de Curitiba e do Paraná.', body, cats, social = [], current = '', q = '', image = '', type = 'website' }) {
  const t = title ? `${esc(title)} | Portal do Pinhão` : 'Portal do Pinhão – Notícias de Curitiba e do Paraná';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title><meta name="description" content="${esc(description)}">
<meta property="og:title" content="${t}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<link rel="icon" href="/icone.svg" type="image/svg+xml">${FONTS}<link rel="stylesheet" href="/style.css"></head><body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="topo"><div class="topo-in"><a class="marca" href="/"><img src="/logo-claro.svg" alt="Portal do Pinhão – seu portal de informação"></a>
<div class="topo-dir"><span class="data">${esc(todayLabel())}</span>
<form class="busca" action="/busca" role="search"><label class="sr" for="q">Buscar notícias</label><input id="q" name="q" type="search" placeholder="Buscar notícias" value="${esc(q)}"><button type="submit">Buscar</button></form></div>${socialIconsCompact(social)}</div></header>
<div class="menu"><div class="menu-in"><nav aria-label="Editorias"><a href="/"${!current ? ' aria-current="page"' : ''}>Início</a>${cats.map((c) => `<a href="/categoria/${esc(c.slug)}"${current === c.slug ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('')}<a href="/colunistas"${current === 'colunistas' ? ' aria-current="page"' : ''}>Colunistas</a></nav></div></div>
<main id="conteudo" class="wrap">${body}</main>
<footer class="rodape"><div class="rodape-in"><img class="rodape-mascote" src="/mascote-pinho-peq.png" alt="" loading="lazy" width="48" height="60"><img src="/logo-escuro.svg" alt="Portal do Pinhão"><p>Notícias de Curitiba e do Paraná, todos os dias.</p>${socialButtons(social)}<p>© ${new Date().getFullYear()} Portal do Pinhão</p></div></footer>
<script src="/track.js" defer></script></body></html>`;
}

const foto = (a, alt = true) => a.image ? `<div class="foto"><img src="${esc(imgUrl(a.image))}" alt="${alt ? esc(a.title) : ''}" loading="lazy"></div>` : `<div class="foto" aria-hidden="true">PORTAL DO PINHÃO</div>`;
const link = (a) => `/noticia/${esc(a.slug)}`;

export function homeView({ lead, apoio, feed, page, pages, social = [], livros = [] }) {
  if (!lead) return `<p class="vazio">Ainda não há notícias publicadas.</p>`;
  return `<div class="destaque">
  <article class="lead">${foto(lead)}<a class="tag" href="/categoria/${esc(lead.cat_slug || '')}">${esc(lead.cat_name || '')}</a>
    <h2><a href="${link(lead)}">${esc(lead.title)}</a></h2><p class="res">${esc(excerptOf(lead))}</p></article>
  <aside class="apoio" aria-label="Outras notícias em destaque">${apoio.map((a) => `<article>${a.image ? foto(a, false) : ''}<a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a><h3><a href="${link(a)}">${esc(a.title)}</a></h3></article>`).join('')}</aside></div>
${socialBand(social)}
${feed.length ? `<section aria-labelledby="ult"><div class="secao"><h2 id="ult">Últimas notícias</h2></div><div class="feed">${feed.map(feedCard).join('')}</div>${pager(page, pages)}</section>` : ''}
${livrosVitrine(livros)}`;
}
/* vitrine de livros em destaque, selecionados na admin */
export function livrosVitrine(livros) {
  if (!livros.length) return '';
  return `<section aria-labelledby="livros-destaque"><div class="secao"><h2 id="livros-destaque">Livros dos nossos colunistas</h2></div>
<div class="livros-grade">${livros.map((b) => `<a class="livro-card" href="/colunistas/${esc(b.colunista_slug)}/livros/${esc(b.slug)}">
<div class="livro-capa">${b.cover ? `<img src="${esc(imgUrl(b.cover))}" alt="Capa de ${esc(b.title)}" loading="lazy">` : `<span aria-hidden="true">${esc(b.title.slice(0, 1))}</span>`}</div>
<h3>${esc(b.title)}</h3><p class="livro-autor">${esc(b.colunista_nome)}</p></a>`).join('')}</div></section>`;
}
/* card do feed: o card inteiro é um link para a notícia */
export const feedCard = (a) => `<a class="fcard" href="${link(a)}">
<div class="ftxt"><span class="tag">${esc(a.cat_name || '')}</span><h3>${esc(a.title)}</h3><p>${esc(excerptOf(a))}</p><time class="meta" datetime="${esc(a.published_at)}">${fmtRecent(a.published_at)}</time></div>
${a.image ? `<img class="fimg" src="${esc(imgUrl(a.image))}" alt="" loading="lazy">` : `<div class="fimg vazia" aria-hidden="true"></div>`}</a>`;
const pager = (page, pages, base = '/') => pages < 2 ? '' : `<nav class="pager" aria-label="Páginas">${page > 1 ? `<a href="${base}?pagina=${page - 1}">‹ Mais recentes</a>` : '<span></span>'}<span>Página ${page} de ${pages}</span>${page < pages ? `<a href="${base}?pagina=${page + 1}">Mais antigas ›</a>` : '<span></span>'}</nav>`;
export const cardHtml = (a) => `<article>${foto(a, false)}<a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a><h3><a href="${link(a)}">${esc(a.title)}</a></h3><p class="meta">${fmtRecent(a.published_at)}</p></article>`;

export function listView({ heading, items, note = '' }) {
  return `<div class="secao" style="margin-top:0;border-top:0"><h2>${esc(heading)}</h2></div>${note}
${items.length ? `<div class="cards">${items.map(cardHtml).join('')}</div>` : `<p class="vazio">Nenhuma notícia encontrada.</p>`}`;
}

export function articleView(a, related, redesShare = DEFAULT_SHARE) {
  const video = videoEmbed(a.video_url);
  return `<article class="materia"><a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a>
<h1>${esc(a.title)}</h1>${a.summary ? `<p class="linha-fina">${esc(a.summary)}</p>` : ''}
<p class="meta">${a.author ? `Por ${esc(a.author)} · ` : ''}<time datetime="${esc(a.published_at)}">${fmtFull(a.published_at)}</time></p>
${a.columnist_id ? `<a class="colunista-selo" href="/colunistas/${esc(a.columnist_slug)}">${a.columnist_photo ? `<img src="${esc(imgUrl(a.columnist_photo))}" alt="">` : ''}Coluna de ${esc(a.columnist_name)}</a>` : ''}
${a.image ? `<figure><img src="${esc(imgUrl(a.image))}" alt="${esc(a.title)}">${a.image_credit ? `<figcaption>${esc(a.image_credit)}</figcaption>` : ''}</figure>` : ''}
${video ? `<div class="video-embed video-${video.platform}"><iframe src="${esc(video.src)}" title="Vídeo da notícia" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
<div class="corpo">${a.body}</div>
${a.tags ? `<p class="tags">Assuntos: ${a.tags.split(',').map((t) => esc(t.trim())).filter(Boolean).join(', ')}</p>` : ''}
${compartilharBotoes(redesShare)}</article>
${related.length ? `<section><div class="secao"><h2>Leia também</h2></div><div class="cards">${related.map(cardHtml).join('')}</div></section>` : ''}`;
}

/* =============== COLUNISTAS =============== */
const colunistaFoto = (c) => c.photo ? `<img src="${esc(imgUrl(c.photo))}" alt="${esc(c.name)}" loading="lazy">` : `<span aria-hidden="true">${esc(c.name.slice(0, 1))}</span>`;

export function columnistsView(items) {
  return `<div class="secao" style="margin-top:0;border-top:0"><h2>Colunistas</h2></div>
${items.length ? `<div class="colunistas-grade">${items.map((c) => `<a class="colunista-card" href="/colunistas/${esc(c.slug)}"><span class="colunista-foto">${colunistaFoto(c)}</span><span class="colunista-nome">${esc(c.name)}</span>${c.tagline ? `<span class="colunista-tema">${esc(c.tagline)}</span>` : ''}</a>`).join('')}</div>` : `<p class="vazio">Nenhum colunista no momento.</p>`}`;
}

const colunistaSocial = (col) => {
  const active = ['facebook', 'instagram', 'youtube'].filter((n) => col[`${n}_url`]);
  if (!active.length) return '';
  return `<div class="social-topo colunista-social" aria-label="Redes sociais de ${esc(col.name)}">${active.map((n) => `<a href="${esc(col[`${n}_url`])}" target="_blank" rel="noopener noreferrer" aria-label="${esc(col.name)} no ${NETWORK_LABEL[n]}" data-rede="${n}">${SOCIAL_ICON[n]}</a>`).join('')}</div>`;
};

export function columnistView({ col, items, books = [], page, pages }) {
  return `<div class="colunista-perfil">
<span class="colunista-perfil-foto">${colunistaFoto(col)}</span>
<div><p class="tag">Coluna de</p><h1>${esc(col.name)}</h1>${col.tagline ? `<p class="linha-fina">${esc(col.tagline)}</p>` : ''}
${col.bio ? `<div class="colunista-bio">${col.bio.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
${col.email ? `<p class="meta"><a href="mailto:${esc(col.email)}">${esc(col.email)}</a></p>` : ''}
${colunistaSocial(col)}
${books.length ? `<div class="colunista-livros"><h3>Livros publicados</h3><ul>${books.map((b) => `<li><a href="/colunistas/${esc(col.slug)}/livros/${esc(b.slug)}">${esc(b.title)}</a></li>`).join('')}</ul></div>` : ''}</div></div>
${items.length ? `<div class="secao"><h2>Textos de ${esc(col.name)}</h2></div><div class="cards">${items.map(cardHtml).join('')}</div>${pager(page, pages, `/colunistas/${col.slug}`)}` : `<p class="vazio">Ainda não há textos publicados.</p>`}`;
}

export function bookView({ col, book }) {
  return `<article class="materia"><a class="tag" href="/colunistas/${esc(col.slug)}">Livro de ${esc(col.name)}</a>
<h1>${esc(book.title)}</h1>
${book.synopsis ? `<div class="corpo">${book.synopsis.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : `<p class="vazio">Sinopse não informada.</p>`}</article>`;
}

/* =============== PAINEL ADMIN =============== */
const NAV = [['/admin', 'Visão geral'], ['/admin/estatisticas', 'Estatísticas'], ['/admin/noticias/nova', 'Nova notícia'], ['/admin/noticias', 'Todas as notícias'], ['/admin/categorias', 'Categorias'], ['/admin/colunistas', 'Colunistas'], ['/admin/midia', 'Mídia'], ['/admin/redes', 'Redes sociais'], ['/admin/conta', 'Minha conta']];

export function adminLayout({ title, crumb, user, csrf, active, body, msg = '', erro = '', script = false }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} | Painel do Pinhão</title>${FONTS}<link rel="stylesheet" href="/admin.css"></head><body>
<div class="shell"><aside class="side"><a class="logo" href="/admin" aria-label="Painel"><img src="/logo-escuro.svg" alt="Portal do Pinhão"></a>
<nav style="display:flex;flex-direction:column" aria-label="Painel">${NAV.map(([h, l]) => `<a href="${h}"${active === h ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<a href="/" target="_blank" rel="noopener">Ver o site ↗</a></nav>
<div class="conta">Conta editorial<b>${esc(user.name)}</b>${esc(user.email)}<form method="post" action="/admin/sair"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="sair">Sair</button></form></div></aside>
<main><p class="crumb">${esc(crumb)}</p>${msg ? `<p class="msg" role="status">${esc(msg)}</p>` : ''}${erro ? `<p class="msg erro" role="alert">${erro}</p>` : ''}${body}</main></div>
<script src="/editor.js"></script></body></html>`;
}

export function loginView({ erro = '', email = '' }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Entrar | Painel do Pinhão</title>${FONTS}<link rel="stylesheet" href="/admin.css"></head>
<body><div class="login"><form method="post" action="/admin/entrar"><img src="/logo-claro.svg" alt="Portal do Pinhão"><h1>Entrar no painel</h1>
${erro ? `<p class="msg erro" role="alert" style="margin:10px 0 0">${esc(erro)}</p>` : ''}
<label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required autofocus value="${esc(email)}">
<label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="current-password" required>
<button class="btn pri" type="submit">Entrar</button><a href="/">← Voltar ao site</a></form></div></body></html>`;
}

const statusOf = (a) => (a.status === 'published' ? (toDate(a.published_at) > new Date() ? ['scheduled', 'Agendada'] : ['published', 'Publicada']) : ['draft', 'Rascunho']);
export const statusBadge = (a) => { const [c, l] = statusOf(a); return `<span class="st ${c}">${l}</span>`; };

export function dashboardView({ counts, recent, csrf }) {
  return `<div class="topo"><h1>Visão geral</h1><a class="btn pri" href="/admin/noticias/nova">Nova notícia</a></div>
<div class="kpis"><div><b>${counts.published}</b><span>Publicadas</span></div><div><b>${counts.draft}</b><span>Rascunhos</span></div><div><b>${counts.scheduled}</b><span>Agendadas</span></div><div><b>${counts.today}</b><span>Publicadas hoje</span></div></div>
<h2>Últimas alterações</h2>${articlesTable(recent, csrf)}`;
}

const PAGE_KIND_LABEL = { home: 'Início', article: 'Notícias', category: 'Categorias', search: 'Busca', columnist: 'Colunistas' };
const diaCurto = (s) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };

export function statsView({ stats, topArtigos, porDia, porPagina, conversoes, nomes = {} }) {
  const maxDia = Math.max(1, ...porDia.map((d) => d.c));
  const totalConversoes = conversoes.reduce((n, c) => n + c.c, 0);
  return `<div class="topo"><h1>Estatísticas</h1></div>
<div class="kpis">
<div><b>${stats.viewsHoje}</b><span>Visualizações hoje</span></div>
<div><b>${stats.viewsD7}</b><span>Visualizações (7 dias)</span></div>
<div><b>${stats.viewsD30}</b><span>Visualizações (30 dias)</span></div>
<div><b>${stats.visitantesD7}</b><span>Visitantes únicos (7 dias)</span></div>
</div>

<h2>Visualizações por dia (30 dias)</h2>
${porDia.length ? `<div class="grafico" role="img" aria-label="Gráfico de visualizações por dia">${porDia.map((d) => `<div class="barra-dia" style="height:${Math.max(3, Math.round(d.c / maxDia * 100))}%"><span class="barra-valor">${d.c}</span><span class="barra-rotulo">${diaCurto(d.dia)}</span></div>`).join('')}</div>` : `<p class="vazio">Ainda não há dados de visualização.</p>`}

<div class="duas" style="margin-top:28px">
<div>
<h2>Notícias mais lidas (7 dias)</h2>
${topArtigos.length ? `<table><thead><tr><th>Título</th><th>Categoria</th><th>Views</th></tr></thead><tbody>${topArtigos.map((a) => `<tr><td><a href="/admin/noticias/${a.id}"><b>${esc(a.title)}</b></a></td><td>${esc(a.cat_name || '—')}</td><td>${a.views}</td></tr>`).join('')}</tbody></table>` : `<p class="vazio">Ainda sem visualizações suficientes.</p>`}
</div>
<div>
<h2>Conversões: redes sociais (7 dias)</h2>
${conversoes.length ? `<table><thead><tr><th>Ação</th><th>Cliques</th></tr></thead><tbody>${conversoes.map((c) => `<tr><td>${c.type === 'share_click' ? 'Compartilhar' : 'Seguir'}: ${esc(nomes[c.meta] || NETWORK_LABEL[c.meta] || c.meta)}</td><td>${c.c}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${totalConversoes}</b></td></tr></tbody></table>` : `<p class="vazio">Nenhum clique em redes sociais registrado ainda.</p>`}

<h2 style="margin-top:24px">Visualizações por tipo de página (7 dias)</h2>
${porPagina.length ? `<table><thead><tr><th>Página</th><th>Views</th></tr></thead><tbody>${porPagina.map((p) => `<tr><td>${PAGE_KIND_LABEL[p.kind] || esc(p.kind)}</td><td>${p.c}</td></tr>`).join('')}</tbody></table>` : `<p class="vazio">Sem dados ainda.</p>`}
</div>
</div>`;
}

export function articlesTable(items, csrf) {
  if (!items.length) return `<p class="vazio">Nenhuma notícia por aqui. <a href="/admin/noticias/nova"><b>Escreva a primeira notícia</b></a>.</p>`;
  return `<table><thead><tr><th>Título</th><th>Categoria</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>${items.map((a) => `<tr>
<td><a href="/admin/noticias/${a.id}"><b>${esc(a.title)}</b></a>${a.featured ? ' <span class="st published">Manchete</span>' : ''}</td><td>${esc(a.cat_name || '—')}</td><td>${statusBadge(a)}</td>
<td>${fmtShort(a.published_at || a.updated_at)}</td><td class="acoes"><a class="btn peq" href="/admin/noticias/${a.id}">Editar</a>
<form method="post" action="/admin/noticias/${a.id}/apagar" data-confirm="Apagar &quot;${esc(a.title)}&quot;? Não dá para desfazer."><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn peq perigo">Apagar</button></form></td></tr>`).join('')}</tbody></table>`;
}

export function articlesListView({ items, filter, csrf }) {
  const f = [['todas', 'Todas'], ['published', 'Publicadas'], ['scheduled', 'Agendadas'], ['draft', 'Rascunhos']];
  return `<div class="topo"><h1>Todas as notícias</h1><a class="btn pri" href="/admin/noticias/nova">Nova notícia</a></div>
<div class="filtros">${f.map(([k, l]) => `<a href="/admin/noticias?status=${k}"${filter === k ? ' aria-current="true"' : ''}>${l}</a>`).join('')}</div>${articlesTable(items, csrf)}`;
}

export function articleForm({ a, cats, columnists, csrf, erros = [] }) {
  const isNew = !a.id;
  const agendada = a.status === 'published' && a.published_at && toDate(a.published_at) > new Date();
  return `<form method="post" enctype="multipart/form-data" action="${isNew ? '/admin/noticias' : `/admin/noticias/${a.id}`}" id="form-noticia" novalidate>
<input type="hidden" name="_csrf" value="${esc(csrf)}">
<div class="topo"><div><h1>${isNew ? 'Criar notícia' : 'Editar notícia'}</h1></div><span class="crumb">${isNew ? 'Rascunho não salvo' : statusBadge(a)}</span></div>
<div class="editor-layout"><section>
<label for="titulo">Título</label><input class="titulo" id="titulo" name="title" type="text" required value="${esc(a.title)}" placeholder="Escreva o título da notícia">
<label for="resumo">Resumo</label><input id="resumo" name="summary" type="text" maxlength="220" value="${esc(a.summary)}" placeholder="Uma frase curta para apresentar a notícia nos cards.">
<label for="texto">Texto da notícia</label>
<div class="barra" role="toolbar" aria-label="Formatação">
<div class="barra-grupo"><button type="button" data-cmd="undo" title="Desfazer (Ctrl+Z)">↺</button><button type="button" data-cmd="redo" title="Refazer (Ctrl+Y)">↻</button></div><span class="barra-sep"></span>
<div class="barra-grupo"><button type="button" data-cmd="formatBlock:p" title="Parágrafo normal">¶</button><button type="button" data-cmd="formatBlock:h2" title="Título">H2</button><button type="button" data-cmd="formatBlock:h3" title="Subtítulo">H3</button></div><span class="barra-sep"></span>
<div class="barra-grupo"><button type="button" data-cmd="bold" title="Negrito (Ctrl+B)"><b>B</b></button><button type="button" data-cmd="italic" title="Itálico (Ctrl+I)"><i>I</i></button><button type="button" data-cmd="underline" title="Sublinhado (Ctrl+U)"><u>S</u></button></div><span class="barra-sep"></span>
<div class="barra-grupo"><button type="button" data-cmd="justifyLeft" title="Alinhar à esquerda"><svg viewBox="0 0 18 14" fill="currentColor"><rect width="18" height="2"/><rect width="11" height="2" y="6"/><rect width="14" height="2" y="12"/></svg></button><button type="button" data-cmd="justifyCenter" title="Centralizar"><svg viewBox="0 0 18 14" fill="currentColor"><rect width="18" height="2"/><rect x="3.5" width="11" height="2" y="6"/><rect x="2" width="14" height="2" y="12"/></svg></button><button type="button" data-cmd="justifyRight" title="Alinhar à direita"><svg viewBox="0 0 18 14" fill="currentColor"><rect width="18" height="2"/><rect x="7" width="11" height="2" y="6"/><rect x="4" width="14" height="2" y="12"/></svg></button></div><span class="barra-sep"></span>
<div class="barra-grupo"><button type="button" data-cmd="insertUnorderedList" title="Lista com marcadores">• Lista</button><button type="button" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button><button type="button" data-cmd="formatBlock:blockquote" title="Citação">“ Cit.</button></div><span class="barra-sep"></span>
<div class="barra-grupo"><select data-sel="fonte" title="Tamanho da fonte" aria-label="Tamanho da fonte"><option value="14px">Fonte: Pequena</option><option value="17px" selected>Fonte: Normal</option><option value="22px">Fonte: Grande</option><option value="28px">Fonte: Destaque</option></select>
<select data-sel="espaco" title="Espaçamento entre linhas" aria-label="Espaçamento entre linhas"><option value="1">Espaço: Simples (1,0)</option><option value="1.5" selected>Espaço: ABNT (1,5)</option><option value="2">Espaço: Duplo (2,0)</option></select></div><span class="barra-sep"></span>
<div class="barra-grupo"><button type="button" data-cmd="imagem" title="Inserir imagem no texto">Imagem</button><button type="button" data-cmd="insertHorizontalRule" title="Linha divisória">— Linha</button><button type="button" data-cmd="link" title="Inserir link">Link</button><button type="button" data-cmd="removeFormat" title="Limpar formatação">Limpar</button></div>
</div>
<div id="texto" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto da notícia">${a.body || ''}</div>
<textarea name="body" id="body" hidden></textarea>
<p class="ajuda" id="contador-texto">0 palavras · 0 caracteres</p>
<p class="ajuda">Campos obrigatórios para publicar: título, categoria e texto. Para salvar um rascunho basta o título.</p>
<div class="acoes-form"><button class="btn" name="action" value="draft">Salvar rascunho</button><button class="btn pri" name="action" value="publish">Publicar notícia</button></div>
</section>
<aside class="lateral">
<div><h3>Publicação</h3><label for="cat">Categoria</label><select id="cat" name="category_id"><option value="">Escolha…</option>${cats.map((c) => `<option value="${c.id}"${String(a.category_id) === String(c.id) ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
<label for="colunista">Coluna (opcional)</label><select id="colunista" name="columnist_id"><option value="">Notícia comum (sem colunista)</option>${columnists.map((c) => `<option value="${c.id}"${String(a.columnist_id) === String(c.id) ? ' selected' : ''}>${esc(c.name)}${c.active ? '' : ' (inativo)'}</option>`).join('')}</select>
<label for="quando">Data</label><select id="quando" name="quando"><option value="now">Publicar agora</option><option value="schedule"${agendada ? ' selected' : ''}>Agendar…</option></select>
<div id="agenda" ${agendada ? '' : 'hidden'}><label for="quando_em">Publicar em (horário de Brasília)</label><input id="quando_em" name="quando_em" type="datetime-local" value="${agendada ? toLocalInput(a.published_at) : ''}"></div>
<label class="check"><input type="checkbox" name="featured" value="1"${a.featured ? ' checked' : ''}> Manchete da página inicial</label></div>
<div><h3>Imagem de capa</h3>${a.image ? `<div class="prev"><img src="${esc(imgUrl(a.image))}" alt="Imagem atual"><label class="check"><input type="checkbox" name="remove_image" value="1"> Remover imagem</label></div>` : ''}
<label for="img">${a.image ? 'Trocar imagem' : 'Enviar imagem'}</label><input id="img" name="image" type="file" accept="image/jpeg,image/png,image/webp"><p class="ajuda">JPG, PNG ou WEBP, até 5 MB. Ideal: proporção 16:9.</p>
<label for="cred">Crédito da foto</label><input id="cred" name="image_credit" type="text" value="${esc(a.image_credit)}" placeholder="Foto: nome"></div>
<div><h3>Vídeo (opcional)</h3><label for="video">Link do YouTube, Instagram ou Facebook</label><input id="video" name="video_url" type="url" value="${esc(a.video_url || '')}" placeholder="https://..."><p class="ajuda">Cole o link da página do vídeo. Ele aparece embutido na notícia publicada, acima do texto.</p></div>
<div><h3>Organização</h3><label for="tags">Tags</label><input id="tags" name="tags" type="text" value="${esc(a.tags)}" placeholder="curitiba, cultura"><label for="autor">Autor</label><input id="autor" name="author" type="text" value="${esc(a.author)}" placeholder="Redação do Portal"></div>
</aside></div></form>`;
}

export function categoriesView({ cats, csrf }) {
  const mover = (c, i) => `<form method="post" action="/admin/categorias/${c.id}/mover"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="direcao" value="cima"><button class="btn peq" ${i === 0 ? 'disabled' : ''} aria-label="Mover ${esc(c.name)} para cima" title="Mover para cima">↑</button></form>
<form method="post" action="/admin/categorias/${c.id}/mover"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="direcao" value="baixo"><button class="btn peq" ${i === cats.length - 1 ? 'disabled' : ''} aria-label="Mover ${esc(c.name)} para baixo" title="Mover para baixo">↓</button></form>`;
  return `<div class="topo"><h1>Categorias</h1></div><div class="duas"><div><table><thead><tr><th>Ordem</th><th>Nome</th><th>Notícias</th><th></th></tr></thead><tbody>${cats.map((c, i) => `<tr><td class="ordem">${mover(c, i)}</td><td><b>${esc(c.name)}</b></td><td>${c.total}</td><td class="acoes">
<form method="post" action="/admin/categorias/${c.id}/apagar" data-confirm="Apagar a categoria &quot;${esc(c.name)}&quot;?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn peq perigo"${c.total ? ' disabled title="Mova as notícias antes de apagar"' : ''}>Apagar</button></form></td></tr>`).join('')}</tbody></table>
<p class="ajuda">A ordem aqui é a mesma do menu do site.</p></div>
<form class="caixa" method="post" action="/admin/categorias"><input type="hidden" name="_csrf" value="${esc(csrf)}"><h2>Nova categoria</h2><label for="nome">Nome</label><input id="nome" name="name" type="text" required maxlength="40"><p class="ajuda">Aparece no fim do menu do site; use as setas para reordenar.</p><div class="acoes-form"><button class="btn pri">Criar categoria</button></div></form></div>`;
}

export function columnistsListView({ items, csrf }) {
  const mover = (c, i) => `<form method="post" action="/admin/colunistas/${c.id}/mover"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="direcao" value="cima"><button class="btn peq" ${i === 0 ? 'disabled' : ''} aria-label="Mover ${esc(c.name)} para cima" title="Mover para cima">↑</button></form>
<form method="post" action="/admin/colunistas/${c.id}/mover"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="direcao" value="baixo"><button class="btn peq" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Mover ${esc(c.name)} para baixo" title="Mover para baixo">↓</button></form>`;
  return `<div class="topo"><h1>Colunistas</h1><a class="btn pri" href="/admin/colunistas/novo">Novo colunista</a></div>
${items.length ? `<table><thead><tr><th>Ordem</th><th></th><th>Nome</th><th>Textos</th><th>Situação</th><th></th></tr></thead><tbody>${items.map((c, i) => `<tr><td class="ordem">${mover(c, i)}</td>
<td>${c.photo ? `<img src="${esc(imgUrl(c.photo))}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` : ''}</td>
<td><a href="/admin/colunistas/${c.id}"><b>${esc(c.name)}</b></a>${c.tagline ? `<br><span class="ajuda">${esc(c.tagline)}</span>` : ''}</td><td>${c.total}</td><td>${c.active ? '<span class="st published">Ativo</span>' : '<span class="st draft">Inativo</span>'}</td>
<td class="acoes"><a class="btn peq" href="/admin/colunistas/${c.id}">Editar</a>
<form method="post" action="/admin/colunistas/${c.id}/apagar" data-confirm="Apagar o colunista &quot;${esc(c.name)}&quot;?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn peq perigo"${c.total ? ' disabled title="Mova as notícias antes de apagar"' : ''}>Apagar</button></form></td></tr>`).join('')}</tbody></table>`
  : `<p class="vazio">Nenhum colunista cadastrado. <a href="/admin/colunistas/novo"><b>Cadastre o primeiro colunista</b></a>.</p>`}`;
}

export function columnistForm({ c, arts = [], books = [], csrf }) {
  const isNew = !c.id;
  return `<form method="post" enctype="multipart/form-data" action="${isNew ? '/admin/colunistas' : `/admin/colunistas/${c.id}`}">
<input type="hidden" name="_csrf" value="${esc(csrf)}">
<div class="topo"><h1>${isNew ? 'Novo colunista' : 'Editar colunista'}</h1></div>
<div class="duas"><div class="caixa">
<label for="nome" style="margin-top:0">Nome do colunista</label><input id="nome" name="name" type="text" required maxlength="80" value="${esc(c.name)}">
<label for="tema">Tema da coluna</label><input id="tema" name="tagline" type="text" maxlength="120" value="${esc(c.tagline || '')}" placeholder="Ex.: Crônicas do Dia a Dia">
<label for="email">E-mail (opcional)</label><input id="email" name="email" type="email" maxlength="120" value="${esc(c.email || '')}">
<label for="facebook_url">Facebook (opcional)</label><input id="facebook_url" name="facebook_url" type="url" maxlength="300" value="${esc(c.facebook_url || '')}" placeholder="https://facebook.com/…">
<label for="instagram_url">Instagram (opcional)</label><input id="instagram_url" name="instagram_url" type="url" maxlength="300" value="${esc(c.instagram_url || '')}" placeholder="https://instagram.com/…">
<label for="youtube_url">YouTube (opcional)</label><input id="youtube_url" name="youtube_url" type="url" maxlength="300" value="${esc(c.youtube_url || '')}" placeholder="https://youtube.com/…">
<label for="bio">Sobre o colunista</label><textarea id="bio" name="bio" rows="8" placeholder="Uma breve biografia ou referência sobre o colunista.">${esc(c.bio || '')}</textarea>
<label class="check"><input type="checkbox" name="active" value="1"${c.active ? ' checked' : ''}> Colunista ativo (aparece no site)</label>
<div class="acoes-form"><button class="btn pri">${isNew ? 'Criar colunista' : 'Salvar alterações'}</button></div>
</div>
<div class="caixa">
<h2 style="margin-top:0">Foto</h2>
${c.photo ? `<div class="prev"><img src="${esc(imgUrl(c.photo))}" alt="Foto atual"><label class="check"><input type="checkbox" name="remove_image" value="1"> Remover foto</label></div>` : ''}
<label for="img" style="margin-top:${c.photo ? '14px' : '0'}">${c.photo ? 'Trocar foto' : 'Enviar foto'}</label><input id="img" name="image" type="file" accept="image/jpeg,image/png,image/webp"><p class="ajuda">JPG, PNG ou WEBP, até 4 MB. Ideal: foto quadrada, rosto centralizado.</p>
</div></div></form>
${!isNew ? `<div class="caixa" style="margin-top:24px">
<h2 style="margin-top:0">Livros e artigos deste colunista</h2>
<div class="topo" style="border:0;margin:0 0 6px;padding:0"><h3 style="margin:0">Livros</h3><a class="btn peq" href="/admin/colunistas/${c.id}/livros/novo">Adicionar livro</a></div>
${books.length ? `<table><thead><tr><th></th><th>Título</th><th>Vitrine</th><th></th></tr></thead><tbody>${books.map((b) => `<tr><td>${b.cover ? `<img src="${esc(imgUrl(b.cover))}" alt="" style="width:32px;height:44px;object-fit:cover">` : ''}</td><td><a href="/admin/colunistas/${c.id}/livros/${b.id}"><b>${esc(b.title)}</b></a></td><td>${b.featured ? '<span class="st published">Em destaque</span>' : ''}</td><td class="acoes"><a class="btn peq" href="/admin/colunistas/${c.id}/livros/${b.id}">Editar</a>
<form method="post" action="/admin/colunistas/${c.id}/livros/${b.id}/apagar" data-confirm="Apagar o livro &quot;${esc(b.title)}&quot;?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn peq perigo">Apagar</button></form></td></tr>`).join('')}</tbody></table>` : `<p class="vazio">Nenhum livro cadastrado. Cada livro ganha uma página própria com a sinopse no site.</p>`}
<h3 style="margin:24px 0 6px">Artigos</h3>
${arts.length ? articlesTable(arts, csrf) : `<p class="vazio">Nenhuma notícia vinculada a este colunista ainda. <a href="/admin/noticias/nova"><b>Escreva uma notícia</b></a> e selecione este colunista.</p>`}
</div>` : ''}`;
}

export function bookForm({ col, b, csrf }) {
  const isNew = !b.id;
  return `<form method="post" enctype="multipart/form-data" action="${isNew ? `/admin/colunistas/${col.id}/livros` : `/admin/colunistas/${col.id}/livros/${b.id}`}">
<input type="hidden" name="_csrf" value="${esc(csrf)}">
<div class="topo"><h1>${isNew ? 'Novo livro' : 'Editar livro'}</h1><span class="crumb">${esc(col.name)}</span></div>
<div class="duas">
<div class="caixa">
<label for="titulo" style="margin-top:0">Título do livro</label><input id="titulo" name="title" type="text" required maxlength="160" value="${esc(b.title)}">
<label for="sinopse">Sinopse</label><textarea id="sinopse" name="synopsis" rows="10" placeholder="Um resumo do livro para os leitores do site.">${esc(b.synopsis || '')}</textarea>
<p class="ajuda">O livro ganha uma página própria em /colunistas/${esc(col.slug)}/livros/… com esse título e a sinopse.</p>
<label class="check"><input type="checkbox" name="featured" value="1"${b.featured ? ' checked' : ''}> Destacar na vitrine de livros da home</label>
<div class="acoes-form"><button class="btn pri">${isNew ? 'Criar livro' : 'Salvar alterações'}</button></div>
</div>
<div class="caixa">
<h2 style="margin-top:0">Capa</h2>
${b.cover ? `<div class="prev"><img src="${esc(imgUrl(b.cover))}" alt="Capa atual"><label class="check"><input type="checkbox" name="remove_image" value="1"> Remover capa</label></div>` : ''}
<label for="capa" style="margin-top:${b.cover ? '14px' : '0'}">${b.cover ? 'Trocar capa' : 'Enviar capa'}</label><input id="capa" name="image" type="file" accept="image/jpeg,image/png,image/webp"><p class="ajuda">JPG, PNG ou WEBP, até 4 MB. Ideal: proporção de capa de livro (2:3).</p>
</div>
</div></form>
${!isNew ? `<form method="post" action="/admin/colunistas/${col.id}/livros/${b.id}/apagar" data-confirm="Apagar o livro &quot;${esc(b.title)}&quot;?" style="margin-top:14px"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn perigo">Apagar livro</button></form>` : ''}`;
}

export function mediaView({ files, csrf }) {
  return `<div class="topo"><h1>Mídia</h1></div>
<form class="caixa" method="post" enctype="multipart/form-data" action="/admin/midia" style="margin-bottom:20px"><input type="hidden" name="_csrf" value="${esc(csrf)}"><label for="arq" style="margin-top:0">Enviar imagem</label><input id="arq" name="image" type="file" accept="image/jpeg,image/png,image/webp" required><p class="ajuda">JPG, PNG ou WEBP, até 5 MB.</p><div class="acoes-form" style="justify-content:flex-start"><button class="btn pri">Enviar</button></div></form>
${files.length ? `<div class="grade">${files.map((f) => `<figure><img src="${esc(imgUrl(f.name))}" alt="" loading="lazy"><code>${esc(f.name)}</code>${f.used ? '<p class="ajuda">Em uso em uma notícia</p>' : `<form method="post" action="/admin/midia/apagar" data-confirm="Apagar esta imagem?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="name" value="${esc(f.name)}"><button class="btn peq perigo" style="margin-top:6px">Apagar</button></form>`}</figure>`).join('')}</div>` : `<p class="vazio">Nenhuma imagem enviada ainda.</p>`}`;
}

export function socialView({ links, shareSel = DEFAULT_SHARE, csrf }) {
  const livres = FOLLOW_CATALOG.filter((k) => !links.some((l) => l.network === k));
  const card = (s) => {
    const k = esc(s.network);
    const custom = !NETWORK_LABEL[s.network];
    return `<div class="caixa">
<h3 style="margin-top:0">${custom ? 'Rede personalizada' : esc(NETWORK_LABEL[s.network])}</h3>
<label for="${k}_url" style="margin-top:0">Link da página</label><input id="${k}_url" name="${k}_url" type="url" value="${esc(s.url)}" placeholder="https://…">
<label for="${k}_name">Nome exibido${custom ? '' : ' (opcional)'}</label><input id="${k}_name" name="${k}_name" type="text" maxlength="60" value="${esc(s.name)}" placeholder="${esc(custom ? 'Nome da rede' : NETWORK_LABEL[s.network])}">
${s.photo ? `<label style="margin-top:14px">Foto atual</label><div class="prev"><img src="${esc(imgUrl(s.photo))}" alt="Foto atual"><label class="check"><input type="checkbox" name="${k}_remove" value="1"> Remover foto</label></div>` : ''}
<label for="${k}_photo">${s.photo ? 'Trocar foto' : 'Foto de perfil (opcional)'}</label><input id="${k}_photo" name="${k}_photo" type="file" accept="image/jpeg,image/png,image/webp"><p class="ajuda">JPG, PNG ou WEBP, até 4 MB. Ideal: imagem quadrada.</p>
<label class="check" style="margin-top:16px"><input type="checkbox" name="${k}_delete" value="1"> Remover esta rede ao salvar</label>
</div>`;
  };
  return `<div class="topo"><h1>Redes sociais</h1></div>
<p class="ajuda" style="margin:-8px 0 18px 0">Adicione quantas redes quiser. Cada rede mostra o ícone dela (ou a foto de perfil, se você enviar uma). Deixe o link em branco para a rede não aparecer no site.</p>
<form method="post" enctype="multipart/form-data" action="/admin/redes"><input type="hidden" name="_csrf" value="${esc(csrf)}">
<h2>Redes que aparecem no site</h2>
${links.length ? `<div class="redes">${links.map(card).join('')}</div>` : `<p class="vazio" style="margin-bottom:20px">Nenhuma rede cadastrada. Use o quadro abaixo para adicionar a primeira.</p>`}

<div class="caixa" style="margin-bottom:24px;max-width:560px">
<h3 style="margin-top:0">Adicionar outra rede</h3>
<label for="nova_rede" style="margin-top:0">Qual rede?</label>
<select id="nova_rede" name="nova_rede"><option value="">Escolha…</option>${livres.map((k) => `<option value="${k}">${esc(NETWORK_LABEL[k])}</option>`).join('')}<option value="outra">Outra rede (digitar o nome)</option></select>
<div id="nova-nome" hidden><label for="nova_name">Nome da rede</label><input id="nova_name" name="nova_name" type="text" maxlength="60" placeholder="Ex.: Kwai, Pinterest, Canal do WhatsApp"></div>
<label for="nova_url">Link da página</label><input id="nova_url" name="nova_url" type="url" placeholder="https://…">
<label for="nova_photo">Foto de perfil (opcional)</label><input id="nova_photo" name="nova_photo" type="file" accept="image/jpeg,image/png,image/webp">
<p class="ajuda">A nova rede só é adicionada se você escolher a rede e preencher o link. Depois é só salvar.</p>
</div>

<h2>Botões de compartilhar nas notícias</h2>
<div class="caixa" style="max-width:560px"><p class="ajuda" style="margin:0 0 6px">Marque as redes que aparecem embaixo de cada notícia e coluna. Instagram e “Copiar link” copiam o endereço da matéria, porque o Instagram não aceita compartilhar por link.</p>
${SHARE_OPTIONS.map(([k, nome]) => `<label class="check"><input type="checkbox" name="share_${k}" value="1"${shareSel.includes(k) ? ' checked' : ''}> ${esc(nome)}</label>`).join('')}
</div>
<div class="acoes-form"><button class="btn pri">Salvar redes sociais</button></div></form>`;
}

export function accountView({ user, csrf }) {
  return `<div class="topo"><h1>Minha conta</h1></div><form class="caixa" style="max-width:460px" method="post" action="/admin/conta"><input type="hidden" name="_csrf" value="${esc(csrf)}">
<label for="nome" style="margin-top:0">Nome exibido</label><input id="nome" name="name" type="text" required value="${esc(user.name)}">
<label for="atual">Senha atual</label><input id="atual" name="atual" type="password" autocomplete="current-password" required>
<label for="nova">Nova senha (deixe em branco para manter)</label><input id="nova" name="nova" type="password" autocomplete="new-password" minlength="10"><p class="ajuda">Mínimo de 10 caracteres.</p>
<div class="acoes-form"><button class="btn pri">Salvar alterações</button></div></form>`;
}
