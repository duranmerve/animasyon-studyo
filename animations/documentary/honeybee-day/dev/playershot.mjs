// player screenshots during real playback: node dev/playershot.mjs <out-prefix> <w> <h> <t>
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [out, w = 1600, h = 900, t = 100] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h, isMobile: +w < 700, hasTouch: +w < 700 });
await p.goto(`http://127.0.0.1:5230/index.html?t=${t}`, { waitUntil: 'load' });
await p.waitForFunction('window.__ok === true', { timeout: 240000 });
await p.screenshot({ path: `${out}-start.png` });
await p.click('#go'); await new Promise(r => setTimeout(r, 2500));
await p.mouse.move(+w / 2, +h / 2); await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path: `${out}-bar.png` });
await new Promise(r => setTimeout(r, 4000));
await p.screenshot({ path: `${out}-nobar.png` });
await b.close();
