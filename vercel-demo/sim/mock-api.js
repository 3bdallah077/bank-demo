/* ============================================================================
 *  ONLINE DEMO ONLY — in-browser mock of the Bank Demo REST API
 * ----------------------------------------------------------------------------
 *  This file is NOT part of the Spring Boot application. The real project runs
 *  on Java + MySQL (see ../README.md). Vercel cannot run a stateful JVM with a
 *  MySQL database, so this static demo reproduces the SAME REST contract in the
 *  browser, with the SAME seed rows taken from db/bank_system_sample.sql:
 *
 *    users       5 rows   (customer1, teller1, manager1, admin1, auditor1)
 *    accounts    3 rows   (5000.00 / 3000.00 / 10000.00 EGP)
 *    transactions 5 rows  (4 COMPLETED + 1 FAILED)
 *    audit_log   2 rows
 *    fraud_flags 1 row
 *    daily_reports 1 row
 *
 *  Password for every sample user: Demo@1234
 *  State is kept in sessionStorage, so a browser tab behaves like a session.
 *  Everything here is fictional; no real banking, no network calls.
 * ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'bankdemo.state.v1';
  var SESSION_MS = 10 * 60 * 1000;        // NFR-04: 10 minutes idle
  var MAX_FAILED = 3;                     // FR-02
  var LOCK_MS = 15 * 60 * 1000;           // FR-02 lock window
  var FRAUD_THRESHOLD = 1000.00;          // FR-12 default

  // ---- seed, copied from the sample schema ---------------------------------
  function seed() {
    return {
      seq: { user: 5, account: 3, tx: 5, audit: 2, flag: 1, report: 1 },
      users: [
        { id: 1, username: 'customer1', password: 'Demo@1234', fullName: 'Ahmed Mohamed', email: 'ahmed@example.com', role: 'CUSTOMER', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null },
        { id: 2, username: 'teller1',   password: 'Demo@1234', fullName: 'Omar Ali', email: 'omar@example.com', role: 'TELLER', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null },
        { id: 3, username: 'manager1',  password: 'Demo@1234', fullName: 'Fatima Hassan', email: 'fatima@example.com', role: 'MANAGER', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null },
        { id: 4, username: 'admin1',    password: 'Demo@1234', fullName: 'System Administrator', email: 'admin@example.com', role: 'ADMIN', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null },
        { id: 5, username: 'auditor1',  password: 'Demo@1234', fullName: 'Compliance Officer', email: 'auditor@example.com', role: 'AUDITOR', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null }
      ],
      accounts: [
        { id: 1, accountNumber: 'EGP-001-1234567890', userId: 1, balance: 5000.00, currency: 'EGP', active: true },
        { id: 2, accountNumber: 'EGP-002-0987654321', userId: 1, balance: 3000.00, currency: 'EGP', active: true },
        { id: 3, accountNumber: 'EGP-003-5555555555', userId: 2, balance: 10000.00, currency: 'EGP', active: true }
      ],
      transactions: [
        { id: 1, accountId: 1, amount: 1000.00, type: 'DEPOSIT', status: 'COMPLETED', description: 'Initial deposit', referenceId: null, failureReason: null, createdAt: '2026-11-18T00:19:40Z', createdBy: 1, ipAddress: '127.0.0.1' },
        { id: 2, accountId: 1, amount: 500.00, type: 'WITHDRAW', status: 'COMPLETED', description: 'Cash withdrawal', referenceId: null, failureReason: null, createdAt: '2026-11-18T00:19:40Z', createdBy: 1, ipAddress: '127.0.0.1' },
        { id: 3, accountId: 1, amount: 200.00, type: 'TRANSFER_OUT', status: 'COMPLETED', description: 'Transfer to EGP-002-0987654321', referenceId: 4, failureReason: null, createdAt: '2026-11-18T00:19:40Z', createdBy: 1, ipAddress: '127.0.0.1' },
        { id: 4, accountId: 2, amount: 200.00, type: 'TRANSFER_IN', status: 'COMPLETED', description: 'Transfer from EGP-001-1234567890', referenceId: 3, failureReason: null, createdAt: '2026-11-18T00:19:40Z', createdBy: 1, ipAddress: '127.0.0.1' },
        { id: 5, accountId: 1, amount: 10000.00, type: 'WITHDRAW', status: 'FAILED', description: 'Attempted large withdrawal', referenceId: null, failureReason: 'Insufficient funds. Available: 5500.00, Requested: 10000.00', createdAt: '2026-11-18T00:19:40Z', createdBy: 1, ipAddress: '127.0.0.1' }
      ],
      auditLog: [
        { id: 1, transactionId: 1, action: 'INSERT', oldValues: null, newValues: '{"type": "DEPOSIT", "amount": 1000.0, "account_id": 1}', performedBy: 1, performedAt: '2026-11-18T00:19:40Z', ipAddress: '127.0.0.1' },
        { id: 2, transactionId: 2, action: 'INSERT', oldValues: null, newValues: '{"type": "WITHDRAW", "amount": 500.0, "account_id": 1}', performedBy: 1, performedAt: '2026-11-18T00:19:40Z', ipAddress: '127.0.0.1' }
      ],
      fraudFlags: [
        { id: 1, transactionId: 1, thresholdAmount: 1000.00, reviewed: false, reviewedBy: null, reviewedAt: null, notes: null, createdAt: '2026-11-18T00:19:40Z' }
      ],
      dailyReports: [
        { id: 1, reportDate: '2026-11-18', totalDeposits: 1000.00, totalWithdrawals: 500.00, totalTransfers: 200.00, transactionCount: 4, generatedBy: 3, generatedAt: '2026-11-18T00:19:40Z', reportData: null }
      ],
      session: { userId: null, lastSeen: 0 }
    };
  }

  // ---- tiny persistence ----------------------------------------------------
  function load() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt state */ }
    return seed();
  }
  var db = load();
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {} }

  // ---- helpers -------------------------------------------------------------
  function nowIso() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  function utcDay(iso) { return (iso || '').slice(0, 10); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function accountNo(id) { var a = db.accounts.filter(function (x) { return x.id === id; })[0]; return a ? a.accountNumber : null; }
  function byNumber(n) { return db.accounts.filter(function (a) { return a.accountNumber === n; })[0]; }

  function txView(t) {
    return {
      id: t.id, type: t.type, status: t.status, amount: t.amount,
      accountNumber: accountNo(t.accountId), description: t.description,
      referenceId: t.referenceId, createdAt: t.createdAt, createdBy: t.createdBy
    };
  }
  function accView(a) {
    return { id: a.id, accountNumber: a.accountNumber, balance: a.balance, currency: a.currency, active: a.active, userId: a.userId };
  }
  function userView(u) {
    return { id: u.id, username: u.username, fullName: u.fullName, email: u.email, role: u.role, active: u.active, locked: u.locked, failedLoginAttempts: u.failedLoginAttempts };
  }

  function respond(status, body) {
    return { status: status, body: body };
  }
  function err(status, message) {
    var names = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 423: 'Locked' };
    return respond(status, { status: status, error: names[status] || 'Error', message: message });
  }

  // ---- session (mirrors AuthInterceptor) -----------------------------------
  function currentUser() {
    var s = db.session;
    if (!s.userId) return null;
    if (Date.now() - s.lastSeen > SESSION_MS) { s.userId = null; save(); return null; }
    s.lastSeen = Date.now(); save();
    var u = db.users.filter(function (x) { return x.id === s.userId; })[0];
    if (!u || !u.active) { s.userId = null; save(); return null; }
    return u;
  }

  var ROLES = {
    'GET /api/accounts/mine': ['CUSTOMER'],
    'GET /api/accounts/search': ['TELLER', 'MANAGER', 'ADMIN'],
    'POST /api/transactions/deposit': ['CUSTOMER', 'TELLER'],
    'POST /api/transactions/withdraw': ['CUSTOMER', 'TELLER'],
    'POST /api/transactions/transfer': ['CUSTOMER', 'TELLER'],
    'GET /api/transactions': ['AUDITOR', 'MANAGER', 'ADMIN'],
    'GET /api/reports/daily': ['MANAGER', 'ADMIN'],
    'POST /api/reports/daily': ['MANAGER'],
    'GET /api/fraud-flags': ['MANAGER', 'AUDITOR'],
    'POST /api/fraud-flags/review': ['MANAGER'],
    'GET /api/audit-log': ['AUDITOR', 'MANAGER'],
    'GET /api/admin/users': ['ADMIN'],
    'POST /api/admin/users': ['ADMIN'],
    'PATCH /api/admin/users': ['ADMIN'],
    'POST /api/admin/accounts': ['ADMIN']
  };

  function allow(method, path, user) {
    var key = method + ' ' + path;
    if (key.indexOf('POST /api/fraud-flags/') === 0 && /\/review$/.test(path)) key = 'POST /api/fraud-flags/review';
    var roles = ROLES[key];
    if (!roles) return null;   // no rule for this route = any logged-in role may call it
    if (roles.indexOf(user.role) === -1) {
      return 'Your role (' + user.role + ') is not allowed to do this';
    }
    return null;
  }

  // ---- money validation (FR-04 / FR-05 / NFR-11) ---------------------------
  function cleanAmount(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return { error: 'Amount is required' };
    var s = String(raw).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) return { error: 'Amount must be a number' };
    var n = Number(s);
    if (!isFinite(n) || n <= 0) return { error: 'Amount must be greater than 0' };
    var dec = s.split('.')[1];
    if (dec && dec.length > 2) return { error: 'Amount can have at most 2 decimal places' };
    if (n > 9999999999999.99) return { error: 'Amount is too large' };
    return { value: round2(n) };
  }
  function cleanNumber(n) {
    if (!n || !/^[A-Za-z0-9-]{5,30}$/.test(String(n).trim())) return { error: 'Invalid account number format' };
    return { value: String(n).trim() };
  }

  function recordTransaction(acc, amount, type, description, user, referenceId, status, failureReason) {
    var t = {
      id: ++db.seq.tx, accountId: acc.id, amount: amount, type: type,
      status: status || 'COMPLETED', description: description, referenceId: referenceId || null,
      failureReason: failureReason || null, createdAt: nowIso(), createdBy: user.id, ipAddress: '127.0.0.1'
    };
    db.transactions.push(t);
    if (t.status === 'COMPLETED') {
      db.auditLog.push({
        id: ++db.seq.audit, transactionId: t.id, action: 'INSERT', oldValues: null,
        newValues: JSON.stringify({ type: type, amount: amount, account_id: acc.id, status: t.status }),
        performedBy: user.id, performedAt: nowIso(), ipAddress: '127.0.0.1'
      });
      if (type !== 'TRANSFER_IN' && amount >= FRAUD_THRESHOLD) {
        db.fraudFlags.push({
          id: ++db.seq.flag, transactionId: t.id, thresholdAmount: FRAUD_THRESHOLD,
          reviewed: false, reviewedBy: null, reviewedAt: null, notes: null, createdAt: nowIso()
        });
      }
    }
    return t;
  }

  // ---- the API -------------------------------------------------------------
  function handle(method, path, query, body) {
    // ---- auth
    if (method === 'POST' && path === '/api/auth/login') {
      var uname = (body && body.username || '').trim();
      var pass = (body && body.password) || '';
      var u = db.users.filter(function (x) { return x.username === uname; })[0];
      if (!u) return err(401, 'Invalid username or password');
      if (u.locked) {
        if (u.lockUntil && new Date(u.lockUntil).getTime() <= Date.now()) {
          u.locked = false; u.failedLoginAttempts = 0; u.lockUntil = null;
        } else {
          return err(423, 'Account is locked after too many failed attempts. Contact an administrator.');
        }
      }
      if (!u.active) return err(401, 'Invalid username or password');
      if (u.password !== pass) {
        u.failedLoginAttempts = (u.failedLoginAttempts || 0) + 1;
        if (u.failedLoginAttempts >= MAX_FAILED) {
          u.locked = true;
          u.lockUntil = new Date(Date.now() + LOCK_MS).toISOString();
          save();
          return err(423, 'Account is locked after ' + MAX_FAILED + ' failed attempts.');
        }
        save();
        return err(401, 'Invalid username or password');
      }
      u.failedLoginAttempts = 0; u.locked = false; u.lockUntil = null;
      db.session = { userId: u.id, lastSeen: Date.now() };
      save();
      return respond(200, userView(u));
    }

    if (method === 'POST' && path === '/api/auth/register') {
      var regName = body && typeof body.username === 'string' ? body.username.trim() : '';
      var regPass = body && typeof body.password === 'string' ? body.password : '';
      var regFull = body && typeof body.fullName === 'string' ? body.fullName.trim() : '';
      var regEmail = body && typeof body.email === 'string' ? body.email : '';
      if (!/^[A-Za-z0-9_.-]{3,50}$/.test(regName)) return err(400, 'Username must be 3-50 characters: letters, digits, _ . -');
      if (regPass.length < 8 || regPass.length > 72) return err(400, 'Password must be 8-72 characters');
      if (!regFull || regFull.length > 200) return err(400, 'Full name is required (max 200 characters)');
      if (regEmail && (regEmail.length > 255 || !/^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(regEmail))) return err(400, 'Invalid email');
      if (db.users.some(function (x) { return x.username === regName; })) return err(409, 'Username already exists');
      var regNumber;
      do {
        regNumber = 'EGP-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0') + '-' +
                    String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
      } while (byNumber(regNumber));
      var newUser = { id: ++db.seq.user, username: regName, password: regPass, fullName: regFull,
        email: regEmail || null, role: 'CUSTOMER', active: true, locked: false, failedLoginAttempts: 0, lockUntil: null };
      var newAccount = { id: ++db.seq.account, accountNumber: regNumber, userId: newUser.id,
        balance: 0.00, currency: 'EGP', active: true };
      db.users.push(newUser); db.accounts.push(newAccount);
      db.session = { userId: newUser.id, lastSeen: Date.now() };
      save();
      return respond(200, userView(newUser));
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      db.session = { userId: null, lastSeen: 0 }; save();
      return respond(200, { message: 'Logged out' });
    }

    // everything below needs a live session
    var user = currentUser();
    if (!user) return err(401, 'Not logged in or session expired');

    if (method === 'GET' && path === '/api/auth/me') return respond(200, userView(user));

    var denied = allow(method, path, user);
    if (denied) return err(403, denied);

    // ---- FR-03
    if (method === 'GET' && path === '/api/accounts/mine') {
      return respond(200, db.accounts.filter(function (a) { return a.userId === user.id; })
        .sort(function (x, y) { return x.id - y.id; }).map(accView));
    }

    // ---- FR-10
    if (method === 'GET' && path === '/api/accounts/search') {
      var q = (query.number || '').trim();
      var found = byNumber(q);
      return found ? respond(200, accView(found)) : err(404, 'Account not found');
    }

    // ---- FR-08 history
    var mHist = path.match(/^\/api\/accounts\/([^/]+)\/transactions$/);
    if (method === 'GET' && mHist) {
      var accH = byNumber(decodeURIComponent(mHist[1]));
      if (!accH) return err(404, 'Account not found');
      if (user.role === 'CUSTOMER' && accH.userId !== user.id) return err(403, 'You can only view your own accounts');
      var from = query.from || null, to = query.to || null;
      if (from && to && to < from) return err(400, "'to' date is before 'from' date");
      var rows = db.transactions.filter(function (t) {
        if (t.accountId !== accH.id) return false;
        var d = utcDay(t.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      }).sort(function (a, b) { return (b.createdAt + b.id).localeCompare(a.createdAt + a.id); });
      return respond(200, rows.map(txView));
    }

    // ---- FR-03 single balance
    var mAcc = path.match(/^\/api\/accounts\/([^/]+)$/);
    if (method === 'GET' && mAcc) {
      var acc1 = byNumber(decodeURIComponent(mAcc[1]));
      if (!acc1) return err(404, 'Account not found');
      if (user.role === 'CUSTOMER' && acc1.userId !== user.id) return err(403, 'You can only view your own accounts');
      return respond(200, accView(acc1));
    }

    // ---- FR-04 deposit / FR-05 withdraw
    if (method === 'POST' && (path === '/api/transactions/deposit' || path === '/api/transactions/withdraw')) {
      var isDeposit = path.endsWith('deposit');
      var amtR = cleanAmount(body && body.amount);
      if (amtR.error) return err(400, amtR.error);
      var numR = cleanNumber(body && body.accountNumber);
      if (numR.error) return err(400, numR.error);
      var acc2 = byNumber(numR.value);
      if (!acc2) return err(404, 'Account not found');
      if (user.role === 'CUSTOMER' && acc2.userId !== user.id) return err(403, 'You can only use your own accounts');
      if (!acc2.active) return err(400, 'Account is not active');
      var amt = amtR.value;
      if (isDeposit) {
        acc2.balance = round2(acc2.balance + amt);
        var dt = recordTransaction(acc2, amt, 'DEPOSIT', (body.description || '').trim() || 'Deposit', user);
        save();
        return respond(200, { transaction: txView(dt) });
      }
      if (acc2.balance < amt) {
        recordTransaction(acc2, amt, 'WITHDRAW', (body.description || '').trim() || 'Withdrawal', user, null, 'FAILED', 'Insufficient funds');
        save();
        return err(400, 'Insufficient funds');
      }
      acc2.balance = round2(acc2.balance - amt);
      var wt = recordTransaction(acc2, amt, 'WITHDRAW', (body.description || '').trim() || 'Withdrawal', user);
      save();
      return respond(200, { transaction: txView(wt) });
    }

    // ---- FR-06 atomic transfer
    if (method === 'POST' && path === '/api/transactions/transfer') {
      var amtR2 = cleanAmount(body && body.amount);
      if (amtR2.error) return err(400, amtR2.error);
      var fR = cleanNumber(body && body.fromAccountNumber);
      if (fR.error) return err(400, fR.error);
      var tR = cleanNumber(body && body.toAccountNumber);
      if (tR.error) return err(400, tR.error);
      if (fR.value.toLowerCase() === tR.value.toLowerCase()) return err(400, 'Cannot transfer to the same account');
      var src = byNumber(fR.value);
      if (!src) return err(404, 'Source account not found');
      var dst = byNumber(tR.value);
      if (!dst) return err(400, 'Invalid recipient account');
      if (user.role === 'CUSTOMER' && src.userId !== user.id) return err(403, 'You can only use your own accounts');
      if (!src.active || !dst.active) return err(400, 'Account is not active');
      if (src.currency !== dst.currency) return err(400, 'Currency mismatch');
      if (src.balance < amtR2.value) return err(400, 'Insufficient funds');

      // one "transaction": either both legs happen or nothing does (NFR-05)
      var a2 = amtR2.value;
      var srcBefore = src.balance, dstBefore = dst.balance;
      var auditBefore = db.auditLog.length, txBefore = db.transactions.length, flagBefore = db.fraudFlags.length;
      try {
        src.balance = round2(src.balance - a2);
        dst.balance = round2(dst.balance + a2);
        var note = (body.description || '').trim();
        var out = recordTransaction(src, a2, 'TRANSFER_OUT', 'Transfer to ' + dst.accountNumber + (note ? ': ' + note : ''), user);
        var inn = recordTransaction(dst, a2, 'TRANSFER_IN', 'Transfer from ' + src.accountNumber + (note ? ': ' + note : ''), user, out.id);
        out.referenceId = inn.id;
        if (src.balance < 0) throw new Error('negative balance');
      } catch (e) {
        // roll back exactly like the DB transaction would
        src.balance = srcBefore; dst.balance = dstBefore;
        db.transactions.length = txBefore;
        db.auditLog.length = auditBefore;
        db.fraudFlags.length = flagBefore;
        save();
        return err(500, 'Unexpected server error. The operation was rolled back.');
      }
      save();
      return respond(200, {
        debit: txView(out), credit: txView(inn), sourceBalance: src.balance
      });
    }

    // ---- US-11 all transactions
    if (method === 'GET' && path === '/api/transactions') {
      var f2 = query.from || null, t2 = query.to || null;
      if (f2 && t2 && t2 < f2) return err(400, "'to' date is before 'from' date");
      var all = db.transactions.filter(function (t) {
        var d = utcDay(t.createdAt);
        if (f2 && d < f2) return false;
        if (t2 && d > t2) return false;
        return true;
      }).sort(function (a, b) { return (b.createdAt + b.id).localeCompare(a.createdAt + a.id); });
      return respond(200, all.map(txView));
    }

    // ---- FR-11 daily report
    if ((method === 'GET' || method === 'POST') && path === '/api/reports/daily') {
      var day = query.date || utcDay(nowIso());
      if (method === 'POST' && day > utcDay(nowIso())) return err(400, 'Cannot generate a report for a future date');
      var dayTx = db.transactions.filter(function (t) { return utcDay(t.createdAt) === day; });
      var completed = dayTx.filter(function (t) { return t.status === 'COMPLETED'; });
      function sum(type) {
        return round2(completed.filter(function (t) { return t.type === type; })
          .reduce(function (s, t) { return s + t.amount; }, 0));
      }
      var figures = {
        reportDate: day,
        totalDeposits: sum('DEPOSIT'),
        totalWithdrawals: sum('WITHDRAW'),
        totalTransfers: sum('TRANSFER_OUT'),
        transactionCount: completed.length
      };
      if (method === 'GET') {
        var saved = db.dailyReports.filter(function (r) { return r.reportDate === day; })[0];
        if (saved) figures.savedReport = saved;
        return respond(200, figures);
      }
      var row = db.dailyReports.filter(function (r) { return r.reportDate === day; })[0];
      if (!row) { row = { id: ++db.seq.report, reportDate: day }; db.dailyReports.push(row); }
      row.totalDeposits = figures.totalDeposits;
      row.totalWithdrawals = figures.totalWithdrawals;
      row.totalTransfers = figures.totalTransfers;
      row.transactionCount = figures.transactionCount;
      row.generatedBy = user.id;
      row.generatedAt = nowIso();
      save();
      return respond(200, row);
    }

    // ---- FR-12 fraud flags
    if (method === 'GET' && path === '/api/fraud-flags') {
      var list = db.fraudFlags.slice().sort(function (a, b) { return b.id - a.id; }).map(function (f) {
        var t = db.transactions.filter(function (x) { return x.id === f.transactionId; })[0];
        return {
          id: f.id, transactionId: f.transactionId, thresholdAmount: f.thresholdAmount,
          reviewed: f.reviewed, reviewedBy: f.reviewedBy, reviewedAt: f.reviewedAt, notes: f.notes,
          createdAt: f.createdAt, amount: t ? t.amount : null, type: t ? t.type : null,
          accountNumber: t ? accountNo(t.accountId) : null
        };
      });
      return respond(200, list);
    }
    var mFlag = path.match(/^\/api\/fraud-flags\/(\d+)\/review$/);
    if (method === 'POST' && mFlag) {
      var flag = db.fraudFlags.filter(function (f) { return f.id === Number(mFlag[1]); })[0];
      if (!flag) return err(404, 'Flag not found');
      flag.reviewed = true; flag.reviewedBy = user.id; flag.reviewedAt = nowIso();
      flag.notes = (body && body.notes || '').trim() || null;
      save();
      return respond(200, { id: flag.id, reviewed: true });
    }

    // ---- US-11 audit log (read only)
    if (method === 'GET' && path === '/api/audit-log') {
      return respond(200, db.auditLog.slice().sort(function (a, b) { return b.id - a.id; }));
    }

    // ---- US-10 admin
    if (method === 'GET' && path === '/api/admin/users') {
      return respond(200, db.users.slice().sort(function (a, b) { return a.id - b.id; }).map(userView));
    }
    if (method === 'POST' && path === '/api/admin/users') {
      var uname2 = (body && body.username || '').trim();
      if (!/^[A-Za-z0-9_.-]{3,50}$/.test(uname2)) return err(400, 'Username must be 3-50 characters: letters, digits, _ . -');
      if (!body.password || body.password.length < 8 || body.password.length > 72) return err(400, 'Password must be 8-72 characters');
      if (!body.fullName || !body.fullName.trim()) return err(400, 'Full name is required (max 200 characters)');
      if (db.users.some(function (u2) { return u2.username === uname2; })) return err(409, 'Username already exists');
      var nu = {
        id: ++db.seq.user, username: uname2, password: body.password, fullName: body.fullName.trim(),
        email: body.email || null, role: body.role || 'CUSTOMER', active: true, locked: false,
        failedLoginAttempts: 0, lockUntil: null
      };
      db.users.push(nu); save();
      return respond(200, userView(nu));
    }
    var mUser = path.match(/^\/api\/admin\/users\/(\d+)$/);
    if (method === 'PATCH' && mUser) {
      var target = db.users.filter(function (u3) { return u3.id === Number(mUser[1]); })[0];
      if (!target) return err(404, 'User not found');
      if (target.id === user.id && ((body.active === false) || (body.role && body.role !== user.role))) {
        return err(400, 'You cannot disable or change the role of your own account');
      }
      if (body.role) target.role = body.role;
      if (typeof body.active === 'boolean') target.active = body.active;
      if (body.unlock === true) { target.locked = false; target.failedLoginAttempts = 0; target.lockUntil = null; }
      save();
      return respond(200, userView(target));
    }
    if (method === 'POST' && path === '/api/admin/accounts') {
      var owner = db.users.filter(function (u4) { return u4.id === Number(body && body.userId); })[0];
      if (!owner) return err(404, 'User not found');
      if (owner.role !== 'CUSTOMER') return err(400, 'Accounts can only be opened for CUSTOMER users');
      var number;
      do {
        number = 'EGP-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0') + '-' +
                 String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
      } while (byNumber(number));
      var na = { id: ++db.seq.account, accountNumber: number, userId: owner.id, balance: 0.00, currency: 'EGP', active: true };
      db.accounts.push(na); save();
      return respond(200, accView(na));
    }

    return err(404, 'Not found');
  }

  // ---- fetch shim ----------------------------------------------------------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var same = url.indexOf('/api/') === 0 ||
               (function () { try { return new URL(url, location.href).origin === location.origin && new URL(url, location.href).pathname.indexOf('/api/') === 0; } catch (e) { return false; } })();

    if (!url || !same) {
      if (realFetch) return realFetch(input, init);
      return Promise.reject(new Error('network unavailable'));
    }

    var u = new URL(url, location.href);
    var query = {};
    u.searchParams.forEach(function (v, k) { query[k] = v; });
    var body = null;
    if (init && init.body) { try { body = JSON.parse(init.body); } catch (e) { body = null; } }

    return new Promise(function (resolve) {
      setTimeout(function () {
        var res;
        try { res = handle(method, u.pathname, query, body); }
        catch (e) { res = err(500, 'Unexpected server error. The operation was rolled back.'); }
        var payload = JSON.stringify(res.body);
        resolve({
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          json: function () { return Promise.resolve(JSON.parse(payload)); },
          text: function () { return Promise.resolve(payload); }
        });
      }, 60);
    });
  };

  // ---- reset helper (used by the banner) -----------------------------------
  window.__bankDemoReset = function () {
    sessionStorage.removeItem(STORE_KEY);
    location.reload();
  };

  // ---- visible banner so nobody confuses this with the real backend --------
  function banner() {
    var bar = document.createElement('div');
    bar.setAttribute('data-testid', 'demo-banner');
    bar.style.cssText = 'background:#7a4d00;color:#ffe9b8;font:13px system-ui,sans-serif;padding:8px 14px;text-align:center';
    bar.innerHTML = 'ONLINE DEMO — runs entirely in your browser (in-memory mock of the REST API, same seed data). ' +
      'The real project is Java + MySQL and runs locally. ' +
      '<a href="#" style="color:#ffd166;text-decoration:underline" id="bankdemo-reset">Reset demo data</a>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector('#bankdemo-reset').addEventListener('click', function (e) {
      e.preventDefault(); window.__bankDemoReset();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', banner);
  } else { banner(); }

  console.log('[bank-demo] online demo: mock API active, seed data loaded');
})();
