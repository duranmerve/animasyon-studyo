// title-card contrast: node dev/contrast.mjs <w> <h> <spec>   (spec: chapter@u)
// hides the title text, reads the background behind its box, and reports the WCAG contrast of the chalk text on it
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('../../../../node_modules/sharp');
const [w = 1600, h = 900, spec = 'safak@22.3'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: +w, height: +h });
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=0', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 240000 });
const box = await page.evaluate(sp => {
  const [id, u] = sp.split('@'); const c = window.__tl.chapters.find(x => x.id === id);
  window.__video.renderAt(c.start + +u);
  const t = [...document.querySelectorAll('#fg .ttl')].find(e => e.textContent && e.closest('g').style.display !== 'none');
  const r = t.getBoundingClientRect();
  for (const e of document.querySelectorAll('#fg text')) e.style.visibility = 'hidden';
  return { x: r.x, y: r.y, w: r.width, h: r.height, op: +t.closest('g').style.opacity };
}, spec);
const png = await page.screenshot({ type: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
let sum = 0, n = 0;
for (let i = 0; i < info.width * info.height; i++) { const o = i * info.channels; sum += 0.2126 * lin(data[o]) + 0.7152 * lin(data[o + 1]) + 0.0722 * lin(data[o + 2]); n++; }
const bg = sum / n, chalk = 0.2126 * lin(0xE6) + 0.7152 * lin(0xEC) + 0.0722 * lin(0xEF);
console.log(`${w}x${h} ${spec}: arka plan L=${bg.toFixed(3)} · yazı L=${chalk.toFixed(3)} · kontrast ${((chalk + 0.05) / (bg + 0.05)).toFixed(2)}:1 · başlık opaklığı ${box.op.toFixed(2)}`);
await browser.close();
