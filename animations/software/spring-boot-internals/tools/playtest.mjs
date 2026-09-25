// Real-time playback test in headless Chrome with artificial stalls.
//   node tools/playtest.mjs [seconds=40]
// Measures: seeks inside a playing clip (must be 0), story time going backwards (must be 0),
// audio–picture drift (mean < 150 ms), console errors; then checks that the CC and narration buttons work.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(dir, '../../../package.json'));
const puppeteer = require('puppeteer-core');
const secs = Number(process.argv[2] || 40);
const dist = path.join(dir, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const p = path.join(dist, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; }
  const st = fs.statSync(p), range = q.headers.range;
  const type = types[path.extname(p)] || 'application/octet-stream';
  if (range) {
    const [a, b] = range.replace('bytes=', '').split('-'); const s = Number(a), e = b ? Number(b) : st.size - 1;
    r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${e}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 });
    fs.createReadStream(p, { start: s, end: e }).pipe(r);
  } else { r.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes' }); fs.createReadStream(p).pipe(r); }
}).listen(0);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });
await page.click('#go');
// stall the main thread now and then (100–400 ms), like a slow device
const t0 = Date.now();
let stalls = 0, sampleT = [];
while (Date.now() - t0 < secs * 1000) {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 1500));
  const ms = 100 + Math.random() * 300;
  await page.evaluate(ms => { const e = performance.now() + ms; while (performance.now() < e); }, ms);
  stalls++;
  sampleT.push(await page.evaluate(() => window.__player.T));
}
// a user seek into the middle of a section, then keep playing
await page.evaluate(() => { const s = window.__timeline.secs[6]; window.__player.seek(s.start + 5); });
await new Promise(r => setTimeout(r, 6000));
const st = await page.evaluate(() => { const s = window.__stats; const d = s.drift; return { seeks: s.seeks, midSeeks: s.midSeeks, backwards: s.backwards, waits: s.waits, frames: s.frames, drift: d.reduce((a, b) => a + b, 0) / Math.max(1, d.length), driftMax: Math.max(0, ...d), T: window.__player.T }; });

// CC off → subtitles hidden for 8 s; on again → visible
await page.keyboard.press('c');
let visibleWhileOff = 0;
for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 500)); visibleWhileOff += await page.evaluate(() => { const e = document.querySelector('#subs'); return getComputedStyle(e).display !== 'none' && e.textContent.trim() ? 1 : 0; }); }
await page.keyboard.press('c');
await new Promise(r => setTimeout(r, 3000));
const visibleAfterOn = await page.evaluate(() => { const e = document.querySelector('#subs'); return getComputedStyle(e).display !== 'none'; });
// narration off → no clip plays
await page.keyboard.press('n');
await new Promise(r => setTimeout(r, 1500));
const audioWhileOff = await page.evaluate(() => [...document.querySelectorAll('audio')].length + 0);
const playingClips = await page.evaluate(() => window.__clipsPlaying ? window.__clipsPlaying() : -1);
await page.keyboard.press('n');

console.log(JSON.stringify({ stalls, ...st, visibleWhileOff, visibleAfterOn, playingClips, errors: [...new Set(errors)] }, null, 1));
const ok = st.midSeeks === 0 && st.backwards === 0 && st.drift < 0.15 && visibleWhileOff === 0 && visibleAfterOn && playingClips === 0 && !errors.length;
console.log(ok ? 'SONUÇ: geçti' : 'SONUÇ: KALDI');
await browser.close(); server.close();
