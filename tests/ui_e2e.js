const puppeteer = require('puppeteer-core');
const mysqlq = process.env.MYSQLQ;
const U = 'http://localhost:8090/';
const out = process.env.SHOTS;
let n = 0; const log = [];
const ok = (name, c) => { log.push((c ? 'PASS ' : 'FAIL ') + name); console.log((c ? 'PASS ' : 'FAIL ') + name); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--window-size=1100,800'] });
  async function session(user, pw) {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1100, height: 800 });
    p.on('dialog', d => d.accept('Checked in class demo'));
    await p.goto(U); await p.type('#username', user); await p.type('#password', pw); await p.click('#loginBtn');
    return p;
  }
  const shot = async (p, name) => { await sleep(400); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const tab = async (p, name) => { await p.click(`[data-tab="${name}"]`); await sleep(500); };
  const msg = async (p) => { await sleep(500); return p.$eval('#msg', e => e.textContent); };

  // login page + failed login
  let p0 = await browser.newPage(); await p0.setViewport({ width: 1100, height: 600 }); await p0.goto(U);
  await p0.type('#username', 'customer1'); await p0.type('#password', 'wrong'); await p0.click('#loginBtn'); await sleep(500);
  ok('UI: invalid login shows error', (await msg(p0)).includes('Invalid username or password'));
  await shot(p0, 'login-invalid-credentials');
  await p0.close();

  // customer
  const c = await session('customer1', 'Demo@1234'); await c.waitForSelector('[data-testid=balance]');
  ok('UI: customer dashboard shows 5,000.00 balance', (await txt(c, '[data-account="EGP-001-1234567890"] .bal')).includes('5,000.00'));
  await shot(c, 'customer-accounts');
  await tab(c, 'Deposit'); await c.select('#f_acc', 'EGP-001-1234567890'); await c.type('#f_amount', '250.75'); await c.type('#f_desc', '<script>alert(1)</script> salary'); await c.click('#submitBtn');
  ok('UI: deposit success message', (await msg(c)).includes('Deposit recorded'));
  await shot(c, 'customer-deposit-success');
  await tab(c, 'Accounts');
  ok('UI: balance updated to 5,250.75', (await txt(c, '[data-account="EGP-001-1234567890"] .bal')).includes('5,250.75'));
  await tab(c, 'Deposit'); await c.type('#f_amount', '0'); await c.click('#submitBtn');
  ok('UI->API: deposit of 0 rejected', (await msg(c)).includes('greater than 0'));
  await shot(c, 'customer-deposit-zero-rejected');
  await tab(c, 'Withdraw'); await c.type('#f_amount', '999999'); await c.click('#submitBtn');
  ok('UI->API: overdraft rejected', (await msg(c)).includes('Insufficient funds'));
  await shot(c, 'customer-withdraw-insufficient');
  await tab(c, 'Withdraw'); await c.type('#f_amount', '50'); await c.click('#submitBtn'); await sleep(500);
  ok('UI: withdraw 50 ok', (await msg(c)).includes('Withdrawal recorded'));
  await tab(c, 'Transfer'); await c.select('#f_from', 'EGP-001-1234567890'); await c.type('#f_to', 'EGP-999-0000000000'); await c.type('#f_amount', '10'); await c.click('#submitBtn');
  ok('UI->API: invalid recipient rejected', (await msg(c)).includes('Invalid recipient'));
  await tab(c, 'Transfer'); await c.select('#f_from', 'EGP-001-1234567890'); await c.type('#f_to', 'EGP-003-5555555555'); await c.type('#f_amount', '1200'); await c.type('#f_desc', 'Rent'); await c.click('#submitBtn');
  ok('UI: transfer 1200 success', (await msg(c)).includes('Transfer complete'));
  await shot(c, 'customer-transfer-success');
  await tab(c, 'History'); await sleep(600);
  const html = await c.$eval('#historyTable', e => e.innerHTML);
  ok('UI: XSS text rendered as text, no <script> element injected', html.includes('&lt;script&gt;') && !(await c.$('#historyTable script')));
  const firstType = await c.$eval('#historyTable tbody tr td:nth-child(3)', e => e.textContent);
  ok('UI: history newest first (top row is the transfer)', firstType === 'TRANSFER_OUT');
  await shot(c, 'customer-history');
  await c.$eval('#h_from', (e) => { e.value = '2026-11-18'; }); await c.$eval('#h_to', (e) => { e.value = '2026-11-18'; });
  await c.click('#filterBtn'); await sleep(600);
  const rows = await c.$$eval('#historyTable tbody tr', r => r.length);
  ok('UI: date filter returns only the 2026-11-18 sample rows (' + rows + ')', rows >= 3 && rows <= 5);
  await shot(c, 'customer-history-date-filter');
  // reload keeps session
  await c.reload(); await c.waitForSelector('#who');
  ok('UI: session survives page reload', (await txt(c, '#who')).includes('CUSTOMER'));

  // teller
  const t = await session('teller1', 'Demo@1234'); await t.waitForSelector('#searchBtn');
  await t.type('#s_number', 'EGP-003-5555555555'); await t.click('#searchBtn'); await sleep(700);
  ok('UI: teller search shows account', (await txt(t, '[data-account] .bal')).includes('EGP'));
  await shot(t, 'teller-search');
  await tab(t, 'Deposit for customer'); await t.$eval('#f_acc', e => { e.value=''; }); await t.type('#f_acc', 'EGP-003-5555555555'); await t.type('#f_amount', '75'); await t.click('#submitBtn');
  ok('UI: teller deposit on behalf', (await msg(t)).includes('Deposit recorded'));
  await shot(t, 'teller-deposit-for-customer');

  // manager
  const m = await session('manager1', 'Demo@1234'); await m.waitForSelector('#viewReportBtn'); await sleep(700);
  await m.click('#saveReportBtn'); await sleep(700);
  await shot(m, 'manager-daily-report');
  await tab(m, 'Fraud flags'); await sleep(500);
  const unrev = await m.$$('[data-flag]');
  ok('UI: fraud flags list has unreviewed flags (>=2: seed + new 1200 transfer)', unrev.length >= 2);
  await shot(m, 'manager-fraud-flags');
  await unrev[0].click(); await sleep(800);
  ok('UI: manager reviewed a flag', (await msg(m)).includes('marked reviewed'));

  // admin
  const a = await session('admin1', 'Demo@1234'); await a.waitForSelector('#createUserBtn');
  await a.type('#u_username', 'student_demo'); await a.type('#u_password', 'ClassPass#1'); await a.type('#u_full', 'Sample Student'); await a.select('#u_role', 'CUSTOMER'); await a.click('#createUserBtn'); await sleep(900);
  ok('UI: admin created user', (await msg(a)).includes('User created'));
  await a.select('[data-role-for="student_demo"]', 'TELLER'); await sleep(900);
  await shot(a, 'admin-users');
  await a.click('[data-toggle="student_demo"]'); await sleep(900);
  ok('UI: admin disabled user', (await txt(a, '#panel')).includes('Disabled'));
  // lockout via UI
  for (let i = 0; i < 3; i++) { const l = await browser.newPage(); await l.goto(U); await l.type('#username', 'auditor1'); await l.type('#password', 'nope' + i); await l.click('#loginBtn'); await sleep(500);
    if (i === 2) { ok('UI: 3rd failed attempt shows locked message', (await msg(l)).toLowerCase().includes('locked')); await shot(l, 'login-account-locked'); } await l.close(); }
  await a.click('[data-tab="Users"]'); await sleep(700);
  ok('UI: admin sees auditor1 LOCKED', (await txt(a, '#panel')).includes('LOCKED'));
  await a.click('[data-unlock="auditor1"]'); await sleep(900);

  // auditor
  const u = await session('auditor1', 'Demo@1234'); await u.waitForSelector('[data-tab="Audit log"]'); await sleep(900);
  const au = await u.$$eval('#panel tbody tr', r => r.length);
  ok('UI: auditor sees audit log rows (' + au + ')', au >= 5);
  await shot(u, 'auditor-audit-log');
  // UI role separation
  ok('UI: auditor has no deposit/transfer tabs', !(await u.$('[data-tab="Deposit"]')));
  // session expiry message in UI: kill session server-side via logout from other context is hard; use cookie deletion
  await c.deleteCookie(...(await c.cookies())); await c.click('[data-tab="Accounts"]'); await sleep(700);
  ok('UI: expired/removed session returns to login with message', (await msg(c)).includes('session expired') && !(await c.$('#loginView.hidden')));
  await shot(c, 'session-expired-message');
  await browser.close();
  const f = log.filter(l => l.startsWith('FAIL')).length; console.log(`\n${log.length - f}/${log.length} UI checks passed`); process.exit(f ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
