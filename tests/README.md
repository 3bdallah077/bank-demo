API smoke test (stdlib python3): `BASE=http://localhost:8080 python3 tests/api_smoke_test.py`
Browser test (Chrome + puppeteer-core): `cd tests && npm i puppeteer-core && SHOTS=/some/dir node ui_e2e.js` (edit the URL and Chrome path at the top).
Both expect freshly loaded sample data plus db/demo-passwords.sql. Both write rows; reload the sample dump to reset.
