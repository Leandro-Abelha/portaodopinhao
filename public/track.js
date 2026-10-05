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

  /* abre a janela de compartilhamento da rede; Instagram e "copiar" só copiam o endereço */
  function compartilhar(rede, url, titulo, aviso) {
    var u = encodeURIComponent(url), t = encodeURIComponent(titulo);
    var destinos = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(titulo + ' ' + url),
      x: 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u,
      telegram: 'https://t.me/share/url?url=' + u + '&text=' + t,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
    };
    if (destinos[rede]) { window.open(destinos[rede], '_blank', 'noopener,width=620,height=560'); return; }
    if (rede === 'email') { location.href = 'mailto:?subject=' + t + '&body=' + encodeURIComponent(titulo + '\n' + url); return; }
    var mensagem = rede === 'instagram' ? 'Link copiado! Cole nos stories do Instagram.' : 'Link copiado!';
    var copiar = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : Promise.reject();
    copiar.then(function () {
      if (aviso) { aviso.textContent = mensagem; setTimeout(function () { aviso.textContent = ''; }, 4000); }
    }).catch(function () {
      if (aviso) aviso.textContent = url;
    });
  }

  document.addEventListener('click', function (e) {
    var seguir = e.target.closest('.social a, .social-topo a, .colunista-social a');
    if (seguir && seguir.dataset.rede) { evento('social_click', seguir.dataset.rede); return; }

    var share = e.target.closest('.share-btn');
    if (!share) return;
    e.preventDefault();
    evento('share_click', share.dataset.share);
    compartilhar(share.dataset.share, location.href, document.title, share.parentElement.querySelector('.compartilhar-aviso'));
  });
})();
