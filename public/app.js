/* App do painel: registra o service worker e oferece a instalação na tela inicial
   (só aparece quando o painel está aberto no navegador, não no app já instalado). */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw-admin.js', { scope: '/admin' }).catch(() => {});

const caixa = document.getElementById('instalar-app');
const noApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const lembrar = { get: () => { try { return sessionStorage.getItem('instalar-fechado'); } catch (e) { return null; } }, set: () => { try { sessionStorage.setItem('instalar-fechado', '1'); } catch (e) {} } };

if (caixa && !noApp && !lembrar.get()) {
  const texto = caixa.querySelector('[data-texto]');
  const botao = caixa.querySelector('[data-instalar]');
  const mostrar = (msg) => { if (msg) texto.innerHTML = msg; caixa.hidden = false; };
  const esconder = () => { caixa.hidden = true; };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let pedido = null;

  if (ios) mostrar('No Safari, toque em <b>Compartilhar</b> <span class="ios-compartilhar" aria-hidden="true"></span> e depois em <b>“Adicionar à Tela de Início”</b>.');

  /* Android e computador (Chrome, Edge, Samsung): o próprio navegador abre a janela de instalação */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedido = e;
    botao.hidden = false;
    mostrar();
  });
  botao.addEventListener('click', async () => {
    if (!pedido) return;
    pedido.prompt();
    const { outcome } = await pedido.userChoice;
    pedido = null;
    if (outcome === 'accepted') esconder();
  });
  window.addEventListener('appinstalled', esconder);

  /* celular com navegador que não oferece a janela: explica o caminho pelo menu */
  setTimeout(() => {
    if (!pedido && !ios && caixa.hidden && matchMedia('(pointer: coarse)').matches)
      mostrar('Abra o menu do navegador <b>(⋮)</b> e toque em <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.');
  }, 3500);

  caixa.querySelector('[data-fechar]').addEventListener('click', () => { lembrar.set(); esconder(); });
}

/* gaveta "Mais" do celular: fecha ao tocar fora ou apertar Esc */
const mais = document.querySelector('.mais');
if (mais) {
  mais.querySelector('[data-fechar-mais]').addEventListener('click', () => { mais.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') mais.open = false; });
}
