// Copies the real frontend from src/main/resources/static into public/
// and writes the small Vercel routing config. No framework, no dependencies.
const fs = require('fs');
const path = require('path');

const here = __dirname;
const src = path.resolve(here, '..', 'src', 'main', 'resources', 'static');
const out = path.join(here, 'public');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const f of ['index.html', 'app.js', 'style.css']) {
  fs.copyFileSync(path.join(src, f), path.join(out, f));
}

// The browser demo + the mock API live in public/sim/
fs.mkdirSync(path.join(out, 'sim'), { recursive: true });
fs.copyFileSync(path.join(here, 'sim', 'mock-api.js'), path.join(out, 'sim', 'mock-api.js'));

// index.html must load the mock before app.js, and only in the online demo.
const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(
  '<script src="app.js"></script>',
  '<script src="sim/mock-api.js"></script>\n  <script src="app.js"></script>'
);
if (!html.includes('sim/mock-api.js')) throw new Error('could not inject the mock script tag');
fs.writeFileSync(indexPath, html);

// SPA-ish rewrite so any deep link still returns index.html
fs.writeFileSync(
  path.join(here, 'vercel.json'),
  JSON.stringify({ cleanUrls: true, rewrites: [{ source: '/((?!sim/).*)', destination: '/index.html' }] }, null, 2)
);

console.log('built public/ with', fs.readdirSync(out).join(', '));
