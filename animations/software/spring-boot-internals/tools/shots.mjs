// Screenshots of chosen moments (headless Chrome) + a contact sheet.
//   node tools/shots.mjs [--size 1600x900] [--out shots] [--sheet name] [moments…]
// moment: seconds ("73.5"), "section" (its middle) or "section@marker+offset" (e.g. autoconfig@chain+1.5)
// Without moments: two per section. Needs the root devDependencies (puppeteer-core, sharp) and a build.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(dir, '../../../package.json'));
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const [W, H] = opt('size', '1600x900').split('x').map(Number);
const outDir = path.join(dir, opt('out', 'shots'));
const sheetName = opt('sheet', `sheet-${W}x${H}`);
const subs = opt('subs', '1');
fs.mkdirSync(outDir, { recursive: true });

const dist = path.join(dir, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const p = path.join(dist, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html?video=1&subs=${subs}`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 }).catch(e => { console.log(errors); throw e; });
const secs = await page.evaluate(() => window.__timeline.secs.map(s => ({ id: s.id, start: s.start, dur: s.dur, marks: s.marks })));
const resolve = m => {
  if (/^[\d.]+$/.test(m)) return { t: Number(m), name: m };
  const [id, rest] = m.split('@');
  const s = secs.find(x => x.id === id);
  if (!s) throw new Error('no section ' + id);
  if (!rest) return { t: s.start + s.dur / 2, name: id };
  const [, mk, off] = rest.match(/^([a-z0-9]+)([+-][\d.]+)?$/);
  return { t: s.start + (s.marks[mk] ?? 0) + Number(off || 0), name: `${id}@${mk}${off || ''}` };
};
const moments = args.length ? args.map(resolve) : secs.flatMap(s => [{ t: s.start + s.dur * 0.35, name: s.id + '-a' }, { t: s.start + s.dur * 0.85, name: s.id + '-b' }]);
const files = [];
for (const m of moments) {
  await page.evaluate(t => window.__video.renderAt(t), m.t);
  await new Promise(r => setTimeout(r, 60));
  const f = path.join(outDir, `${m.name.replace(/[^\w@+.-]/g, '_')}-${W}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
// contact sheet
const cols = W > H ? 3 : 5, tw = W > H ? 640 : 300, th = Math.round(tw * H / W);
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(tw, th).toBuffer(), left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 8) })));
await sharp({ create: { width: cols * (tw + 8), height: rows * (th + 8), channels: 3, background: '#333' } }).composite(tiles).png().toFile(path.join(outDir, sheetName + '.png'));
console.log(`${files.length} görüntü → ${path.relative(dir, outDir)}/ · ${sheetName}.png`);
if (errors.length) console.log('HATALAR:\n' + [...new Set(errors)].join('\n'));
await browser.close(); server.close();
