/* Registra cliques em botões de redes sociais como "conversões" no painel de estatísticas */
(function () {
  function rede(a) {
    return a.dataset.rede || '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.social a, .social-topo a, .colunista-social a');
    var tipo = a && rede(a);
    if (!tipo) return;
    var payload = JSON.stringify({ tipo: 'social_click', meta: tipo });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/evento', new Blob([payload], { type: 'application/json' }));
      else fetch('/evento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    } catch (err) {}
  });
})();
