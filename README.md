# Classroom Bank Demo — full stack project

A small **banking transaction system** built for a software-testing course project.
Frontend = **HTML + CSS + vanilla JavaScript**. Backend = **Java (Spring Boot)**.
Database = the `bank_system` schema supplied with the course material (6 tables).

> ⚠️ **Teaching demo. All names, accounts and balances are fictional. No real bank, no real money.**

---

## Contents

| Path | What it is |
|---|---|
| `src/main/resources/static/` | the frontend: `index.html`, `style.css`, `app.js` (fetch, no framework) |
| `src/main/java/...` | the backend: Spring Web controllers, JPA entities, services |
| `db/bank_system_sample.sql` | the MySQL schema + sample rows, exactly as supplied |
| `db/h2/bank_system_h2.sql` | the same schema in H2 dialect, used for zero-install runs |
| `api/postman_collection.json` | 39 requests / 59 assertions, one folder per requirement |
| `docs/traceability-matrix.xlsx` | requirement → code → test mapping |
| `docs/INTEGRATION.md` | how frontend ↔ API ↔ schema connect, with real output |
| `windows/` | one-click Windows launcher (`run.bat`) |
| `Dockerfile` | container image used by the hosted demo |
| `vercel-demo/` | static preview of the UI only (no backend) — see its own README |

## Run it locally (fastest way — no MySQL, no Maven)

Requirements: **Java 17 or newer**. That's all.

```bash
java -jar bank-demo.jar        # or: mvn spring-boot:run
```

Open <http://localhost:8080>. The database is an embedded H2 file created in `./data/`,
so everything you do is still there after a restart.

**Windows:** double-click `windows/run.bat`.

## Run it against MySQL (as supplied)

```bash
mysql -u root -p < db/bank_system_sample.sql
mysql -u root -p < db/demo-passwords.sql        # sets the classroom password
export DB_URL='jdbc:mysql://localhost:3306/bank_system?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
export DB_USERNAME=root
export DB_PASSWORD=your_password
mvn spring-boot:run
```
On this path Hibernate runs with `ddl-auto=validate`, so it will **not** alter your schema.

## Run it in Docker

```bash
docker build -t bank-demo .
docker run -p 8080:8080 -v bankdata:/app/data bank-demo
```
`-v bankdata:/app/data` keeps the H2 file outside the container, so data survives restarts.

## Sample users

Password for all five: **`Demo@1234`**

| Username | Role | Can do |
|---|---|---|
| `customer1` | CUSTOMER | own balances, deposit, withdraw, transfer, history |
| `teller1` | TELLER | find an account, deposit/withdraw for a customer |
| `manager1` | MANAGER | daily reports, fraud flags, all transactions, audit log |
| `admin1` | ADMIN | create/disable users, change roles, open accounts, daily report |
| `auditor1` | AUDITOR | audit log, all transactions, fraud flags (read only) |

## Creating accounts

There are **two** ways, and both write real rows to the database:

1. **Self sign-up** — on the home page, the *Create an account* card.
   Anyone can do it; the new user is always a `CUSTOMER` and gets one account at `0.00 EGP`
   automatically, then is logged in straight away.
   `POST /api/auth/register {username, password, fullName, email}`
2. **Administrator** — log in as `admin1`, tab **Users** → *Create user* with any role,
   then tab **Open account** to give that customer an account.
   `POST /api/admin/users`, then `POST /api/admin/accounts {userId}`

Staff roles (TELLER / MANAGER / ADMIN / AUDITOR) can only be granted by an administrator —
self sign-up always produces a CUSTOMER, even if the request asks for another role.

## Tests

The project has no `src/test` unit tests; testing is done through the API and the UI,
which is what a course on software testing expects:

```bash
# 1) Postman collection — 39 requests, 59 assertions (needs newman or the Postman app)
npx newman run api/postman_collection.json --env-var baseUrl=http://localhost:8080

# 2) API smoke test — plain python3, no dependencies
BASE=http://localhost:8080 python3 tests/api_smoke_test.py

# 3) Browser end-to-end test — headless Chrome via puppeteer-core
cd tests && npm i puppeteer-core && node ui_e2e.js
```

Both scripts expect the sample users to exist, so run `db/demo-passwords.sql` first
(or use the H2 profiles, where the password is already `Demo@1234`).

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` / `SERVER_PORT` | `8080` | HTTP port |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | localhost MySQL | MySQL connection (default profile) |
| `DB_PATH` | `./data/bank_system` | H2 file path (local/prod profiles) |
| `FRAUD_THRESHOLD` | `1000.00` | amount that triggers a fraud flag (FR-12) |
| `LOCK_MINUTES` | `15` | lock duration after 3 failed logins (FR-02) |
| `FAIL_TRANSFER_AFTER_DEBIT` | `false` | teaching switch: force a transfer to crash after the debit, to prove nothing is saved (NFR-05) |

## Requirement coverage (short version)

`FR-01`…`FR-13` are implemented and tested. `FR-14` (self sign-up) is an addition made on request.
`NFR-02` passwords are BCrypt-hashed; `NFR-04` sessions expire after 10 minutes;
`NFR-05` transfers are one database transaction; `NFR-10` there is no endpoint that updates or deletes
a transaction or an audit row; `NFR-11` money is `DECIMAL(19,2)` end to end.
Full mapping: `docs/traceability-matrix.xlsx`.

Known gaps, stated honestly: `NFR-08` (GitHub/Jira) is only satisfied by this repository — no Jira board;
`NFR-09` was verified on Chromium-based browsers, not Firefox; `NFR-07` (usability) was not measured.

## Licence / data

Sample data only. The schema comes from the course material; nothing here is production banking code.
