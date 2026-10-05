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
export async function uniqueColumnistSlug(name, ignoreId = 0) {
  const base = slugify(name);
  let slug = base, n = 2;
  while (await one('SELECT id FROM columnists WHERE slug = ? AND id != ?', [slug, ignoreId])) slug = `${base}-${n++}`;
  return slug;
}
export async function uniqueBookSlug(columnistId, title, ignoreId = 0) {
  const base = slugify(title);
  let slug = base, n = 2;
  while (await one('SELECT id FROM columnist_books WHERE columnist_id = ? AND slug = ? AND id != ?', [columnistId, slug, ignoreId])) slug = `${base}-${n++}`;
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

  await run(`CREATE TABLE IF NOT EXISTS social_links (
    network text PRIMARY KEY CHECK (network IN ('facebook','instagram','youtube')),
    url text DEFAULT '', name text DEFAULT '', photo text, updated_at timestamptz DEFAULT now()
  )`);
  /* a lista de redes deixou de ser fixa: remove a trava e passa a ter ordem própria */
  await run(`ALTER TABLE social_links DROP CONSTRAINT IF EXISTS social_links_network_check`);
  await run(`ALTER TABLE social_links ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0`);
  await run(`CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL DEFAULT '')`);
  /* as três redes iniciais entram uma única vez, para não reaparecerem depois de removidas */
  if (!(await one(`SELECT 1 x FROM settings WHERE key = 'social_seeded'`))) {
    for (const [i, n] of ['facebook', 'instagram', 'youtube'].entries())
      await run('INSERT INTO social_links (network, position) VALUES (?,?) ON CONFLICT (network) DO UPDATE SET position = CASE WHEN social_links.position = 0 THEN EXCLUDED.position ELSE social_links.position END', [n, i + 1]);
    await run(`INSERT INTO settings (key, value) VALUES ('social_seeded', '1') ON CONFLICT DO NOTHING`);
  }
  await run(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS video_url text DEFAULT ''`);

  await run(`CREATE TABLE IF NOT EXISTS columnists (
    id serial PRIMARY KEY, name text NOT NULL, slug text UNIQUE NOT NULL, photo text,
    tagline text DEFAULT '', email text DEFAULT '', bio text DEFAULT '',
    position int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz DEFAULT now()
  )`);
  await run(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS columnist_id integer REFERENCES columnists(id) ON DELETE SET NULL`);
  await run(`ALTER TABLE columnists ADD COLUMN IF NOT EXISTS books text DEFAULT ''`);
  await run(`ALTER TABLE columnists ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT ''`);
  await run(`ALTER TABLE columnists ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT ''`);
  await run(`ALTER TABLE columnists ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT ''`);
  await run(`CREATE TABLE IF NOT EXISTS columnist_books (
    id serial PRIMARY KEY, columnist_id integer NOT NULL REFERENCES columnists(id) ON DELETE CASCADE,
    title text NOT NULL, slug text NOT NULL, synopsis text DEFAULT '', position int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(), UNIQUE (columnist_id, slug)
  )`);
  await run(`ALTER TABLE columnist_books ADD COLUMN IF NOT EXISTS cover text`);
  await run(`ALTER TABLE columnist_books ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false`);

  await run(`CREATE TABLE IF NOT EXISTS pageviews (
    id bigserial PRIMARY KEY, path text NOT NULL, kind text NOT NULL,
    article_id integer REFERENCES articles(id) ON DELETE SET NULL,
    visitor_hash text NOT NULL, created_at timestamptz DEFAULT now()
  )`);
  await run(`CREATE INDEX IF NOT EXISTS pageviews_created_idx ON pageviews (created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS pageviews_article_idx ON pageviews (article_id)`);
  await run(`CREATE TABLE IF NOT EXISTS events (
    id bigserial PRIMARY KEY, type text NOT NULL, meta text, visitor_hash text, created_at timestamptz DEFAULT now()
  )`);
  await run(`CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at)`);
})().catch((e) => { ready = undefined; throw e; }));
