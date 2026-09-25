// plays across the end of every narration clip: the clip must not restart, the story must keep moving
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
await page.goto('http://127.0.0.1:5200/index.html?q=low', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ok === true', { timeout: 240000 });
await page.click('#go'); if (process.argv[2] === 'fast') await page.evaluate(() => { window.__fast = true; });
const res = await page.evaluate(async () => {
  const P = window.__player, tl = window.__tl, out = [];
  for (const ch of tl.chapters) {
    P.seek(ch.start + ch.voiceEnd - 2.5);
    let restarts = 0, lastCt = -1, lastClip = null, stuck = 0, back = 0, prevT = P.t;
    const t0 = P.t, w0 = performance.now();
    await new Promise(done => {
      const step = () => {
        const c = P.clip;
        if (c && c === lastClip && c.currentTime < lastCt - 1) restarts++;
        if (c) { lastCt = c.currentTime; lastClip = c; if (window.__fast) c.playbackRate = 1.06; }
        if (P.t < prevT - 1e-6) back++;
        prevT = P.t;
        if (performance.now() - w0 < 6000) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    out.push(`${ch.id}: ilerleme ${(P.t - t0).toFixed(2)} sn / 6 · yeniden başlama ${restarts} · geri ${back}`);
  }
  return out;
});
console.log(res.join('\n'));
await browser.close();
