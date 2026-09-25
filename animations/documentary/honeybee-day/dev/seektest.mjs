// clicking the middle of each chapter segment must land in that chapter
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [w, h] of [[1600, 900], [390, 844]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h });
  await p.goto('http://127.0.0.1:5230/index.html?tier=min', { waitUntil: 'load' });
  await p.waitForFunction('window.__ok === true', { timeout: 240000 });
  await p.click('#go'); await new Promise(r => setTimeout(r, 800));
  let ok = 0; const bad = [];
  const segs = await p.$$eval('#progress .seg', els => els.map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  for (const [i, [x, y]] of segs.entries()) {
    await p.mouse.move(w / 2, h / 2); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up();
    const got = await p.evaluate(() => { const t = window.__player.t; return window.__tl.at(t).ch.index; });
    if (got === i) ok++; else bad.push(`${i}→${got}`);
  }
  console.log(`${w}×${h}: ${ok}/${segs.length} bölüm doğru ${bad.join(' ')}`);
  await p.close();
}
await b.close();
