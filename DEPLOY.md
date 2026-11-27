# Deploying this project (permanent public URL)

The app is a **stateful Java server + database**, so it needs a host that runs a
long-lived container and gives it a disk. Vercel **cannot** do this (no Java runtime,
read-only filesystem); `vercel-demo/` there is a UI-only preview.

Two options below. Both take about 10 minutes and are free.

---

## Option A — Render (recommended, free)

1. Push this repository to GitHub (see "GitHub" at the bottom).
2. Go to <https://render.com> → **New** → **Web Service** → connect the repo.
3. Render reads the `Dockerfile` automatically. Fill in:

   | Field | Value |
   |---|---|
   | Name | `bank-demo` |
   | Language | `Docker` |
   | Instance type | Free |
   | Health check path | `/actuator/health` |

4. Add environment variables:

   | Key | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `DB_PATH` | `/app/data/bank_system` |

5. **Create Web Service**. First build ~3 minutes.
6. Your permanent URL looks like `https://bank-demo-xxxx.onrender.com`.

**Important about data on the free plan:** the disk is ephemeral, so a redeploy or a
restart resets the database to the five sample users. That is fine for a demo.
To keep data permanently, either add a **Render Disk** (paid) mounted at `/app/data`,
or point the app at a managed MySQL and use the default profile
(`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`) — the schema in `db/bank_system_sample.sql`
loads as-is.

**Free instances sleep** after ~15 minutes with no traffic; the first request after that
takes ~30 seconds to wake up. That is normal, not a bug.

---

## Option B — Fly.io

```bash
fly launch --no-deploy         # accepts the existing Dockerfile
fly volumes create bankdata --size 1
# in fly.toml, under [mounts]: source = "bankdata", destination = "/app/data"
fly secrets set SPRING_PROFILES_ACTIVE=prod DB_PATH=/app/data/bank_system
fly deploy
```
The volume keeps the H2 file, so data survives restarts.

---

## GitHub

The repository is plain Maven + Docker, so it can be pushed as-is:

```bash
git init
git add .
git commit -m "Banking transaction system: Spring Boot + vanilla JS + MySQL/H2"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

`.gitignore` already excludes `target/`, `data/` (the database file) and `node_modules/`,
so no binaries or local data end up in the repo.

---

## After it is live — a 2-minute check

| Step | Expected |
|---|---|
| open `/` | login card + *Create an account* card |
| log in `customer1` / `Demo@1234` | two accounts, 5000.00 and 3000.00 EGP |
| *Create an account* with a new username | logged in, one account at 0.00 EGP |
| deposit 100 | balance becomes 100.00 |
| `GET /actuator/health` | `{"status":"UP"}` |
