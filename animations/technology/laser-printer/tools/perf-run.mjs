// Finds hitches: renders the story frame by frame from the first moment, forcing the GPU to finish
// each frame, and reports frames that cost far more than their neighbours (first-use shader
// compiles, texture uploads, buffer reallocations).
//   node tools/perf-run.mjs [step=0.1]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const step = Number(process.argv[2] || 0.1);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/index.html?video=1&subs=1`, { waitUntil: 'load' });
await page.waitForFunction('window.__video && window.__ready === true', { timeout: 60000 });
const res = await page.evaluate(async (step) => {
  const gl = document.getElementById('gl').getContext('webgl2');
  const px = new Uint8Array(4);
  const out = [];
  const total = window.__video.duration;
  for (let t = 0; t < total; t += step) {
    const a = performance.now();
    window.__video.renderAt(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // wait for the GPU
    out.push([Math.round(t * 10) / 10, Math.round(performance.now() - a), window.__tl.chapterAt(t).id]);
  }
  return out;
}, step);
const ms = res.map(r => r[1]).sort((a, b) => a - b);
const med = ms[Math.floor(ms.length / 2)];
console.log(`${res.length} kare · ortanca ${med} ms · %95 ${ms[Math.floor(ms.length * 0.95)]} ms · en kötü ${ms.at(-1)} ms`);
const spikes = res.filter(r => r[1] > Math.max(3 * med, med + 40));
console.log(`sıçrayan kareler (${spikes.length}):`);
for (const s of spikes) console.log(`  T=${s[0]}s ${s[1]} ms ${s[2]}`);
const byCh = {};
for (const [, m, ch] of res) (byCh[ch] ||= []).push(m);
for (const [ch, v] of Object.entries(byCh)) { v.sort((a, b) => a - b); console.log(`${ch.padEnd(12)} ortanca ${v[v.length >> 1]} ms, en kötü ${v.at(-1)} ms`); }
await browser.close(); server.close();
