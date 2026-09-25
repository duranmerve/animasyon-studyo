// Screenshots of chosen moments in headless Chrome (desktop and phone), for checking the picture.
//   node tools/shoot.mjs <outDir> [chapter:seconds | chapter:@cue[+s] ...] [--phone] [--desktop]
//   node tools/shoot.mjs out question:3 walls:@moat+2 --phone
// START=1 keeps the start card on screen.
// With no moments given it takes the middle and the end of every chapter.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(dir, 'dist');
const args = process.argv.slice(2);
const outDir = path.resolve(args[0] || 'shots');
const moments = args.slice(1).filter(a => !a.startsWith('--'));
const sizes = [];
if (!args.includes('--phone')) sizes.push(['desk', 1600, 900, 1]);
if (!args.includes('--desktop')) sizes.push(['phone', 390, 844, 2]);
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(dist) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11'] });
const errors = [];
for (const [name, w, h, dpr] of sizes) {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${name}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await page.goto(`http://localhost:${port}/?${process.env.START ? '' : 'shot=1'}${process.env.POSTER ? '&poster=1' : ''}`, { waitUntil: 'networkidle0' });
  try { await page.waitForFunction('window.__fetih', { timeout: 20000 }); } catch { console.log('sayfa açılmadı:\n' + errors.join('\n')); process.exit(1); }
  const info = await page.evaluate(() => window.__fetih.chapters);
  const list = moments.length ? moments : info.flatMap(c => [`${c.id}:${(c.dur * 0.5).toFixed(1)}`, `${c.id}:${(c.dur - 1.2).toFixed(1)}`]);
  for (const m of list) {
    const [id, spec] = m.split(':');
    const T = await page.evaluate((id, spec) => {
      const f = window.__fetih, c = f.chapters.find(c => c.id === id);
      if (!c) return null;
      let t = Number(spec);
      if (spec.startsWith('@')) { const [cue, plus] = spec.slice(1).split('+'); t = window.__fetihCue(id, cue) + Number(plus || 0); }
      f.render(c.start + t);
      return c.start + t;
    }, id, spec);
    if (T === null) { console.log('bilinmeyen bölüm', id); continue; }
    await new Promise(r => setTimeout(r, 120));
    const file = path.join(outDir, `${name}-${id}-${spec.replace(/[^\w.+-]/g, '')}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await page.close();
}
await browser.close();
server.close();
if (errors.length) { console.log('\nKonsol:'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
