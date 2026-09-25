/* Painel: editor de texto, agendamento e confirmações */
const $ = (s, r = document) => r.querySelector(s);

document.addEventListener('submit', (e) => {
  const q = e.target.dataset && e.target.dataset.confirm;
  if (q && !confirm(q)) e.preventDefault();
});

const texto = $('#texto');
if (texto) {
  const form = $('#form-noticia');
  document.querySelectorAll('.barra [data-cmd]').forEach((b) =>
    b.addEventListener('click', () => {
      texto.focus();
      const [cmd, arg] = b.dataset.cmd.split(':');
      if (cmd === 'link') {
        const url = prompt('Endereço do link (https://…)');
        if (url) document.execCommand('createLink', false, url);
      } else document.execCommand(cmd, false, arg || null);
    }));
  // cola sem trazer formatação de outros sites
  texto.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });
  form.addEventListener('submit', () => { $('#body').value = texto.innerHTML; });

  const quando = $('#quando'), agenda = $('#agenda');
  quando.addEventListener('change', () => { agenda.hidden = quando.value !== 'schedule'; });
}
