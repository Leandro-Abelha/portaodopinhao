/* Painel: editor de texto, agendamento e confirmações */
const $ = (s, r = document) => r.querySelector(s);

document.addEventListener('submit', (e) => {
  const q = e.target.dataset && e.target.dataset.confirm;
  if (q && !confirm(q)) e.preventDefault();
});

const texto = $('#texto');
if (texto) {
  const form = $('#form-noticia');
  const botoes = document.querySelectorAll('.barra [data-cmd]');
  const ESTADOS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
  const atualizarEstado = () => botoes.forEach((b) => {
    const [cmd] = b.dataset.cmd.split(':');
    if (ESTADOS.includes(cmd)) { try { b.classList.toggle('ativo', document.queryCommandState(cmd)); } catch (e) {} }
  });
  botoes.forEach((b) =>
    b.addEventListener('click', () => {
      texto.focus();
      const [cmd, arg] = b.dataset.cmd.split(':');
      if (cmd === 'link') {
        const url = prompt('Endereço do link (https://…)');
        if (url) document.execCommand('createLink', false, url);
      } else document.execCommand(cmd, false, arg || null);
      atualizarEstado();
    }));
  texto.addEventListener('keyup', atualizarEstado);
  texto.addEventListener('mouseup', atualizarEstado);
  document.addEventListener('selectionchange', () => { if (document.activeElement === texto) atualizarEstado(); });
  // cola sem trazer formatação de outros sites
  texto.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });
  form.addEventListener('submit', () => { $('#body').value = texto.innerHTML; });

  const quando = $('#quando'), agenda = $('#agenda');
  quando.addEventListener('change', () => { agenda.hidden = quando.value !== 'schedule'; });
}
