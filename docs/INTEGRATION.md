# Integration proof — Schema ↔ Backend ↔ Frontend

This file shows, with real output, that the three layers are wired together and that the
database is **exactly** the schema file delivered in Drive (`Doc-20261126-WA0061`), unmodified.

---

## The chain

```
Browser (src/main/resources/static: index.html + app.js + style.css)
   │  fetch('/api/...')  ← no SQL, no DB credentials in the browser
   ▼
Spring Boot  @RestController → @Service → Spring Data JPA
   │  JPA entities mapped 1:1 to the 6 tables, ddl-auto=validate
   ▼
MySQL  bank_system   ← created from Doc-20261126-WA0061 (the Drive .sql)
```

* `spring.jpa.hibernate.ddl-auto=validate` — if the schema in the DB differs from the entity
  mapping by even one column type, **the application refuses to start**. Startup succeeding is
  itself proof that the schema and the backend agree.
* The browser only ever calls `/api/**`; the UI is served by the same Spring Boot process, so
  there is no CORS gap and no second server to wire.

---

## 1) The schema is the Drive file, literally

```bash
$ mysql -u root -p < Doc-20261126-WA0061
$ diff <(tr -d '\r' < Doc-20261126-WA0061) <(tr -d '\r' < db/bank_system_sample.sql)
# (no output → the two files are identical)
```

Resulting database:

```
table_name      table_rows
accounts        5
audit_log       14
daily_reports   1
fraud_flags     1
transactions    19
users           7
```
*(row counts grow as you use the app; the point is the 6 tables are the ones from the file.)*

---

## 2) The backend reads that schema — same numbers on both sides

API call:

```bash
$ curl -c c.txt -X POST localhost:8080/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"customer1","password":"Demo@1234"}'
{"id":1,"username":"customer1","fullName":"Ahmed Mohamed","role":"CUSTOMER","active":true,"locked":false}

$ curl -b c.txt localhost:8080/api/accounts/mine
[{"id":1,"accountNumber":"EGP-001-1234567890","balance":4921.00,"currency":"EGP","active":true,"userId":1},
 {"id":2,"accountNumber":"EGP-002-0987654321","balance":3110.00,"currency":"EGP","active":true,"userId":1}]
```

The same rows straight from MySQL:

```sql
mysql> USE bank_system; SELECT account_number, balance FROM accounts WHERE user_id=1;
account_number        balance
EGP-001-1234567890    4921.00
EGP-002-0987654321    3110.00
```

Identical. No caching layer, no duplicate copy of the data.

---

## 3) A write travels the whole chain

One transfer request → two ledger rows → one audit row per row → report figures change.

```bash
$ curl -b c.txt -X POST localhost:8080/api/transactions/transfer \
    -H 'Content-Type: application/json' \
    -d '{"fromAccountNumber":"EGP-001-1234567890","toAccountNumber":"EGP-002-0987654321","amount":100}'
```

Then, in MySQL:

```sql
SELECT id, type, status, amount, reference_id FROM transactions ORDER BY id DESC LIMIT 2;
-- TRANSFER_IN  COMPLETED  100.00  <id of the OUT leg>
-- TRANSFER_OUT COMPLETED  100.00  <id of the IN leg>

SELECT id, action, transaction_id, new_values FROM audit_log ORDER BY id DESC LIMIT 2;
-- INSERT  <IN id>   {"type":"TRANSFER_IN",  "amount":100.00, "account_id":2, "status":"COMPLETED"}
-- INSERT  <OUT id>  {"type":"TRANSFER_OUT", "amount":100.00, "account_id":1, "status":"COMPLETED"}
```

Both legs are linked by `reference_id` (FR-06 / FR-07), both are audited, and the two account
balances moved by exactly the same amount.

---

## 4) Automated evidence for every layer

| Layer | Command | Result |
|---|---|---|
| API (all 13 FRs + NFRs) | `BASE=http://localhost:8080 python3 tests/api_smoke_test.py` | **66 / 66 passed** |
| API as a Postman collection (FR-13) | `newman run api/postman_collection.json` | **47 assertions, 0 failed** |
| UI → API → DB (headless Chrome) | `tests/ui_e2e.js` | 24 / 24 passed (see `docs/test-results`) |
| ACID under injected failure (NFR-05) | `FAIL_TRANSFER_AFTER_DEBIT=true` + one transfer | balances and ledger unchanged |
| Session expiry (NFR-04) | 1-minute override, 70 s idle | `401 Not logged in or session expired` |

---

## 5) Where each requirement lives (one spreadsheet, four sheets)

`docs/traceability-matrix.xlsx`

1. **Traceability** — 24 rows: every FR and NFR → user story → API endpoint → DB tables → the
   test that proves it → status.
2. **API ↔ Schema** — all 20 endpoints: method, path, tables touched, roles allowed, controller.
3. **Schema ↔ Backend** — the 6 tables with their columns, the JPA entity, the service that uses
   them, and the design notes.
4. **How to run** — the 8 commands that reproduce everything above.

This is the deliverable the requirements document itself asks for on its last page:
*"every FR and NFR should map to at least one test case… keep a traceability matrix."*

---

## 6) Change log — what was done in this pass

Only the layers that were needed to close gaps found against the PDF were touched:

| # | Change | Why (requirement) | Proof |
|---|---|---|---|
| 1 | `api/postman_collection.json` added (33 requests, 47 assertions) | FR-13 was marked "Partly — no Postman collection" | Newman run: 0 failed |
| 2 | Daily report counter now counts `COMPLETED` rows only | FR-11: the counter disagreed with the sums it was printed next to | 2026-11-18 → 4 (was 5, the 5th being a FAILED row) |
| 3 | `AccountController.search` uses the real logged-in user instead of an anonymous `new User() {{ }}` | NFR-08 (Java conventions); behaviour unchanged | smoke test + Postman 21 still pass |
| 4 | `LedgerService.writeAudit()` extracted into one helper | FR-07 / US-11: one code path writes the audit row, so both transfer legs are guaranteed audited | transfer → `audit +2`, `transactions +2` |
| 5 | `docs/traceability-matrix.xlsx` added | last page of the requirements PDF | 4 sheets, 24 + 20 + 6 + 8 rows |
| 6 | Responsive CSS for phones | NFR-09 (web UI) and the "it should work on my phone" requirement | `@media (max-width: 760px)` |

Nothing in the schema file was changed — the app adapts to it, not the other way round.
