// Real-time playback test in headless Chrome: plays part of the animation with its narration,
// injects artificial stalls and measures how the picture follows the voice.
//   node tools/playtest.mjs [chapterId] [seconds]
// Reports: seeks in the middle of a clip (should be 0), story time going backwards (should be 0),
// mean and max picture–voice offset while the voice plays (mean should stay under 150 ms).
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(dir, 'dist');
const [startCh = 'question', secs = '60'] = process.argv.slice(2);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(dist) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  const data = fs.readFileSync(p), range = req.headers.range;
  // byte ranges, so the audio element can seek like on a real server
  if (range) {
    const [ra, rb] = range.replace('bytes=', '').split('-'), a = Number(ra), end = rb ? Number(rb) : data.length - 1;
    res.writeHead(206, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'content-range': `bytes ${a}-${end}/${data.length}`, 'accept-ranges': 'bytes', 'content-length': end - a + 1 });
    res.end(data.subarray(a, end + 1));
  } else { res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'accept-ranges': 'bytes', 'content-length': data.length }); res.end(data); }
}).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1600, height: 900 });
await page.goto(`http://localhost:${port}/?ch=${startCh}&autoplay=1`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__fetih && window.__fetih.playing', { timeout: 20000 });
const result = await page.evaluate(async (secs) => {
  const f = window.__fetih, s = { frames: 0, diffs: [], stalls: 0, dts: [] };
  let lastNow = performance.now();
  const t0 = performance.now();
  let nextStall = t0 + 2500;
  await new Promise(done => {
    const tick = now => {
      s.frames++; s.dts.push(now - lastNow); lastNow = now;
      const a = f.audio(), i = f.chapterAt(f.T), ch = f.chapters[i];
      if (a && !a.paused && !a.seeking && a.readyState >= 3 && !f.waiting) {
        const local = f.T - ch.start;
        if (local > f.LEAD + 0.3 && local < f.LEAD + ch.clip - 0.3) s.diffs.push(f.T - (ch.start + f.LEAD + a.currentTime));
      }
      // artificial stalls: block the main thread 150–600 ms every few seconds
      if (now > nextStall) { const until = performance.now() + 150 + Math.random() * 450; while (performance.now() < until); s.stalls++; nextStall = now + 3000 + Math.random() * 3000; }
      if (now - t0 < secs * 1000) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  const abs = s.diffs.map(Math.abs);
  const sortedDt = s.dts.slice(10).sort((a, b) => a - b);
  return {
    frames: s.frames, stalls: s.stalls, samples: s.diffs.length,
    meanMs: Math.round(abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length) * 1000),
    p95Ms: Math.round((abs.sort((a, b) => a - b)[Math.floor(abs.length * 0.95)] || 0) * 1000),
    medianFrameMs: Math.round(sortedDt[Math.floor(sortedDt.length / 2)] * 10) / 10,
    audio: (a => a && { rs: a.readyState, paused: a.paused, err: a.error && a.error.code, ns: a.networkState, ct: a.currentTime })(f.audio()),
    stats: f.stats, endT: Math.round(f.T * 10) / 10, chapter: f.chapters[f.chapterAt(f.T)].id,
  };
}, Number(secs));
console.log(JSON.stringify(result, null, 1));
if (errors.length) console.log('Konsol hataları:\n  ' + [...new Set(errors)].join('\n  '));
await browser.close();
server.close();
