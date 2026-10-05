/* Painel: editor de texto, agendamento e confirmações */
const $ = (s, r = document) => r.querySelector(s);

document.addEventListener('submit', (e) => {
  const q = e.target.dataset && e.target.dataset.confirm;
  if (q && !confirm(q)) e.preventDefault();
});

const texto = $('#texto');
if (texto) {
  document.execCommand('defaultParagraphSeparator', false, 'p'); // Enter cria <p>, não <div>
  const form = $('#form-noticia');
  const botoes = document.querySelectorAll('.barra [data-cmd]');
  const ESTADOS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
  const atualizarEstado = () => botoes.forEach((b) => {
    const [cmd] = b.dataset.cmd.split(':');
    if (ESTADOS.includes(cmd)) { try { b.classList.toggle('ativo', document.queryCommandState(cmd)); } catch (e) {} }
  });

  /* tamanho da fonte: aplica <span style="font-size:…"> na seleção, via truque do <font size=7> */
  function aplicarFonte(tamanho) {
    document.execCommand('fontSize', false, '7');
    texto.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span');
      span.style.fontSize = tamanho;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
  }
  /* espaçamento entre linhas: aplica aos blocos (parágrafo, título, item de lista…) que tocam a seleção */
  function blocosSelecionados() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return [];
    const range = sel.getRangeAt(0);
    const BLOCOS = ['P', 'H2', 'H3', 'LI', 'BLOCKQUOTE'];
    const blocoDe = (node) => { while (node && node !== texto) { if (node.nodeType === 1 && BLOCOS.includes(node.tagName)) return node; node = node.parentNode; } return null; };
    const achados = new Set();
    const walker = document.createTreeWalker(texto, NodeFilter.SHOW_TEXT, { acceptNode: (n) => range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
    let n; while ((n = walker.nextNode())) { const b = blocoDe(n); if (b) achados.add(b); }
    if (!achados.size) { const b = blocoDe(range.startContainer); if (b) achados.add(b); }
    return [...achados];
  }
  /* sem bloco (texto solto, sem <p> ainda): força criar um <p> antes, para o estilo ser salvo de verdade */
  const aplicarEspacamento = (valor) => {
    let blocos = blocosSelecionados();
    if (!blocos.length) { document.execCommand('formatBlock', false, 'p'); blocos = blocosSelecionados(); }
    blocos.forEach((b) => { b.style.lineHeight = valor; });
  };

  /* upload de imagem para dentro do corpo do texto */
  const imgInput = document.createElement('input');
  imgInput.type = 'file'; imgInput.accept = 'image/jpeg,image/png,image/webp'; imgInput.hidden = true;
  document.body.appendChild(imgInput);
  imgInput.addEventListener('change', async () => {
    const file = imgInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('_csrf', $('[name=_csrf]', form).value);
    texto.focus();
    try {
      const r = await fetch('/admin/editor/imagem', { method: 'POST', body: fd });
      const dados = await r.json();
      if (dados.url) document.execCommand('insertImage', false, dados.url);
      else alert(dados.erro || 'Não foi possível enviar a imagem.');
    } catch (e) { alert('Não foi possível enviar a imagem.'); }
    imgInput.value = '';
    atualizarEstado();
  });

  botoes.forEach((b) =>
    b.addEventListener('click', () => {
      texto.focus();
      const [cmd, arg] = b.dataset.cmd.split(':');
      if (cmd === 'link') {
        const url = prompt('Endereço do link (https://…)');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'imagem') { imgInput.click(); return; }
      else document.execCommand(cmd, false, arg || null);
      atualizarEstado();
    }));
  document.querySelectorAll('.barra select[data-sel]').forEach((s) =>
    s.addEventListener('change', () => {
      texto.focus();
      if (s.dataset.sel === 'fonte') aplicarFonte(s.value);
      else if (s.dataset.sel === 'espaco') aplicarEspacamento(s.value);
      s.blur();
    }));

  texto.addEventListener('keyup', atualizarEstado);
  texto.addEventListener('mouseup', atualizarEstado);
  document.addEventListener('selectionchange', () => { if (document.activeElement === texto) atualizarEstado(); });
  // cola sem trazer formatação de outros sites; linha em branco vira novo parágrafo (nunca um parágrafo vazio)
  texto.addEventListener('paste', (e) => {
    e.preventDefault();
    const bruto = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\r/g, '');
    const blocos = bruto.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
    if (blocos.length < 2) { document.execCommand('insertText', false, blocos[0] || ''); return; }
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.execCommand('insertHTML', false, blocos.map((b) => `<p>${esc(b).replace(/\n/g, '<br>')}</p>`).join(''));
  });

  // contador de palavras e caracteres
  const contador = $('#contador-texto');
  const atualizarContador = () => {
    if (!contador) return;
    const t = texto.innerText.trim();
    const palavras = t ? t.split(/\s+/).length : 0;
    contador.textContent = `${palavras} ${palavras === 1 ? 'palavra' : 'palavras'} · ${t.length} caracteres`;
  };
  texto.addEventListener('input', atualizarContador);
  atualizarContador();

  form.addEventListener('submit', () => { $('#body').value = texto.innerHTML; });

  const quando = $('#quando'), agenda = $('#agenda');
  quando.addEventListener('change', () => { agenda.hidden = quando.value !== 'schedule'; });
}

/* painel de redes sociais: a opção "Outra rede" pede o nome da rede */
const novaRede = $('#nova_rede');
if (novaRede) novaRede.addEventListener('change', () => { $('#nova-nome').hidden = novaRede.value !== 'outra'; });
