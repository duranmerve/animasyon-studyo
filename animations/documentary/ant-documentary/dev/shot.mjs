// dev screenshots: node dev/shot.mjs <url> <out.png> [w] [h] [waitExpr]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [url, out, w = 1600, h = 900, wait = 'window.__ok'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', e => logs.push('ERR ' + e.message));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
try { await page.waitForFunction(wait, { timeout: 120000, polling: 200 }); } catch (e) { logs.push('timeout waiting ' + wait); }
await page.screenshot({ path: out });
console.log(logs.filter(l => !l.includes('Babylon.js v')).slice(0, 20).join('\n'));
await browser.close();
