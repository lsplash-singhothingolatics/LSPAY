// If already logged in, send the primary CTA straight to the dashboard.
(function () {
  var cta = document.getElementById('ctaOpen');
  if (cta && window.LSPAY && LSPAY.currentUser()) {
    cta.textContent = 'Go to dashboard';
    cta.setAttribute('href', 'dashboard.html');
  }
})();
