/* Registra cliques em botões de redes sociais como "conversões" no painel de estatísticas,
   e cuida dos botões de compartilhar embaixo de cada notícia */
(function () {
  function evento(tipo, meta) {
    var payload = JSON.stringify({ tipo: tipo, meta: meta });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/evento', new Blob([payload], { type: 'application/json' }));
      else fetch('/evento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    } catch (err) {}
  }

  document.addEventListener('click', function (e) {
    var seguir = e.target.closest('.social a, .social-topo a, .colunista-social a');
    if (seguir && seguir.dataset.rede) { evento('social_click', seguir.dataset.rede); return; }

    var share = e.target.closest('.share-btn');
    if (!share) return;
    e.preventDefault();
    var rede = share.dataset.share;
    var url = location.href;
    var titulo = document.title;
    evento('share_click', rede);
    if (rede === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,width=600,height=500');
    } else if (rede === 'whatsapp') {
      window.open('https://wa.me/?text=' + encodeURIComponent(titulo + ' ' + url), '_blank', 'noopener');
    } else if (rede === 'instagram') {
      var aviso = share.parentElement.querySelector('.compartilhar-aviso');
      var copiar = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(url)
        : Promise.reject();
      copiar.then(function () {
        if (aviso) { aviso.textContent = 'Link copiado! Cole nos stories do Instagram.'; setTimeout(function () { aviso.textContent = ''; }, 4000); }
      }).catch(function () {
        if (aviso) { aviso.textContent = url; }
      });
    }
  });
})();
