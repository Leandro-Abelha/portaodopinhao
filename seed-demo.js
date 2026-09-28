/* Cria notícias de exemplo para demonstração local. Roda uma vez, usa o DATABASE_URL do .env.
   Uso: node --env-file=.env seed-demo.js */
import { all, one, run, setup, slugify, uniqueSlug } from './db.js';

await setup(); // garante categorias e o usuário admin (se ADMIN_EMAIL/ADMIN_PASSWORD estiverem no .env)

if (Number((await one('SELECT COUNT(*) c FROM articles')).c) > 0) {
  console.log('Já existem notícias no banco — nada foi criado.');
  process.exit(0);
}

const cat = async (nome) => (await one('SELECT id FROM categories WHERE name = ?', [nome]))?.id;
const demo = [
  ['Obra amplia mobilidade e muda a rotina de bairros da capital', 'Entenda os impactos, os prazos e as alternativas para o trânsito.', 'Curitiba', 1],
  ['Estado anuncia agenda de investimentos para a região', 'Programa prevê obras e serviços em cidades paranaenses.', 'Paraná', 0],
  ['Decisões que afetam moradores e cidades paranaenses', 'O que muda para quem vive no estado.', 'Política', 0],
  ['Serviços públicos têm novas regras nesta semana', 'Veja o que mudou nos atendimentos.', 'Curitiba', 0],
  ['Agenda cultural ocupa o centro de Curitiba', 'Programação tem atrações gratuitas.', 'Curitiba', 0],
  ['Região Metropolitana recebe melhorias de mobilidade', 'Novas linhas e ajustes de itinerário.', 'Paraná', 0],
];
for (const [i, [title, summary, catName, featured]] of demo.entries()) {
  const when = new Date(Date.now() - i * 3600e3 * 2).toISOString();
  await run(
    `INSERT INTO articles (title, slug, summary, body, category_id, author, status, featured, published_at)
     VALUES (?,?,?,?,?,?, 'published', ?, ?)`,
    [title, await uniqueSlug(title), summary, `<p>${summary}</p><p>Esta é uma notícia de demonstração. Apague ou edite pelo painel em /admin.</p>`, await cat(catName), 'Redação do Portal', featured, when]
  );
}
console.log('6 notícias de demonstração criadas.');
process.exit(0);
