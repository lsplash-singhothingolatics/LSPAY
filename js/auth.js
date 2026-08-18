(function () {
  'use strict';

  // Already signed in? Go straight to the dashboard.
  if (LSPAY.currentUser()) {
    window.location.replace('dashboard.html');
    return;
  }

  var tabSignup = document.getElementById('tabSignup');
  var tabLogin = document.getElementById('tabLogin');
  var signupForm = document.getElementById('signupForm');
  var loginForm = document.getElementById('loginForm');
  var tagline = document.getElementById('authTagline');

  function show(mode) {
    var isSignup = mode !== 'login';
    tabSignup.classList.toggle('active', isSignup);
    tabLogin.classList.toggle('active', !isSignup);
    signupForm.classList.toggle('hidden', !isSignup);
    loginForm.classList.toggle('hidden', isSignup);
    tagline.textContent = isSignup ? 'Open your free account' : 'Welcome back';
  }

  tabSignup.addEventListener('click', function () { show('signup'); });
  tabLogin.addEventListener('click', function () { show('login'); });

  // Respect ?mode=login|signup
  var params = new URLSearchParams(window.location.search);
  show(params.get('mode') === 'login' ? 'login' : 'signup');

  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('signupError');
    err.textContent = '';
    var fd = new FormData(signupForm);
    var res = LSPAY.signup({
      name: fd.get('name'),
      username: fd.get('username'),
      email: fd.get('email'),
      password: fd.get('password')
    });
    if (!res.ok) { err.textContent = res.error; return; }
    window.location.href = 'dashboard.html';
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('loginError');
    err.textContent = '';
    var fd = new FormData(loginForm);
    var res = LSPAY.login({ username: fd.get('username'), password: fd.get('password') });
    if (!res.ok) { err.textContent = res.error; return; }
    window.location.href = 'dashboard.html';
  });
})();
