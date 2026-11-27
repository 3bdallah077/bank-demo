'use strict';
// Plain JS + Fetch. All server data is inserted with textContent (never innerHTML) to avoid XSS (NFR-03).

const state = { user: null, tab: null };
const $ = (id) => document.getElementById(id);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function show(kind, text) {
  const box = $('msg');
  box.replaceChildren(h('div', { class: kind, 'data-testid': 'message' }, text));
  if (kind === 'ok') setTimeout(() => { if (box.textContent === text) box.replaceChildren(); }, 8000);
}
function clearMsg() { $('msg').replaceChildren(); }

async function api(method, url, body) {
  const opt = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(url, opt);
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (res.status === 401 && state.user && url !== '/api/auth/login') {
    state.user = null; showLogin();
    show('err', 'Your session expired or you are logged out. Please log in again.');
    throw new Error('session');
  }
  if (!res.ok) throw new Error((data && data.message) || ('Request failed (' + res.status + ')'));
  return data;
}

const money = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (iso) => iso ? new Date(iso).toLocaleString() : '';

function table(cols, rows) {
  return h('table', {},
    h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.num ? 'num' : '' }, c.label)))),
    h('tbody', {}, rows.length ? rows.map(r => h('tr', {}, cols.map(c => {
      const v = c.get(r);
      return h('td', { class: c.num ? 'num' : '' }, v instanceof Node ? v : (v == null ? '' : v));
    }))) : h('tr', {}, h('td', { colspan: cols.length }, 'No records'))));
}

const txCols = [
  { label: 'ID', get: t => t.id },
  { label: 'Date (local)', get: t => when(t.createdAt) },
  { label: 'Type', get: t => t.type },
  { label: 'Account', get: t => t.accountNumber },
  { label: 'Amount (EGP)', num: true, get: t => money(t.amount) },
  { label: 'Status', get: t => h('span', { class: 'tag ' + t.status }, t.status) },
  { label: 'Description', get: t => t.description },
];

// ---------------- login / session
function showLogin() {
  $('loginView').classList.remove('hidden');
  $('appView').classList.add('hidden');
  $('userbox').classList.add('hidden');
  $('password').value = '';
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  try {
    state.user = await api('POST', '/api/auth/login', { username: $('username').value, password: $('password').value });
    enterApp();
  } catch (err) { show('err', err.message); }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('POST', '/api/auth/logout'); } catch (e) { /* ignore */ }
  state.user = null; showLogin(); show('ok', 'Logged out.');
});

const TABS = {
  CUSTOMER: [['Accounts', viewAccounts], ['Deposit', () => viewMoney('deposit')], ['Withdraw', () => viewMoney('withdraw')], ['Transfer', viewTransfer], ['History', viewHistory]],
  TELLER: [['Find account', viewTeller], ['Deposit for customer', () => viewMoney('deposit')], ['Withdraw for customer', () => viewMoney('withdraw')]],
  MANAGER: [['Daily report', viewReport], ['Fraud flags', viewFraud], ['All transactions', viewAllTx], ['Audit log', viewAudit], ['Find account', viewTeller]],
  ADMIN: [['Users', viewUsers], ['Open account', viewOpenAccount], ['Find account', viewTeller], ['Daily report', viewReport]],
  AUDITOR: [['Audit log', viewAudit], ['All transactions', viewAllTx], ['Fraud flags', viewFraud]],
};

function enterApp() {
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('userbox').classList.remove('hidden');
  $('who').textContent = state.user.fullName + ' (' + state.user.role + ')';
  const tabs = TABS[state.user.role];
  $('tabs').replaceChildren(...tabs.map(([name, fn], i) => h('button', {
    type: 'button', 'data-tab': name, onclick: () => { clearMsg(); openTab(i); }
  }, name)));
  openTab(0);
}

async function openTab(i) {
  const [name, fn] = TABS[state.user.role][i];
  [...$('tabs').children].forEach((b, j) => b.classList.toggle('active', i === j));
  const panel = $('panel');
  panel.replaceChildren(h('p', {}, 'Loading...'));
  try { panel.replaceChildren(await fn()); } catch (e) { if (e.message !== 'session') { panel.replaceChildren(); show('err', e.message); } }
}
function reloadTab() { const i = [...$('tabs').children].findIndex(b => b.classList.contains('active')); openTab(i < 0 ? 0 : i); }

// ---------------- customer
async function viewAccounts() {
  const list = await api('GET', '/api/accounts/mine');
  return h('div', {}, h('h2', {}, 'My accounts'),
    h('div', { class: 'accounts' }, list.map(a => h('div', { class: 'acct', 'data-account': a.accountNumber },
      h('div', { class: 'no' }, a.accountNumber),
      h('div', { class: 'bal', 'data-testid': 'balance' }, money(a.balance) + ' ' + a.currency)))),
    h('p', { class: 'hint' }, 'Balances are read from the database each time this tab opens.'));
}

