// Live-player check: plays part of the story in real time, adds artificial hitches, and verifies
// that the narration never skips (seeks) mid-sentence and stays locked to the picture.
//   node tools/check-player.mjs [<outDir for screenshots>] [--from 80] [--secs 60]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? Number(args[i + 1]) : d; };
const out = args[0] && !args[0].startsWith('--') ? args[0] : null;
const from = opt('from', 80), secs = opt('secs', 60);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
// count every programmatic seek on media elements
await page.evaluateOnNewDocument(() => {
  window.__seeks = [];
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    get() { return d.get.call(this); },
    set(v) { window.__seeks.push([this.src.split('/').pop(), Math.round(d.get.call(this) * 100) / 100, Math.round(v * 100) / 100]); d.set.call(this, v); },
  });
});
await page.goto(`http://localhost:${server.address().port}/index.html?T=${from}&play=1`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });
const samples = [];
const t0 = Date.now();
let hitches = 0;
while (Date.now() - t0 < secs * 1000) {
  await new Promise(r => setTimeout(r, 200));
  if (Math.random() < 0.08) { hitches++; await page.evaluate(() => { const e = performance.now() + 300; while (performance.now() < e); }); }
  samples.push(await page.evaluate(() => {
    const n = window.__narr, T = window.__T(), ch = window.__tl.voiceAt(T);
    return { T, clip: n.el ? n.el.src.split('/').pop() : '', at: n.el ? n.el.currentTime : 0, playing: n.speaking, lag: ch && n.speaking && n.ch === ch ? T - ch.voice.start - n.el.currentTime : 0 };
  }));
}
const seeks = await page.evaluate(() => window.__seeks);
// mid-sentence seeks: jumps of more than 0.3 s away from where the clip was
const bad = seeks.filter(([, was, to]) => was > 0.05 && Math.abs(to - was) > 0.3);
let backwards = 0;
for (let i = 1; i < samples.length; i++) if (samples[i].clip === samples[i - 1].clip && samples[i].at + 0.01 < samples[i - 1].at && samples[i].playing) backwards++;
const lags = samples.filter(s => s.playing).map(s => Math.abs(s.lag));
let backT = 0;
for (let i = 1; i < samples.length; i++) if (samples[i].T + 1e-6 < samples[i - 1].T) backT++;
const clips = new Set(samples.filter(s => s.playing).map(s => s.clip));
console.log(`${secs} sn oynatıldı (T ${from} → ${samples.at(-1).T.toFixed(1)}), ${hitches} yapay takılma, ${clips.size} bölüm kaydı`);
console.log(`ses atlatma: toplam ${seeks.length}, cümle ortasında ${bad.length}; sesin geriye sarılması ${backwards}; hikâye zamanının geri gitmesi ${backT}`);
console.log(`görüntü-ses farkı: ortalama ${(lags.reduce((a, b) => a + b, 0) / Math.max(1, lags.length) * 1000).toFixed(0)} ms, en çok ${(Math.max(0, ...lags) * 1000).toFixed(0)} ms`);
if (process.env.DUMP) for (const s of samples.filter((_, i) => i % 10 === 0)) console.log(s.T.toFixed(2), s.clip, s.at.toFixed(2), s.playing, s.lag.toFixed(2));
if (bad.length) console.log('cümle ortası atlatmalar:', bad.slice(0, 10));
if (out) {
  fs.mkdirSync(out, { recursive: true });
  await page.click('#bSettings');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(out, 'settings.png') });
}
await browser.close(); server.close();
