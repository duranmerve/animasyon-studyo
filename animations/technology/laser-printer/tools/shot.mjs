// Screenshots of chosen moments with headless Chrome (local check, not part of the build).
//   node tools/shot.mjs <outDir> <width>x<height> <query> [<query> ...]
//   query examples: "ch=laser&t=4"  "T=120"
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const [out, size, ...queries] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required'],
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
for (const q of queries) {
  const url = `http://localhost:${port}/index.html?${q}&capture=1`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  await new Promise(r => setTimeout(r, 1800));
  const name = q.replace(/[^a-z0-9.=]+/gi, '_');
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log('shot', name);
}
await browser.close();
server.close();
