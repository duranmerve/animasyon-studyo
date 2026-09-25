// start small, grow to full HD (like entering full screen): the canvas must fill the stage
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 1100, height: 620 });
await p.goto('http://127.0.0.1:5230/index.html?t=100', { waitUntil: 'load' });
await p.waitForFunction('window.__ok === true', { timeout: 240000 });
await p.click('#go'); await new Promise(r => setTimeout(r, 1500));
await p.setViewport({ width: 1920, height: 1080 }); await new Promise(r => setTimeout(r, 1500));
const r = await p.evaluate(() => { const c = document.getElementById('view').getBoundingClientRect(); return { canvas: [Math.round(c.width), Math.round(c.height)], window: [innerWidth, innerHeight] }; });
console.log(JSON.stringify(r));
await p.screenshot({ path: process.argv[2] });
await b.close();
