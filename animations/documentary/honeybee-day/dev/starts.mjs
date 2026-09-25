import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); await p.goto('http://127.0.0.1:5230/index.html?video=1', { waitUntil: 'load' });
await p.waitForFunction('window.__tl', { timeout: 120000 });
console.log(await p.evaluate(() => window.__tl.chapters.map(c => `${c.id} ${c.start.toFixed(1)} voice ${(c.start + c.head).toFixed(1)}–${(c.start + c.voiceEnd).toFixed(1)}`).join('\n')));
await b.close();
