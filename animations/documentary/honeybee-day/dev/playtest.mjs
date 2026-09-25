// real-time playback test: node dev/playtest.mjs [seconds] [startT]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [secs = 40, from = 0] = process.argv.slice(2).map(Number);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.evaluateOnNewDocument(() => {
  window.__seeks = [];
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { get() { return d.get.call(this); }, set(v) { window.__seeks.push({ at: window.__player ? window.__player.t : -1, v, from: d.get.call(this), paused: this.paused }); d.set.call(this, v); } });
});
await page.goto(`http://127.0.0.1:5230/index.html?t=${from}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ok === true', { timeout: 240000, polling: 300 });
await page.click('#go');
const res = await page.evaluate(async (secs) => {
  const P = window.__player, tl = window.__tl;
  let last = P.t, back = 0, diffs = [], samples = 0, stalls = 0;
  const t0 = performance.now();
  return await new Promise(done => {
    const step = () => {
      const now = performance.now();
      // artificial jank: every ~2 s block the main thread 120–400 ms
      if (Math.random() < 0.012) { const b = performance.now() + 120 + Math.random() * 280; while (performance.now() < b); stalls++; }
      const t = P.t;
      if (t < last - 1e-6) back++;
      last = t;
      const c = P.clip;
      if (c && !c.paused && c.readyState >= 3) {
        const { ch } = tl.at(t);
        diffs.push(Math.abs(ch.start + ch.head + c.currentTime - t)); samples++;
      }
      if (now - t0 < secs * 1000) requestAnimationFrame(step);
      else done({ back, stalls, samples, avg: diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length), max: Math.max(0, ...diffs), end: t });
    };
    requestAnimationFrame(step);
  });
}, secs);
const seeks = await page.evaluate(() => window.__seeks);
// a seek counts as "mid-clip" if the clip was already playing and the jump is not at clip start
const mid = seeks.filter(s => !s.paused && s.from > 0.3);
console.log(JSON.stringify({ ...res, seeks: seeks.length, midClipSeeks: mid.length, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