async function accountSelect(id) {
  let accts = [];
  if (state.user.role === 'CUSTOMER') accts = await api('GET', '/api/accounts/mine');
  return accts;
}

async function viewMoney(kind) {
  const isCust = state.user.role === 'CUSTOMER';
  const accts = isCust ? await accountSelect() : [];
  const acctField = isCust
    ? h('select', { id: 'f_acc', name: 'accountNumber' }, accts.map(a => h('option', { value: a.accountNumber }, a.accountNumber + ' (' + money(a.balance) + ')')))
    : h('input', { id: 'f_acc', name: 'accountNumber', type: 'text', maxlength: 30, placeholder: 'EGP-001-1234567890', value: state.lastAccount || '' });
  const amount = h('input', { id: 'f_amount', name: 'amount', type: 'text', inputmode: 'decimal', placeholder: '0.00' });
  const desc = h('input', { id: 'f_desc', name: 'description', type: 'text', maxlength: 200 });
  const form = h('form', { id: kind + 'Form' },
    h('label', {}, 'Account', acctField), h('label', {}, 'Amount (EGP)', amount), h('label', {}, 'Description (optional)', desc),
    h('button', { type: 'submit', id: 'submitBtn' }, kind === 'deposit' ? 'Deposit' : 'Withdraw'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); clearMsg();
    const num = Number(amount.value.trim());
    if (!amount.value.trim() || !isFinite(num)) { show('err', 'Enter a valid amount'); return; }
    try {
      const r = await api('POST', '/api/transactions/' + kind, { accountNumber: acctField.value, amount: amount.value.trim(), description: desc.value });
      state.lastAccount = acctField.value;
      show('ok', (kind === 'deposit' ? 'Deposit' : 'Withdrawal') + ' recorded. Transaction #' + r.transaction.id + '.');
      if (isCust) reloadTab(); else { amount.value = ''; desc.value = ''; }
    } catch (err) { if (err.message !== 'session') show('err', err.message); }
  });
  return h('div', { class: 'card' }, h('h2', {}, kind === 'deposit' ? 'Deposit' : 'Withdraw'), form,
    isCust ? null : h('p', { class: 'hint' }, 'In-branch service on behalf of a customer (US-08).'));
}

async function viewTransfer() {
  const accts = await accountSelect();
  const from = h('select', { id: 'f_from', name: 'from' }, accts.map(a => h('option', { value: a.accountNumber }, a.accountNumber + ' (' + money(a.balance) + ')')));
  const to = h('input', { id: 'f_to', name: 'to', type: 'text', maxlength: 30, placeholder: 'Recipient account number' });
  const amount = h('input', { id: 'f_amount', name: 'amount', type: 'text', inputmode: 'decimal', placeholder: '0.00' });
  const desc = h('input', { id: 'f_desc', name: 'description', type: 'text', maxlength: 200 });
  const form = h('form', { id: 'transferForm' }, h('label', {}, 'From account', from), h('label', {}, 'To account number', to),
    h('label', {}, 'Amount (EGP)', amount), h('label', {}, 'Description (optional)', desc), h('button', { type: 'submit', id: 'submitBtn' }, 'Transfer'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); clearMsg();
    if (!amount.value.trim() || !isFinite(Number(amount.value))) { show('err', 'Enter a valid amount'); return; }
    try {
      const r = await api('POST', '/api/transactions/transfer', { fromAccountNumber: from.value, toAccountNumber: to.value, amount: amount.value.trim(), description: desc.value });
      show('ok', 'Transfer complete. New balance of ' + from.value + ': ' + money(r.sourceBalance) + ' EGP.');
      reloadTab();
    } catch (err) { if (err.message !== 'session') show('err', err.message); }
  });
  return h('div', { class: 'card' }, h('h2', {}, 'Transfer'), form);
}

async function viewHistory() {
  const accts = await accountSelect();
  const sel = h('select', { id: 'h_acc' }, accts.map(a => h('option', { value: a.accountNumber }, a.accountNumber)));
  return historyUI(sel);
}

