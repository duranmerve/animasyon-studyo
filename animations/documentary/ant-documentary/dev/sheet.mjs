// contact sheet: node dev/sheet.mjs <out.jpg> <w> <h> [chapters...]  (moments: each cue + 1.2 s)
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('../../../../node_modules/sharp');
import fs from 'fs';
const [out, w = 1600, h = 900, ...only] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('ERR ' + e.message));
await page.goto('http://127.0.0.1:5200/index.html?video=1&subs=1' + (process.env.EXTRA || ''), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ready === true', { timeout: 240000, polling: 300 });
const chs = await page.evaluate(() => window.__tl.chapters.map(c => ({ id: c.id, start: c.start, dur: c.dur, cues: c.cues })));
const times = [];
for (const c of chs) {
  if (only.length && !only.includes(c.id)) continue;
  const list = only.length ? [0.8, ...Object.values(c.cues).map(v => v + 1.2)] : [Object.values(c.cues)[1] ?? 1, Object.values(c.cues).at(-2) ?? 2].map(v => v + 1.2);
  for (const u of list) times.push({ t: c.start + Math.min(c.dur - 0.2, u), lab: `${c.id} ${u.toFixed(1)}` });
}
const tiles = [];
const dir = out.replace(/\.[a-z]+$/, '');
fs.mkdirSync(dir, { recursive: true });
for (const [i, x] of times.entries()) {
  await page.evaluate(t => { window.__video.renderAt(t - 0.1); window.__video.renderAt(t); }, x.t);
  await new Promise(r => setTimeout(r, 60));
  const file = `${dir}/${String(i).padStart(2, '0')}-${x.lab.replace(/[ .]/g, '_')}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  tiles.push({ file, lab: x.lab });
}
const cols = 4, tw = 480, th = Math.round(tw * h / w);
const rows = Math.ceil(tiles.length / cols);
const comps = [];
for (const [i, t] of tiles.entries()) {
  const img = await sharp(t.file).resize(tw, th).toBuffer();
  const svg = Buffer.from(`<svg width="${tw}" height="24"><rect width="${tw}" height="24" fill="black" opacity=".6"/><text x="6" y="17" fill="white" font-size="15" font-family="Arial">${t.lab}</text></svg>`);
  comps.push({ input: img, left: (i % cols) * tw, top: Math.floor(i / cols) * th }, { input: svg, left: (i % cols) * tw, top: Math.floor(i / cols) * th });
}
await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 82 }).toFile(out);
console.log(tiles.length + ' kare → ' + out);
console.log([...new Set(logs)].slice(0, 12).join('\n'));
await browser.close();
