(function () {
  'use strict';

  // Guard: must be logged in.
  var user = LSPAY.currentUser();
  if (!user) { window.location.replace('auth.html'); return; }

  var $ = function (id) { return document.getElementById(id); };

  function money(n) {
    return '₹ ' + Number(n).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function render() {
    user = LSPAY.currentUser();
    $('userName').textContent = user.name;
    $('userHandle').textContent = '@' + user.username;
    $('acctHandle').textContent = '@' + user.username;
    $('balance').textContent = money(user.balance);
    renderCards();
    renderBanks();
    renderSources();
    renderTx();
  }

  function renderCards() {
    var wrap = $('cardsList');
    if (!user.cards.length) {
      wrap.innerHTML = '<p class="empty">No cards yet.</p>';
      return;
    }
    wrap.innerHTML = user.cards.map(function (c) {
      return '<div class="method-item">' +
        '<span>' + c.brand + ' •••• ' + c.last4 + '<small> ' + c.expiry + '</small></span>' +
        '<button class="link-danger" data-remove-card="' + c.id + '">Remove</button>' +
        '</div>';
    }).join('');
  }

  function renderBanks() {
    var wrap = $('banksList');
    if (!user.banks.length) {
      wrap.innerHTML = '<p class="empty">No bank accounts yet.</p>';
      return;
    }
    wrap.innerHTML = user.banks.map(function (b) {
      return '<div class="method-item">' +
        '<span>' + b.bank + ' •••• ' + b.last4 + '<small> ' + b.ifsc + '</small></span>' +
        '<button class="link-danger" data-remove-bank="' + b.id + '">Remove</button>' +
        '</div>';
    }).join('');
  }

  function renderSources() {
    var sel = $('addSource');
    var opts = ['<option value="">Select a card or bank…</option>'];
    user.cards.forEach(function (c) {
      opts.push('<option value="' + c.brand + ' •••• ' + c.last4 + '">' + c.brand + ' •••• ' + c.last4 + '</option>');
    });
    user.banks.forEach(function (b) {
      opts.push('<option value="' + b.bank + ' •••• ' + b.last4 + '">' + b.bank + ' •••• ' + b.last4 + '</option>');
    });
    sel.innerHTML = opts.join('');
  }

  function renderTx() {
    var wrap = $('txList');
    if (!user.transactions.length) {
      wrap.innerHTML = '<p class="empty">No transactions yet. Add money or pay someone to get started.</p>';
      return;
    }
    wrap.innerHTML = user.transactions.map(function (t) {
      var credit = t.type === 'credit';
      var sign = credit ? '+' : '−';
      var d = new Date(t.date);
      var when = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
        ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return '<div class="tx">' +
        '<div class="tx-icon ' + (credit ? 'in' : 'out') + '">' + (credit ? '↓' : '↑') + '</div>' +
        '<div class="tx-main">' +
          '<span class="tx-party">' + t.party + '</span>' +
          '<span class="tx-note">' + (t.note ? escapeHtml(t.note) : (credit ? 'Received' : 'Sent')) + ' · ' + when + '</span>' +
        '</div>' +
        '<div class="tx-amt ' + (credit ? 'in' : 'out') + '">' + sign + ' ' + money(t.amount).replace('₹ ', '₹') + '</div>' +
        '</div>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Events ----
  $('logoutBtn').addEventListener('click', function () {
    LSPAY.logout();
    window.location.href = 'index.html';
  });

  // Scroll to a panel when the balance-card buttons are clicked.
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-open') === 'pay' ? 'payPanel' : 'addPanel';
      $(target).scrollIntoView({ behavior: 'smooth', block: 'center' });
      $(target).classList.add('flash');
      setTimeout(function () { $(target).classList.remove('flash'); }, 900);
    });
  });

  $('payForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('payError'), ok = $('payOk');
    err.textContent = ''; ok.textContent = '';
    var fd = new FormData(e.target);
    var res = LSPAY.pay(fd.get('to'), fd.get('amount'), fd.get('note'), fd.get('pin'));
    if (!res.ok) { err.textContent = res.error; return; }
    ok.textContent = 'Sent ' + money(fd.get('amount')) + ' to @' + fd.get('to').trim().toLowerCase() + '.';
    e.target.reset();
    render();
  });

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('addError'), ok = $('addOk');
    err.textContent = ''; ok.textContent = '';
    var fd = new FormData(e.target);
    if (!fd.get('source')) { err.textContent = 'Add and select a card or bank first.'; return; }
    var res = LSPAY.addMoney(fd.get('amount'), fd.get('source'));
    if (!res.ok) { err.textContent = res.error; return; }
    ok.textContent = 'Added ' + money(fd.get('amount')) + ' to your wallet.';
    e.target.reset();
    render();
  });

  $('cardForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('cardError'); err.textContent = '';
    var fd = new FormData(e.target);
    var res = LSPAY.addCard({
      holder: fd.get('holder'), number: fd.get('number'),
      expiry: fd.get('expiry'), cvv: fd.get('cvv')
    });
    if (!res.ok) { err.textContent = res.error; return; }
    e.target.reset();
    e.target.closest('details').open = false;
    render();
  });

  $('bankForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('bankError'); err.textContent = '';
    var fd = new FormData(e.target);
    var res = LSPAY.addBank({
      bank: fd.get('bank'), holder: fd.get('holder'),
      number: fd.get('number'), ifsc: fd.get('ifsc')
    });
    if (!res.ok) { err.textContent = res.error; return; }
    e.target.reset();
    e.target.closest('details').open = false;
    render();
  });

  $('pinForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('pinError'), ok = $('pinOk');
    err.textContent = ''; ok.textContent = '';
    var fd = new FormData(e.target);
    var res = LSPAY.changePin(fd.get('current'), fd.get('next'));
    if (!res.ok) { err.textContent = res.error; return; }
    ok.textContent = 'Payment code updated.';
    e.target.reset();
  });

  // Remove card/bank (event delegation)
  document.addEventListener('click', function (e) {
    var cid = e.target.getAttribute && e.target.getAttribute('data-remove-card');
    var bid = e.target.getAttribute && e.target.getAttribute('data-remove-bank');
    if (cid) { LSPAY.removeCard(cid); render(); }
    if (bid) { LSPAY.removeBank(bid); render(); }
  });

  render();
})();
