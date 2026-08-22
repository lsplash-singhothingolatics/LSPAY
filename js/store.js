/*
 * LSPAY shared store
 * -------------------
 * A lightweight client-side "database" backed by localStorage.
 * All users on the same browser share the same ledger, so paying
 * someone actually credits their wallet.
 */
(function (global) {
  'use strict';

  var USERS_KEY = 'lspay_users';
  var SESSION_KEY = 'lspay_session';

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function uid() {
    return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  var Store = {
    // ---- Auth ----
    signup: function (data) {
      var users = readUsers();
      var username = (data.username || '').trim().toLowerCase();
      if (!username) return { ok: false, error: 'Please choose a username.' };
      if (users[username]) return { ok: false, error: 'That username is already taken.' };

      users[username] = {
        username: username,
        name: (data.name || '').trim() || username,
        email: (data.email || '').trim(),
        password: data.password || '',
        pin: '000000', // default payment code — user can change it later
        balance: 0,
        cards: [],
        banks: [],
        transactions: []
      };
      writeUsers(users);
      localStorage.setItem(SESSION_KEY, username);
      return { ok: true, user: users[username] };
    },

    login: function (data) {
      var users = readUsers();
      var username = (data.username || '').trim().toLowerCase();
      var user = users[username];
      if (!user || user.password !== data.password) {
        return { ok: false, error: 'Invalid username or password.' };
      }
      localStorage.setItem(SESSION_KEY, username);
      return { ok: true, user: user };
    },

    logout: function () {
      localStorage.removeItem(SESSION_KEY);
    },

    currentUsername: function () {
      return localStorage.getItem(SESSION_KEY);
    },

    currentUser: function () {
      var u = this.currentUsername();
      if (!u) return null;
      return readUsers()[u] || null;
    },

    // ---- Payment methods ----
    addCard: function (card) {
      var users = readUsers();
      var me = this.currentUsername();
      if (!me || !users[me]) return { ok: false, error: 'Not logged in.' };
      var digits = (card.number || '').replace(/\s+/g, '');
      users[me].cards.push({
        id: uid(),
        holder: card.holder,
        last4: digits.slice(-4),
        brand: detectBrand(digits),
        expiry: card.expiry
      });
      writeUsers(users);
      return { ok: true };
    },

    removeCard: function (id) {
      var users = readUsers();
      var me = this.currentUsername();
      users[me].cards = users[me].cards.filter(function (c) { return c.id !== id; });
      writeUsers(users);
      return { ok: true };
    },

    addBank: function (bank) {
      var users = readUsers();
      var me = this.currentUsername();
      if (!me || !users[me]) return { ok: false, error: 'Not logged in.' };
      var num = (bank.number || '');
      users[me].banks.push({
        id: uid(),
        bank: bank.bank,
        holder: bank.holder,
        last4: num.slice(-4),
        ifsc: bank.ifsc
      });
      writeUsers(users);
      return { ok: true };
    },

    removeBank: function (id) {
      var users = readUsers();
      var me = this.currentUsername();
      users[me].banks = users[me].banks.filter(function (b) { return b.id !== id; });
      writeUsers(users);
      return { ok: true };
    },

    // ---- Money movement ----
    addMoney: function (amount, sourceLabel) {
      var users = readUsers();
      var me = this.currentUsername();
      amount = Number(amount);
      if (!me || !users[me]) return { ok: false, error: 'Not logged in.' };
      if (!(amount > 0)) return { ok: false, error: 'Enter a valid amount.' };

      users[me].balance += amount;
      users[me].transactions.unshift({
        id: uid(),
        type: 'credit',
        amount: amount,
        party: sourceLabel || 'Top-up',
        note: 'Added to wallet',
        date: Date.now()
      });
      writeUsers(users);
      return { ok: true, balance: users[me].balance };
    },

    pay: function (toUsername, amount, note, pin) {
      var users = readUsers();
      var me = this.currentUsername();
      amount = Number(amount);
      toUsername = (toUsername || '').trim().toLowerCase();

      if (!me || !users[me]) return { ok: false, error: 'Not logged in.' };
      if (!toUsername) return { ok: false, error: 'Enter a recipient username.' };
      if (toUsername === me) return { ok: false, error: "You can't pay yourself." };
      if (!users[toUsername]) return { ok: false, error: 'No LSPAY user with that username.' };
      if (!(amount > 0)) return { ok: false, error: 'Enter a valid amount.' };
      // Payment code check (defaults to 000000 for existing accounts).
      var expectedPin = users[me].pin || '000000';
      if ((pin || '') !== expectedPin) return { ok: false, error: 'Incorrect payment code.' };
      if (users[me].balance < amount) return { ok: false, error: 'Insufficient wallet balance. Add money first.' };

      var when = Date.now();
      // Debit sender
      users[me].balance -= amount;
      users[me].transactions.unshift({
        id: uid(), type: 'debit', amount: amount,
        party: '@' + toUsername, note: note || '', date: when
      });
      // Credit recipient — the money actually lands in their account
      users[toUsername].balance += amount;
      users[toUsername].transactions.unshift({
        id: uid(), type: 'credit', amount: amount,
        party: '@' + me, note: note || '', date: when
      });

      writeUsers(users);
      return { ok: true, balance: users[me].balance };
    },

    // ---- Payment code ----
    getPin: function () {
      var u = this.currentUser();
      return u ? (u.pin || '000000') : '000000';
    },

    changePin: function (currentPin, newPin) {
      var users = readUsers();
      var me = this.currentUsername();
      if (!me || !users[me]) return { ok: false, error: 'Not logged in.' };
      var expected = users[me].pin || '000000';
      if ((currentPin || '') !== expected) return { ok: false, error: 'Current payment code is wrong.' };
      if (!/^\d{4,6}$/.test(newPin || '')) return { ok: false, error: 'New code must be 4 to 6 digits.' };
      users[me].pin = newPin;
      writeUsers(users);
      return { ok: true };
    }
  };

  function detectBrand(num) {
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num)) return 'Mastercard';
    if (/^3[47]/.test(num)) return 'Amex';
    if (/^6/.test(num)) return 'RuPay';
    return 'Card';
  }

  global.LSPAY = Store;
})(window);
