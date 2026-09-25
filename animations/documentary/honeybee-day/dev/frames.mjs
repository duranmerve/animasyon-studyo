// render chosen moments to one contact image: node dev/frames.mjs <out.jpg> <w> <h> <spec>...
// spec: chapter@u (seconds into chapter) or chapter:cue+off
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('../../../../node_modules/sharp');
const [out, w = 1600, h = 900, ...specs] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', e => logs.push('ERR ' + e.message));
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=1' + (process.env.EXTRA || ''), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ready === true', { timeout: 240000, polling: 300 });
const tiles = [];
for (const sp of specs) {
  const t = await page.evaluate(sp => {
    const tl = window.__tl;
    let m = sp.match(/^(\w+)@([\d.]+)$/);
    if (m) { const c = tl.chapters.find(x => x.id === m[1]); return c.start + +m[2]; }
    m = sp.match(/^(\w+):(\w+)([+-][\d.]+)?$/);
    const c = tl.chapters.find(x => x.id === m[1]); return c.start + c.cues[m[2]] + (+m[3] || 0);
  }, sp);
  await page.evaluate(t => { window.__video.renderAt(t - 0.1); window.__video.renderAt(t); }, t);
  await new Promise(r => setTimeout(r, 50));
  tiles.push({ buf: await page.screenshot({ type: 'png' }), lab: sp });
}
const cols = Math.min(specs.length, +(process.env.COLS || 2)), tw = +(process.env.TW || 800), th = Math.round(tw * h / w);
const rows = Math.ceil(tiles.length / cols);
const comps = [];
for (const [i, t] of tiles.entries()) {
  const img = await sharp(t.buf).resize(tw, th).toBuffer();
  const svg = Buffer.from(`<svg width="${tw}" height="22"><rect width="${tw}" height="22" fill="black" opacity=".55"/><text x="6" y="16" fill="white" font-size="14" font-family="Arial">${t.lab}</text></svg>`);
  comps.push({ input: img, left: (i % cols) * tw, top: Math.floor(i / cols) * th }, { input: svg, left: (i % cols) * tw, top: Math.floor(i / cols) * th });
}
await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 86 }).toFile(out);
console.log(tiles.length + ' kare → ' + out);
console.log([...new Set(logs)].slice(0, 12).join('\n'));
await browser.close();
