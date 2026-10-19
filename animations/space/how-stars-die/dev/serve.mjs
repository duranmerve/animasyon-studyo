// Shared helpers for dev tools: a static server for dist/ and a puppeteer page on it.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

export const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = path.join(DIR, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

export function serve() {
  const server = http.createServer((req, res) => {
    const p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
    if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    const stat = fs.statSync(p), type = TYPES[path.extname(p)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {   // audio elements seek with range requests
      const [a, b] = range.replace('bytes=', '').split('-'), start = +a, end = b ? +b : stat.size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${stat.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
      fs.createReadStream(p, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': stat.size });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html` };
}

export async function open(query = 'video=1&subs=1', { w = 1600, h = 900, mobile = false, headless = 'new', gpu = true } = {}) {
  const { server, url } = serve();
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless,
    args: [...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : []), '--autoplay-policy=no-user-gesture-required', '--no-proxy-server', `--window-size=${w},${h}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${url}?${query}`, { waitUntil: 'load' });
  return { browser, page, server, errors, close: async () => { await browser.close(); server.close(); } };
}
