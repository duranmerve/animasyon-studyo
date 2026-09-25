// Proves the video contract: renderAt(t) is a pure function of time. The same t twice, and a cold
// jump back to t after rendering elsewhere, must give identical pixels. A failure means the draw
// path depends on history (Math.random, frame counters, mutable state), which shows up as flicker
// and makes the exported MP4 differ from what was inspected. (Mechanism from klsoen/opus-js-animations, MIT.)
//   npm run verify -- <slug> [--times 5,60,120] [--n 9] [--query tier=min&off=grains]   (query: sayfaya ek parametreler, ayıklama için)
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import puppeteer from 'puppeteer-core';
import { findAnimation } from './lib/animations.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (!slug) { console.log('kullanım: npm run verify -- <slug> [--times 5,60,120] [--n 9]'); process.exit(1); }
const { dir } = findAnimation(slug);
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8'));
const out = path.join(dir, cfg.output || 'dist');
if (!fs.existsSync(path.join(out, 'index.html'))) { console.log(`${out}/index.html yok; önce npm run build -- ${slug}`); process.exit(1); }

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.json': 'application/json', '.hdr': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(out, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!p.startsWith(out) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,720'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
const logs = [];
page.on('pageerror', e => logs.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html?video=1&subs=0${opt('query') ? '&' + opt('query') : ''}`, { waitUntil: 'load' });
await page.waitForFunction('window.__video && window.__ready === true', { timeout: 120000 });
const duration = await page.evaluate(() => window.__video.duration);
const n = Number(opt('n', 9));
const times = opt('times') ? String(opt('times')).split(',').map(Number) : Array.from({ length: n }, (_, i) => +(duration * (i + 0.5) / n).toFixed(3));

// the page may draw into WebGL: read pixels from the canvas as PNG (preserveDrawingBuffer must be on)
const hash = async t => {
  await page.evaluate(tt => window.__video.renderAt(tt), t);
  const png = await page.evaluate(() => { const c = document.querySelector('canvas'); return c.toDataURL('image/png'); });
  return crypto.createHash('sha1').update(png).digest('hex').slice(0, 12);
};
let fail = 0;
console.log(`${slug}: ${duration.toFixed(1)} sn, ${times.length} an`);
for (const t of times) {
  const a = await hash(t), b = await hash(t);
  await hash((t + duration / 2) % duration);   // wander off
  const c = await hash(t);                      // cold jump back
  const ok = a === b && a === c;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'HATA'} t=${t}  ${a} ${b} ${c}`);
}
if (logs.length) { console.log('sayfa hataları:\n' + logs.join('\n')); fail++; }
await browser.close(); server.close();
console.log(fail ? `${fail} sorun: renderAt(t) saf değil (Math.random, kare sayacı ya da kalıcı durum var)` : 'renderAt(t) her anda saf: video kaydı incelenenle aynı olacak');
process.exit(fail ? 1 : 0);
