#!/usr/bin/env python3
"""End-to-end API checks against a running instance (stdlib only).
Usage: BASE=http://localhost:8090 python3 tests/api_smoke_test.py
Needs the sample data loaded and db/demo-passwords.sql applied. It changes balances (adds rows); reload the sample dump to reset."""
import json, os, sys, threading, time, urllib.request, urllib.error, http.cookiejar
from decimal import Decimal

BASE = os.environ.get("BASE", "http://localhost:8080")
PW = os.environ.get("DEMO_PASSWORD", "Demo@1234")
results = []

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
        try:
            r = self.op.open(req); return r.status, json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            raw = e.read()
            try: return e.code, json.loads(raw)
            except Exception: return e.code, raw
    def login(self, u, p=PW): return self.call("POST", "/api/auth/login", {"username": u, "password": p})

def check(name, cond, detail=""):
    results.append(cond)
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if not cond else ""))

def bal(c, num):
    return Decimal(str(c.call("GET", "/api/accounts/" + num)[1]["balance"]))

A1, A2, A3 = "EGP-001-1234567890", "EGP-002-0987654321", "EGP-003-5555555555"
cust = Client(); teller = Client(); mgr = Client(); adm = Client(); aud = Client()

# FR-01 login
s, _ = cust.login("customer1"); check("FR-01 valid login", s == 200)
s, b = Client().login("customer1", "wrong"); check("FR-01 invalid login rejected (401, generic msg)", s == 401 and "Invalid" in b["message"])
s, _ = Client().call("GET", "/api/accounts/mine"); check("Unauthenticated API call rejected", s == 401)
for c, u in ((teller, "teller1"), (mgr, "manager1"), (adm, "admin1"), (aud, "auditor1")): c.login(u)

# FR-03 balance matches DB-backed value
s, accts = cust.call("GET", "/api/accounts/mine"); check("FR-03 balances listed", s == 200 and len(accts) == 2)

# FR-04 deposit
b0 = bal(cust, A1)
s, r = cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "100.50"})
check("FR-04 deposit ok", s == 200 and bal(cust, A1) == b0 + Decimal("100.50"))
for bad in (0, -5, "abc", None, "1.234"):
    s, _ = cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": bad})
    check("FR-04 deposit rejects amount %r" % (bad,), s == 400)
check("FR-04 balance unchanged after rejected deposits", bal(cust, A1) == b0 + Decimal("100.50"))

# FR-05 withdraw
b1 = bal(cust, A1)
s, _ = cust.call("POST", "/api/transactions/withdraw", {"accountNumber": A1, "amount": "10.00"}); check("FR-05 withdraw ok", s == 200 and bal(cust, A1) == b1 - 10)
s, r = cust.call("POST", "/api/transactions/withdraw", {"accountNumber": A1, "amount": "99999999"}); check("FR-05 overdraft rejected", s == 400 and "Insufficient" in r["message"])
b2 = bal(cust, A1)
s, _ = cust.call("POST", "/api/transactions/withdraw", {"accountNumber": A1, "amount": str(b2)}); check("FR-05 withdraw exact balance allowed -> 0", s == 200 and bal(cust, A1) == 0)
cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "500"})

# FR-06 transfer
a1, a2 = bal(cust, A1), bal(cust, A2)
s, r = cust.call("POST", "/api/transactions/transfer", {"fromAccountNumber": A1, "toAccountNumber": A2, "amount": "25.25"})
check("FR-06 transfer updates both accounts", s == 200 and bal(cust, A1) == a1 - Decimal("25.25") and bal(cust, A2) == a2 + Decimal("25.25"))
check("FR-07 transfer rows linked by reference_id", r["debit"]["referenceId"] == r["credit"]["id"] and r["credit"]["referenceId"] == r["debit"]["id"])
s, _ = cust.call("POST", "/api/transactions/transfer", {"fromAccountNumber": A1, "toAccountNumber": "EGP-999-0000000000", "amount": "1"}); check("FR-06 invalid recipient rejected", s == 400)
s, _ = cust.call("POST", "/api/transactions/transfer", {"fromAccountNumber": A1, "toAccountNumber": A1, "amount": "1"}); check("FR-06 same-account transfer rejected", s == 400)
s, _ = cust.call("POST", "/api/transactions/transfer", {"fromAccountNumber": A1, "toAccountNumber": A2, "amount": "99999999"}); check("FR-06 insufficient funds transfer rejected", s == 400)
s, _ = cust.call("POST", "/api/transactions/transfer", {"fromAccountNumber": A3, "toAccountNumber": A1, "amount": "1"}); check("Customer cannot transfer from someone else's account (403)", s == 403)
check("Balances unchanged after rejected transfers", bal(cust, A1) == a1 - Decimal("25.25") and bal(cust, A2) == a2 + Decimal("25.25"))

