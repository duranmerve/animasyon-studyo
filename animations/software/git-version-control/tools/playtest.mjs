// Real-time playback check with artificial stalls: node tools/playtest.mjs [seconds]
// Reports: seeks of a playing clip (must be 0), story time going back (must be 0), voice–picture offset.
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';
const secs = Number(process.argv[2]) || 60;
const srv = await serve();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__test');
const run = async (from, dur) => {
  await page.evaluate(f => { const x = window.__test; if (!x.playing && x.T === 0 && f === 0) x.begin(); else { x.seek(f); x.setPlaying(true); } }, from);
  // stalls: block the main thread now and then, sample T to catch any step back
  await page.evaluate(d => new Promise(res => {
    const x = window.__test; let last = x.T, back = 0; const t0 = performance.now();
    const iv = setInterval(() => {
      if (x.T < last - 1e-6) back++; last = x.T;
      if (Math.random() < 0.08) { const b = performance.now(); while (performance.now() - b < 250 + Math.random() * 300) { /* stall */ } }
      if (performance.now() - t0 > d * 1000) { clearInterval(iv); window.__back = (window.__back || 0) + back; res(); }
    }, 100);
  }), dur);
};
await run(0, secs * 0.5);
const tl = await page.evaluate(() => window.__test.tl.chapters.map(c => c.start));
await run(tl[8] + 3, secs * 0.25);
await run(tl[14], secs * 0.25);
const r = await page.evaluate(() => {
  const m = window.__test.metrics, d = m.diffs.slice(), avg = d.reduce((a, b) => a + b, 0) / Math.max(1, d.length);
  return { seeksWhilePlaying: m.seeksWhilePlaying, positions: m.positions, backwardsInClock: m.backwards, backwardsSampled: window.__back, waitFrames: m.waitFrames, samples: d.length, avgOffsetMs: Math.round(avg * 1000), p95Ms: Math.round((d.sort((a, b) => a - b)[Math.floor(d.length * 0.95)] || 0) * 1000), T: window.__test.T };
});
console.log(r);
console.log(errors.length ? 'hatalar:\n' + errors.join('\n') : 'konsol: hata yok');
await browser.close(); srv.close();
