// Screenshots at given story times: node tools/shots.mjs <outDir> <w>x<h> t1 t2 …  (times in s, or chapter.cue)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { serve } from './serve.mjs';
const [out, size, ...times] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const srv = await serve();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${srv.address().port}/?t=0.01`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__test');
for (const t of times) {
  const sec = await page.evaluate(t => {
    const tl = window.__test.tl;
    if (/^[\d.]+$/.test(t)) return +t;
    const id = t.split('.')[0], cue = t.includes('.') ? t.slice(id.length + 1) : ''; const off = cue.includes('+') ? +cue.split('+')[1] : 0;
    const c = cue ? tl.cue(id, cue.split('+')[0]) : tl.byId[id].start + 0.8; return c + off;
  }, t);
  await page.evaluate(s => window.__test.seek(s), sec);
  await new Promise(r => setTimeout(r, 120));
  await page.screenshot({ path: `${out}/${w}x${h}_${t.replace(/[^\w.+-]/g, '_')}.png` });
}
console.log(errors.length ? 'console:\n' + [...new Set(errors)].join('\n') : 'console: temiz');
await browser.close(); srv.close();
