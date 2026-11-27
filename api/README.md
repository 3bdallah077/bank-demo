# Postman collection — FR-13

`postman_collection.json` covers every endpoint of the REST API (33 requests, 47 assertions).
It requires the app to be running (default `http://localhost:8080`).

**In Postman:** Import → drop the file → set the `baseUrl` variable → start with
`Auth / 01 Login customer1`. Postman keeps the `JSESSIONID` cookie, so the following requests
run as that user. Requests are ordered by role; the folder names carry the requirement IDs.

**From the command line (no GUI):**

```bash
npm i -g newman
newman run api/postman_collection.json --env-var baseUrl=http://localhost:8080
```

Expected: `requests 34 · assertions 47 · failed 0`.

Notes
- `{{accountNumber}}` and `{{newUserId}}` are filled automatically by the earlier requests.
- Sample data is fictional; every request asserts its own expected status code, so the
  collection doubles as a regression smoke test.
- Password for all five sample users: `Demo@1234`.