# FR-07/FR-08 history
s, h = cust.call("GET", "/api/accounts/%s/transactions" % A1)
ids = [t["id"] for t in h]; check("FR-08 history newest first", s == 200 and ids == sorted(ids, reverse=True))
s, h = cust.call("GET", "/api/accounts/%s/transactions?from=2026-11-18&to=2026-11-18" % A1)
check("FR-08 date filter (only 2026-11-18 rows)", s == 200 and len(h) > 0 and all(t["createdAt"].startswith("2026-11-18") for t in h))
s, _ = cust.call("GET", "/api/accounts/%s/transactions?from=2026-12-01&to=2026-11-01" % A1); check("FR-08 reversed dates rejected", s == 400)
s, _ = cust.call("GET", "/api/accounts/%s/transactions?from=notadate" % A1); check("FR-08 malformed date -> 400", s == 400)
s, _ = cust.call("GET", "/api/accounts/%s/transactions" % A3); check("Customer cannot read other customer's history (403)", s == 403)

# FR-09 roles
check("FR-09 customer blocked from admin API", cust.call("GET", "/api/admin/users")[0] == 403)
check("FR-09 customer blocked from audit log", cust.call("GET", "/api/audit-log")[0] == 403)
check("FR-09 teller blocked from reports", teller.call("GET", "/api/reports/daily")[0] == 403)
check("FR-09 manager cannot deposit", mgr.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "1"})[0] == 403)

# FR-10 / US-08 teller
s, a = teller.call("GET", "/api/accounts/search?number=" + A3); check("FR-10 teller finds account", s == 200 and a["accountNumber"] == A3)
check("FR-10 unknown account -> 404", teller.call("GET", "/api/accounts/search?number=EGP-000-0000000")[0] == 404)
check("FR-10 customer cannot use search", cust.call("GET", "/api/accounts/search?number=" + A3)[0] == 403)
t0 = bal(teller, A3)
s, _ = teller.call("POST", "/api/transactions/deposit", {"accountNumber": A3, "amount": "40"}); check("US-08 teller deposit for customer", s == 200 and bal(teller, A3) == t0 + 40)
s, _ = teller.call("POST", "/api/transactions/withdraw", {"accountNumber": A3, "amount": "15"}); check("US-08 teller withdraw for customer", s == 200 and bal(teller, A3) == t0 + 25)

# FR-11 report, FR-12 fraud
today = time.strftime("%Y-%m-%d", time.gmtime())
s, rep = mgr.call("GET", "/api/reports/daily?date=" + today); check("FR-11 daily report live", s == 200 and rep["transactionCount"] > 0)
s, rep2 = mgr.call("POST", "/api/reports/daily?date=" + today); check("FR-11 report saved", s == 200 and rep2["transactionCount"] == rep["transactionCount"])
n_before = len(mgr.call("GET", "/api/fraud-flags")[1])
cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "1000.00"})
flags = mgr.call("GET", "/api/fraud-flags")[1]
check("FR-12 deposit >= limit flagged", len(flags) == n_before + 1 and flags[0]["amount"] == 1000.0)
cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "999.99"})
check("FR-12 amount below limit not flagged", len(mgr.call("GET", "/api/fraud-flags")[1]) == n_before + 1)
s, _ = mgr.call("POST", "/api/fraud-flags/%d/review" % flags[0]["id"], {"notes": "checked: classroom test"}); check("FR-12 manager reviews flag", s == 200)

# US-11 / NFR-10 immutability at API level
s, a = aud.call("GET", "/api/audit-log"); check("US-11 auditor reads audit log", s == 200 and len(a) >= 3)
for m, p in (("DELETE", "/api/audit-log/1"), ("PUT", "/api/audit-log/1"), ("DELETE", "/api/transactions/1"), ("PUT", "/api/transactions/1"), ("PATCH", "/api/transactions/1")):
    s, _ = adm.call(m, p, {}); check("NFR-10 no %s %s (4xx)" % (m, p), 400 <= s < 500)

