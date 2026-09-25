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

/* =============== SITE PÚBLICO =============== */
export function siteLayout({ title, description = 'Seu portal de informação. Notícias de Curitiba e do Paraná.', body, cats, current = '', q = '', image = '', type = 'website' }) {
  const t = title ? `${esc(title)} | Portal do Pinhão` : 'Portal do Pinhão – Notícias de Curitiba e do Paraná';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title><meta name="description" content="${esc(description)}">
<meta property="og:title" content="${t}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<link rel="icon" href="/icone.svg" type="image/svg+xml">${FONTS}<link rel="stylesheet" href="/style.css"></head><body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="topo"><div class="topo-in"><a class="marca" href="/"><img src="/logo-claro.svg" alt="Portal do Pinhão – seu portal de informação"></a>
<div class="topo-dir"><span class="data">${esc(todayLabel())}</span>
<form class="busca" action="/busca" role="search"><label class="sr" for="q">Buscar notícias</label><input id="q" name="q" type="search" placeholder="Buscar notícias" value="${esc(q)}"><button type="submit">Buscar</button></form></div></div></header>
<div class="menu"><div class="menu-in"><nav aria-label="Editorias"><a href="/"${!current ? ' aria-current="page"' : ''}>Início</a>${cats.map((c) => `<a href="/categoria/${esc(c.slug)}"${current === c.slug ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('')}</nav></div></div>
<main id="conteudo" class="wrap">${body}</main>
<footer class="rodape"><div class="rodape-in"><img src="/logo-escuro.svg" alt="Portal do Pinhão"><p>Notícias de Curitiba e do Paraná, todos os dias.</p><p>© ${new Date().getFullYear()} Portal do Pinhão</p></div></footer>
</body></html>`;
}

const foto = (a, alt = true) => a.image ? `<div class="foto"><img src="${esc(imgUrl(a.image))}" alt="${alt ? esc(a.title) : ''}" loading="lazy"></div>` : `<div class="foto" aria-hidden="true">PORTAL DO PINHÃO</div>`;
const link = (a) => `/noticia/${esc(a.slug)}`;

export function homeView({ lead, apoio, feed, page, pages }) {
  if (!lead) return `<p class="vazio">Ainda não há notícias publicadas.</p>`;
  return `<div class="destaque">
  <article class="lead">${foto(lead)}<a class="tag" href="/categoria/${esc(lead.cat_slug || '')}">${esc(lead.cat_name || '')}</a>
    <h2><a href="${link(lead)}">${esc(lead.title)}</a></h2><p class="res">${esc(excerptOf(lead))}</p></article>
  <aside class="apoio" aria-label="Outras notícias em destaque">${apoio.map((a) => `<article>${a.image ? foto(a, false) : ''}<a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a><h3><a href="${link(a)}">${esc(a.title)}</a></h3></article>`).join('')}</aside></div>
${feed.length ? `<section aria-labelledby="ult"><div class="secao"><h2 id="ult">Últimas notícias</h2></div><div class="feed">${feed.map(feedCard).join('')}</div>${pager(page, pages)}</section>` : ''}`;
}
/* card do feed: o card inteiro é um link para a notícia */
export const feedCard = (a) => `<a class="fcard" href="${link(a)}">
<div class="ftxt"><span class="tag">${esc(a.cat_name || '')}</span><h3>${esc(a.title)}</h3><p>${esc(excerptOf(a))}</p><time class="meta" datetime="${esc(a.published_at)}">${fmtRecent(a.published_at)}</time></div>
${a.image ? `<img class="fimg" src="${esc(imgUrl(a.image))}" alt="" loading="lazy">` : `<div class="fimg vazia" aria-hidden="true"></div>`}</a>`;
const pager = (page, pages) => pages < 2 ? '' : `<nav class="pager" aria-label="Páginas">${page > 1 ? `<a href="/?pagina=${page - 1}">‹ Mais recentes</a>` : '<span></span>'}<span>Página ${page} de ${pages}</span>${page < pages ? `<a href="/?pagina=${page + 1}">Mais antigas ›</a>` : '<span></span>'}</nav>`;
export const cardHtml = (a) => `<article>${foto(a, false)}<a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a><h3><a href="${link(a)}">${esc(a.title)}</a></h3><p class="meta">${fmtRecent(a.published_at)}</p></article>`;

export function listView({ heading, items, note = '' }) {
  return `<div class="secao" style="margin-top:0;border-top:0"><h2>${esc(heading)}</h2></div>${note}
${items.length ? `<div class="cards">${items.map(cardHtml).join('')}</div>` : `<p class="vazio">Nenhuma notícia encontrada.</p>`}`;
}

export function articleView(a, related) {
  return `<article class="materia"><a class="tag" href="/categoria/${esc(a.cat_slug || '')}">${esc(a.cat_name || '')}</a>
<h1>${esc(a.title)}</h1>${a.summary ? `<p class="linha-fina">${esc(a.summary)}</p>` : ''}
<p class="meta">${a.author ? `Por ${esc(a.author)} · ` : ''}<time datetime="${esc(a.published_at)}">${fmtFull(a.published_at)}</time></p>
${a.image ? `<figure><img src="${esc(imgUrl(a.image))}" alt="${esc(a.title)}">${a.image_credit ? `<figcaption>${esc(a.image_credit)}</figcaption>` : ''}</figure>` : ''}
<div class="corpo">${a.body}</div>
${a.tags ? `<p class="tags">Assuntos: ${a.tags.split(',').map((t) => esc(t.trim())).filter(Boolean).join(', ')}</p>` : ''}</article>
${related.length ? `<section><div class="secao"><h2>Leia também</h2></div><div class="cards">${related.map(cardHtml).join('')}</div></section>` : ''}`;
}

/* =============== PAINEL ADMIN =============== */
const NAV = [['/admin', 'Visão geral'], ['/admin/noticias/nova', 'Nova notícia'], ['/admin/noticias', 'Todas as notícias'], ['/admin/categorias', 'Categorias'], ['/admin/midia', 'Mídia'], ['/admin/conta', 'Minha conta']];

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

export function articleForm({ a, cats, csrf, erros = [] }) {
  const isNew = !a.id;
  const agendada = a.status === 'published' && a.published_at && toDate(a.published_at) > new Date();
  return `<form method="post" enctype="multipart/form-data" action="${isNew ? '/admin/noticias' : `/admin/noticias/${a.id}`}" id="form-noticia" novalidate>
<input type="hidden" name="_csrf" value="${esc(csrf)}">
<div class="topo"><div><h1>${isNew ? 'Criar notícia' : 'Editar notícia'}</h1></div><span class="crumb">${isNew ? 'Rascunho não salvo' : statusBadge(a)}</span></div>
<div class="editor-layout"><section>
<label for="titulo">Título</label><input class="titulo" id="titulo" name="title" type="text" required value="${esc(a.title)}" placeholder="Escreva o título da notícia">
<label for="resumo">Resumo</label><input id="resumo" name="summary" type="text" maxlength="220" value="${esc(a.summary)}" placeholder="Uma frase curta para apresentar a notícia nos cards.">
<label for="texto">Texto da notícia</label>
<div class="barra" role="toolbar" aria-label="Formatação"><button type="button" data-cmd="bold" title="Negrito"><b>B</b></button><button type="button" data-cmd="italic" title="Itálico"><i>I</i></button><button type="button" data-cmd="formatBlock:h2" title="Intertítulo">Título</button><button type="button" data-cmd="insertUnorderedList" title="Lista">• Lista</button><button type="button" data-cmd="formatBlock:blockquote" title="Citação">“ Citação</button><button type="button" data-cmd="link" title="Link">Link</button><button type="button" data-cmd="removeFormat" title="Limpar formatação">Limpar</button></div>
<div id="texto" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto da notícia">${a.body || ''}</div>
<textarea name="body" id="body" hidden></textarea>
<p class="ajuda">Campos obrigatórios para publicar: título, categoria e texto. Para salvar um rascunho basta o título.</p>
<div class="acoes-form"><button class="btn" name="action" value="draft">Salvar rascunho</button><button class="btn pri" name="action" value="publish">Publicar notícia</button></div>
</section>
<aside class="lateral">
<div><h3>Publicação</h3><label for="cat">Categoria</label><select id="cat" name="category_id"><option value="">Escolha…</option>${cats.map((c) => `<option value="${c.id}"${String(a.category_id) === String(c.id) ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
<label for="quando">Data</label><select id="quando" name="quando"><option value="now">Publicar agora</option><option value="schedule"${agendada ? ' selected' : ''}>Agendar…</option></select>
<div id="agenda" ${agendada ? '' : 'hidden'}><label for="quando_em">Publicar em (horário de Brasília)</label><input id="quando_em" name="quando_em" type="datetime-local" value="${agendada ? toLocalInput(a.published_at) : ''}"></div>
<label class="check"><input type="checkbox" name="featured" value="1"${a.featured ? ' checked' : ''}> Manchete da página inicial</label></div>
<div><h3>Imagem de capa</h3>${a.image ? `<div class="prev"><img src="${esc(imgUrl(a.image))}" alt="Imagem atual"><label class="check"><input type="checkbox" name="remove_image" value="1"> Remover imagem</label></div>` : ''}
<label for="img">${a.image ? 'Trocar imagem' : 'Enviar imagem'}</label><input id="img" name="image" type="file" accept="image/jpeg,image/png,image/webp"><p class="ajuda">JPG, PNG ou WEBP, até 5 MB. Ideal: proporção 16:9.</p>
<label for="cred">Crédito da foto</label><input id="cred" name="image_credit" type="text" value="${esc(a.image_credit)}" placeholder="Foto: nome"></div>
<div><h3>Organização</h3><label for="tags">Tags</label><input id="tags" name="tags" type="text" value="${esc(a.tags)}" placeholder="curitiba, cultura"><label for="autor">Autor</label><input id="autor" name="author" type="text" value="${esc(a.author)}" placeholder="Redação do Portal"></div>
</aside></div></form>`;
}

export function categoriesView({ cats, csrf }) {
  return `<div class="topo"><h1>Categorias</h1></div><div class="duas"><div><table><thead><tr><th>Nome</th><th>Notícias</th><th></th></tr></thead><tbody>${cats.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${c.total}</td><td class="acoes">
<form method="post" action="/admin/categorias/${c.id}/apagar" data-confirm="Apagar a categoria &quot;${esc(c.name)}&quot;?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn peq perigo"${c.total ? ' disabled title="Mova as notícias antes de apagar"' : ''}>Apagar</button></form></td></tr>`).join('')}</tbody></table></div>
<form class="caixa" method="post" action="/admin/categorias"><input type="hidden" name="_csrf" value="${esc(csrf)}"><h2>Nova categoria</h2><label for="nome">Nome</label><input id="nome" name="name" type="text" required maxlength="40"><p class="ajuda">Aparece no menu do site, na ordem de criação.</p><div class="acoes-form"><button class="btn pri">Criar categoria</button></div></form></div>`;
}

export function mediaView({ files, csrf }) {
  return `<div class="topo"><h1>Mídia</h1></div>
<form class="caixa" method="post" enctype="multipart/form-data" action="/admin/midia" style="margin-bottom:20px"><input type="hidden" name="_csrf" value="${esc(csrf)}"><label for="arq" style="margin-top:0">Enviar imagem</label><input id="arq" name="image" type="file" accept="image/jpeg,image/png,image/webp" required><p class="ajuda">JPG, PNG ou WEBP, até 5 MB.</p><div class="acoes-form" style="justify-content:flex-start"><button class="btn pri">Enviar</button></div></form>
${files.length ? `<div class="grade">${files.map((f) => `<figure><img src="${esc(imgUrl(f.name))}" alt="" loading="lazy"><code>${esc(f.name)}</code>${f.used ? '<p class="ajuda">Em uso em uma notícia</p>' : `<form method="post" action="/admin/midia/apagar" data-confirm="Apagar esta imagem?"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="name" value="${esc(f.name)}"><button class="btn peq perigo" style="margin-top:6px">Apagar</button></form>`}</figure>`).join('')}</div>` : `<p class="vazio">Nenhuma imagem enviada ainda.</p>`}`;
}

export function accountView({ user, csrf }) {
  return `<div class="topo"><h1>Minha conta</h1></div><form class="caixa" style="max-width:460px" method="post" action="/admin/conta"><input type="hidden" name="_csrf" value="${esc(csrf)}">
<label for="nome" style="margin-top:0">Nome exibido</label><input id="nome" name="name" type="text" required value="${esc(user.name)}">
<label for="atual">Senha atual</label><input id="atual" name="atual" type="password" autocomplete="current-password" required>
<label for="nova">Nova senha (deixe em branco para manter)</label><input id="nova" name="nova" type="password" autocomplete="new-password" minlength="10"><p class="ajuda">Mínimo de 10 caracteres.</p>
<div class="acoes-form"><button class="btn pri">Salvar alterações</button></div></form>`;
}
