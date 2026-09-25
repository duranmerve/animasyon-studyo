// real playback frame rate: node dev/fpstest.mjs "<query>" [seconds] [startT]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [query = '', secs = 20, from = 30] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
const logs = []; page.on('console', m => { if (m.text().includes('[kalite]')) logs.push(m.text()); });
await page.goto(`http://127.0.0.1:5200/index.html?t=${from}&${query}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ok === true', { timeout: 240000 });
await page.click('#go');
const r = await page.evaluate(secs => new Promise(done => {
  const t0 = performance.now(); let n = 0, last = t0, worst = 0, slow = 0;
  const step = () => { const now = performance.now(); const d = now - last; last = now; n++; if (d > worst) worst = d; if (d > 50) slow++; if (now - t0 < secs * 1000) requestAnimationFrame(step); else done({ fps: +(n / secs).toFixed(1), worst: +worst.toFixed(0), slowFrames: slow, tier: document.body.dataset.tier }); };
  requestAnimationFrame(step);
}), +secs);
console.log(query || 'auto', JSON.stringify(r), logs.join(' | '));
await browser.close();