function historyUI(accSource) {
  const from = h('input', { id: 'h_from', type: 'date' }), to = h('input', { id: 'h_to', type: 'date' });
  const out = h('div', { id: 'historyTable' });
  async function load() {
    clearMsg();
    const q = new URLSearchParams(); if (from.value) q.set('from', from.value); if (to.value) q.set('to', to.value);
    try {
      const rows = await api('GET', '/api/accounts/' + encodeURIComponent(accSource.value) + '/transactions?' + q);
      out.replaceChildren(table(txCols, rows));
    } catch (err) { if (err.message !== 'session') { out.replaceChildren(); show('err', err.message); } }
  }
  const wrap = h('div', { class: 'card' }, h('h2', {}, 'Transaction history (newest first)'),
    h('div', { class: 'row' }, accSource.tagName === 'SELECT' ? h('label', {}, 'Account', accSource) : null,
      h('label', {}, 'From', from), h('label', {}, 'To', to), h('button', { type: 'button', id: 'filterBtn', onclick: load }, 'Show')), out);
  if (accSource.value) load();
  return wrap;
}

// ---------------- teller / staff
async function viewTeller() {
  const num = h('input', { id: 's_number', type: 'text', maxlength: 30, placeholder: 'EGP-001-1234567890' });
  const res = h('div', { id: 'searchResult' });
  async function search() {
    clearMsg(); res.replaceChildren();
    try {
      const a = await api('GET', '/api/accounts/search?number=' + encodeURIComponent(num.value.trim()));
      state.lastAccount = a.accountNumber;
      const holder = h('input', { type: 'hidden', value: a.accountNumber });
      res.replaceChildren(h('div', { class: 'acct', 'data-account': a.accountNumber }, h('div', { class: 'no' }, a.accountNumber),
        h('div', { class: 'bal', 'data-testid': 'balance' }, money(a.balance) + ' ' + a.currency),
        h('div', { class: 'hint' }, 'Active: ' + (a.active ? 'yes' : 'no'))), historyUI(holder));
    } catch (err) { if (err.message !== 'session') show('err', err.message); }
  }
  return h('div', {}, h('div', { class: 'card' }, h('h2', {}, 'Find account by number'),
    h('div', { class: 'row' }, h('label', {}, 'Account number', num), h('button', { type: 'button', id: 'searchBtn', onclick: search }, 'Search'))), res);
}

// ---------------- manager / auditor / admin
async function viewReport() {
  const date = h('input', { id: 'r_date', type: 'date', value: new Date().toISOString().slice(0, 10) });
  const out = h('div', { id: 'reportOut' });
  const canSave = state.user.role === 'MANAGER';
  async function load(save) {
    clearMsg();
    try {
      const r = save ? await api('POST', '/api/reports/daily?date=' + date.value) : await api('GET', '/api/reports/daily?date=' + date.value);
      const d = save ? r : r;
      out.replaceChildren(table([
        { label: 'Date', get: x => x.reportDate }, { label: 'Deposits', num: true, get: x => money(x.totalDeposits) },
        { label: 'Withdrawals', num: true, get: x => money(x.totalWithdrawals) }, { label: 'Transfers', num: true, get: x => money(x.totalTransfers) },
        { label: 'Completed transactions', num: true, get: x => x.transactionCount }], [d]),
        h('p', { class: 'hint' }, save ? 'Saved to daily_reports.' : (r.savedReport ? 'A saved report exists for this date (generated ' + when(r.savedReport.generatedAt) + ').' : 'Live figures. Not saved yet.')));
      if (save) show('ok', 'Report saved.');
    } catch (err) { if (err.message !== 'session') show('err', err.message); }
  }
  const w = h('div', { class: 'card' }, h('h2', {}, 'Daily transaction report'),
    h('div', { class: 'row' }, h('label', {}, 'Date (UTC day)', date), h('button', { type: 'button', id: 'viewReportBtn', onclick: () => load(false) }, 'View'),
      canSave ? h('button', { type: 'button', id: 'saveReportBtn', class: 'secondary', onclick: () => load(true) }, 'Generate and save') : null), out);
  load(false);
  return w;
}

async function viewFraud() {
  const flags = await api('GET', '/api/fraud-flags');
  const canReview = state.user.role === 'MANAGER';
  return h('div', { class: 'card' }, h('h2', {}, 'Flagged transactions'), table([
    { label: 'Flag', get: f => f.id }, { label: 'Tx', get: f => f.transactionId }, { label: 'Type', get: f => f.type },
    { label: 'Account', get: f => f.accountNumber }, { label: 'Amount', num: true, get: f => f.amount == null ? '' : money(f.amount) },
    { label: 'Limit', num: true, get: f => money(f.thresholdAmount) },
    { label: 'Reviewed', get: f => f.reviewed ? 'Yes' : 'No' }, { label: 'Notes', get: f => f.notes },
    { label: '', get: f => (!f.reviewed && canReview) ? h('button', { class: 'small', 'data-flag': f.id, onclick: async () => {
        const notes = prompt('Review notes (optional):', '');
        if (notes === null) return;
        try { await api('POST', '/api/fraud-flags/' + f.id + '/review', { notes }); show('ok', 'Flag ' + f.id + ' marked reviewed.'); reloadTab(); }
        catch (e) { if (e.message !== 'session') show('err', e.message); }
      } }, 'Mark reviewed') : '' },
  ], flags));
}

