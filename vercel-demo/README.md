# Online demo on Vercel (browser-only)

This folder is a **self-contained static demo** of the project so it can be hosted on Vercel.

Vercel cannot run the real application: it has no Java runtime (Node/Bun/Python/Rust/Go/Ruby/Wasm/Edge/Container
only) and its filesystem is read-only apart from `/tmp`, so a MySQL database cannot live there.
So this demo keeps the **real frontend** (`app.js`, `index.html`, `style.css` copied from
`../src/main/resources/static/`) and adds `sim/mock-api.js`, which implements the **same REST contract**
in the browser with the **same seed data** as `db/bank_system_sample.sql`.

What behaves the same: login + lock after 3 attempts, balances, deposit, withdraw, atomic transfer
with two linked legs, history with date filter, teller search, daily report, fraud flags, audit log,
role-based access, 10-minute idle session, in-browser session state.
What is different: the data lives in `sessionStorage` (per browser tab, resets with "Reset demo data"),
and there is no MySQL and no Spring Boot.

## Deploy (2 commands)

```bash
cd vercel-demo
npm i -g vercel     # once
vercel login        # once
vercel --prod
```

`vercel.json` sets `outputDirectory: public`, so no build step runs on Vercel.
`npm run build` only re-copies the frontend if you change it locally.

## Run locally

```bash
npm run build
npx serve public      # or: python3 -m http.server 8000 --directory public
```

Seed users (password `Demo@1234`): customer1, teller1, manager1, admin1, auditor1.