# US-10 admin
uname = "tmp_" + str(int(time.time()) % 100000)
s, u = adm.call("POST", "/api/admin/users", {"username": uname, "password": "Sup3rSecret!", "fullName": "Temp <b>User</b>", "email": "t@example.com", "role": "CUSTOMER"})
check("US-10 admin creates user (hash not returned)", s == 200 and "password" not in json.dumps(u).lower())
check("US-10 duplicate username -> 409", adm.call("POST", "/api/admin/users", {"username": uname, "password": "Sup3rSecret!", "fullName": "x", "role": "CUSTOMER"})[0] == 409)
check("US-10 weak password rejected", adm.call("POST", "/api/admin/users", {"username": uname + "x", "password": "123", "fullName": "x", "role": "CUSTOMER"})[0] == 400)
tc = Client(); check("New user can log in", tc.login(uname, "Sup3rSecret!")[0] == 200)
s, _ = adm.call("PATCH", "/api/admin/users/%d" % u["id"], {"role": "TELLER"}); check("US-10 assign role", s == 200 and tc.call("GET", "/api/admin/users")[0] == 403 and tc.call("GET", "/api/accounts/search?number=" + A1)[0] == 200)
s, _ = adm.call("PATCH", "/api/admin/users/%d" % u["id"], {"active": False}); check("US-10 disable user: existing session dead immediately", tc.call("GET", "/api/auth/me")[0] == 401)
check("US-10 disabled user cannot log in", Client().login(uname, "Sup3rSecret!")[0] == 401)
check("Admin cannot disable self", adm.call("PATCH", "/api/admin/users/4", {"active": False})[0] == 400)

# FR-02 lockout (uses the temp user)
adm.call("PATCH", "/api/admin/users/%d" % u["id"], {"active": True})
lc = Client(); codes = [lc.login(uname, "bad%d" % i)[0] for i in range(3)]
check("FR-02 attempts 1-2 -> 401, attempt 3 -> 423 locked", codes == [401, 401, 423], codes)
check("FR-02 correct password rejected while locked", Client().login(uname, "Sup3rSecret!")[0] == 423)
adm.call("PATCH", "/api/admin/users/%d" % u["id"], {"unlock": True}); check("FR-02 admin unlock restores login", Client().login(uname, "Sup3rSecret!")[0] == 200)
Client().login(uname, "bad"); Client().login(uname, "bad"); Client().login(uname, "Sup3rSecret!")
check("FR-02 counter resets after a successful login (2 bad + good + bad != lock)", Client().login(uname, "bad")[0] == 401)

# NFR-03 injection / XSS
s, _ = Client().login("customer1' OR '1'='1", "x"); check("NFR-03 SQL injection in username -> 401", s == 401)
s, _ = teller.call("GET", "/api/accounts/search?number=x%27%20OR%20%271%27%3D%271"); check("NFR-03 SQLi in account number -> 4xx", 400 <= s < 500)
s, r = cust.call("POST", "/api/transactions/deposit", {"accountNumber": A1, "amount": "1", "description": "<script>alert(1)</script>"})
check("NFR-03 script text stored as inert data and returned as JSON string", s == 200 and r["transaction"]["description"] == "<script>alert(1)</script>")

# NFR-01 / NFR-05 concurrency: 50 parallel mixed transfers keep totals consistent
total_before = bal(cust, A1) + bal(cust, A2)
codes, lat = [], []
clients = []
for i in range(50):
    c = Client(); c.login("customer1"); clients.append(c)
def worker(i):
    c = clients[i]; t = time.time()
    frm, to = (A1, A2) if i % 2 == 0 else (A2, A1)
    s, _ = c.call("POST", "/api/transactions/transfer", {"fromAccountNumber": frm, "toAccountNumber": to, "amount": "1.00"})
    lat.append(time.time() - t); codes.append(s)
ts = [threading.Thread(target=worker, args=(i,)) for i in range(50)]
[t.start() for t in ts]; [t.join() for t in ts]
check("NFR-05 50 concurrent opposite transfers: all succeed, no deadlock", codes.count(200) == 50, sorted(set(codes)))
check("NFR-05 money conserved (sum of both accounts unchanged)", bal(cust, A1) + bal(cust, A2) == total_before)
check("NFR-01 50 concurrent transfers all under 2 s (max %.2fs, login excluded)" % max(lat), max(lat) < 2.0)

# NFR-02 : password hashes not exposed
check("NFR-02 no password hash in user list", "$2a$" not in json.dumps(adm.call("GET", "/api/admin/users")[1]))

# logout
cust.call("POST", "/api/auth/logout"); check("Logout kills session", cust.call("GET", "/api/auth/me")[0] == 401)

print("\n%d/%d checks passed" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