async function viewAllTx() {
  const rows = await api('GET', '/api/transactions');
  return h('div', { class: 'card' }, h('h2', {}, 'All transactions (read only)'), table(txCols, rows));
}

async function viewAudit() {
  const rows = await api('GET', '/api/audit-log');
  return h('div', { class: 'card' }, h('h2', {}, 'Audit log (read only, append only)'), table([
    { label: 'ID', get: r => r.id }, { label: 'When (local)', get: r => when(r.performedAt) }, { label: 'Tx', get: r => r.transactionId },
    { label: 'Action', get: r => r.action }, { label: 'By user', get: r => r.performedBy }, { label: 'IP', get: r => r.ipAddress },
    { label: 'Details', get: r => r.newValues },
  ], rows));
}

async function viewUsers() {
  const users = await api('GET', '/api/admin/users');
  const roles = ['CUSTOMER', 'TELLER', 'MANAGER', 'ADMIN', 'AUDITOR'];
  const f = {
    username: h('input', { id: 'u_username', maxlength: 50 }), password: h('input', { id: 'u_password', type: 'password', maxlength: 72 }),
    fullName: h('input', { id: 'u_full', maxlength: 200 }), email: h('input', { id: 'u_email', maxlength: 255 }),
    role: h('select', { id: 'u_role' }, roles.map(r => h('option', { value: r }, r))),
  };
  const form = h('form', { id: 'createUserForm' }, h('div', { class: 'row' },
    h('label', {}, 'Username', f.username), h('label', {}, 'Password (min 8)', f.password), h('label', {}, 'Full name', f.fullName),
    h('label', {}, 'Email', f.email), h('label', {}, 'Role', f.role), h('button', { type: 'submit', id: 'createUserBtn' }, 'Create user')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); clearMsg();
    try {
      await api('POST', '/api/admin/users', { username: f.username.value, password: f.password.value, fullName: f.fullName.value, email: f.email.value, role: f.role.value });
      show('ok', 'User created.'); reloadTab();
    } catch (err) { if (err.message !== 'session') show('err', err.message); }
  });
  async function patch(u, body, text) {
    try { await api('PATCH', '/api/admin/users/' + u.id, body); show('ok', text); reloadTab(); }
    catch (err) { if (err.message !== 'session') show('err', err.message); }
  }
  return h('div', {}, h('div', { class: 'card' }, h('h2', {}, 'Create user'), form),
    h('div', { class: 'card' }, h('h2', {}, 'Users'), table([
      { label: 'ID', get: u => u.id }, { label: 'Username', get: u => u.username }, { label: 'Name', get: u => u.fullName },
      { label: 'Role', get: u => { const s = h('select', { 'data-role-for': u.username }, roles.map(r => h('option', { value: r, selected: r === u.role ? 'selected' : false }, r)));
          s.addEventListener('change', () => patch(u, { role: s.value }, 'Role changed for ' + u.username + '.')); return s; } },
      { label: 'Status', get: u => (u.active ? 'Active' : 'Disabled') + (u.locked ? ', LOCKED' : '') },
      { label: 'Actions', get: u => h('span', {},
          h('button', { class: 'small ' + (u.active ? 'danger' : ''), 'data-toggle': u.username, onclick: () => patch(u, { active: !u.active }, (u.active ? 'Disabled ' : 'Enabled ') + u.username + '.') }, u.active ? 'Disable' : 'Enable'), ' ',
          u.locked ? h('button', { class: 'small secondary', 'data-unlock': u.username, onclick: () => patch(u, { unlock: true }, 'Unlocked ' + u.username + '.') }, 'Unlock') : '') },
    ], users)));
}

async function viewOpenAccount() {
  const users = (await api('GET', '/api/admin/users')).filter(u => u.role === 'CUSTOMER');
  const sel = h('select', { id: 'oa_user' }, users.map(u => h('option', { value: u.id }, u.username + ' - ' + u.fullName)));
  return h('div', { class: 'card' }, h('h2', {}, 'Open a new account for a customer'),
    h('label', {}, 'Customer', sel),
    h('button', { id: 'openAccountBtn', type: 'button', onclick: async () => {
      clearMsg();
      try { const a = await api('POST', '/api/admin/accounts', { userId: Number(sel.value) }); show('ok', 'Opened account ' + a.accountNumber + ' (balance 0.00).'); }
      catch (err) { if (err.message !== 'session') show('err', err.message); }
    } }, 'Open account'));
}

// ---------------- boot: restore an existing session after reload
(async () => {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) { state.user = await res.json(); enterApp(); } else showLogin();
  } catch (e) { showLogin(); }
})();
