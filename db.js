import pg from 'pg';
import crypto from 'node:crypto';

/* timestamptz chega como texto ISO, que as views já sabem formatar */
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());

const url = process.env.DATABASE_URL;
if (!url) console.error('Falta a variável DATABASE_URL (veja o README).');
const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 1 : 5, // função serverless: uma conexão por instância
  idleTimeoutMillis: 10000,
});

/* Escreva o SQL com "?" nos parâmetros; aqui vira $1, $2… */
const num = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
export const all = async (sql, params = []) => (await pool.query(num(sql), params)).rows;
export const one = async (sql, params = []) => (await all(sql, params))[0];
export const run = (sql, params = []) => pool.query(num(sql), params);

/* ---------- senhas ---------- */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
export function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

/* ---------- utilidades ---------- */
export function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'noticia';
}
export async function uniqueSlug(title, ignoreId = 0) {
  const base = slugify(title);
  let slug = base, n = 2;
  while (await one('SELECT id FROM articles WHERE slug = ? AND id != ?', [slug, ignoreId])) slug = `${base}-${n++}`;
  return slug;
}

/* Notícia visível ao público: publicada e com data já atingida (permite agendar) */
export const LIVE = `a.status = 'published' AND a.published_at <= now()`;

/* ---------- dados iniciais (roda uma vez por instância) ---------- */
let ready;
export const setup = () => (ready ??= (async () => {
  if (!Number((await one('SELECT COUNT(*) c FROM categories')).c)) {
    for (const [i, n] of ['Curitiba', 'Paraná', 'Política', 'Brasil', 'Esportes'].entries())
      await run('INSERT INTO categories (name, slug, position) VALUES (?,?,?) ON CONFLICT DO NOTHING', [n, slugify(n), i]);
  }
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD && !Number((await one('SELECT COUNT(*) c FROM users')).c))
    await run('INSERT INTO users (email, name, password_hash) VALUES (?,?,?) ON CONFLICT DO NOTHING',
      [ADMIN_EMAIL.toLowerCase(), 'Redação Portal do Pinhão', hashPassword(ADMIN_PASSWORD)]);
})().catch((e) => { ready = undefined; throw e; }));
