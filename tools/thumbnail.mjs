// YouTube thumbnails drawn by the animation's own code, in the channel's shared look.
//   npm run thumbnail -- <slug> [--v 2] [--out <klasör>]
// The animation provides animations/<kategori>/<slug>/thumbnail.html (served straight from the source folder):
//   ?v=<n> draws cover n on a 1280×720 #root, then sets window.__thumbs = { count, list: [{ id, title }] }
//   and window.__thumbReady = true. The channel kit (assets/thumbnail-kit/kit.js) is served at /_kit/:
//   the animation draws its own hero picture and calls kit.brand({ title, accent, topic, minutes }).
// Output: animations/<kategori>/<slug>/renders/thumbnail-<n>-<id>.jpg (1920×1080; YouTube accepts ≤ 2 MB).
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { findAnimation } from './lib/animations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (!slug) { console.log('kullanım: npm run thumbnail -- <slug> [--v <n>] [--out <klasör>]'); process.exit(1); }
const dir = findAnimation(slug).dir;
if (!fs.existsSync(path.join(dir, 'thumbnail.html'))) { console.log(`${slug}: thumbnail.html yok (animasyon kapak çizimini henüz sunmuyor).`); process.exit(1); }
const KIT = path.join(ROOT, 'assets', 'thumbnail-kit');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const base = url.startsWith('/_kit/') ? KIT : dir;
  const p = path.join(base, url.startsWith('/_kit/') ? url.slice(5) : url);
  if (!p.startsWith(base) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[sayfa hatası]', e.message));
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
const url = v => `http://localhost:${server.address().port}/thumbnail.html?v=${v}&dpr=2`;
await page.goto(url(1), { waitUntil: 'load' });
await page.waitForFunction('window.__thumbReady === true', { timeout: 60000 });
const { count, list } = await page.evaluate(() => window.__thumbs);
const dest = opt('out') ? path.resolve(opt('out')) : path.join(dir, 'renders');
fs.mkdirSync(dest, { recursive: true });
const only = opt('v') ? [Number(opt('v'))] : Array.from({ length: count }, (_, i) => i + 1);
for (const v of only) {
  await page.goto(url(v), { waitUntil: 'load' });
  await page.waitForFunction('window.__thumbReady === true', { timeout: 60000 });
  await new Promise(r => setTimeout(r, 300));
  const file = path.join(dest, `thumbnail-${v}-${list[v - 1]?.id || v}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log(`→ ${path.relative(ROOT, file)}  (${list[v - 1]?.title || ''}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
await browser.close(); server.close();
