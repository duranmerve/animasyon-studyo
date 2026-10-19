// Contact sheet: renders moments and tiles them with their time stamps (tiling done in the browser).
//   node dev/sheet.mjs [--times open.starA+1,open.burst+1.5,30] [--every 12] [--phone] [--cols 4] [--out name] [--tier high]
// A time is seconds or "section.cue+offset" (section/cue split at the FIRST dot only).
import fs from 'fs';
import path from 'path';
import { open, DIR } from './serve.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const phone = args.includes('--phone');
const [w, h] = phone ? [390, 844] : [1600, 900];
const { browser, page, errors, close } = await open(`video=1&subs=1${opt('tier') ? '&tier=' + opt('tier') : ''}`, { w, h });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
const tl = await page.evaluate(() => ({ duration: window.__tl.duration, sections: window.__tl.sections.map(s => ({ id: s.id, start: s.start, end: s.end, cue: s.cue })) }));
export const resolveTime = (tl, spec) => {
  if (/^[\d.]+$/.test(spec)) return +spec;
  const m = spec.match(/^([a-z0-9]+)\.([A-Za-z0-9]+)?([+-][\d.]+)?$/);
  if (!m) throw new Error('zaman anlaşılmadı: ' + spec);
  const s = tl.sections.find(x => x.id === m[1]);
  const base = !m[2] || m[2] === 'start' ? s.start : m[2] === 'end' ? s.end : s.cue[m[2]];
  if (base === undefined) throw new Error('ipucu yok: ' + spec);
  return base + (m[3] ? +m[3] : 0);
};
let times;
if (opt('times')) times = opt('times').split(',').map(s => resolveTime(tl, s));
else { const every = +opt('every', 12); times = []; for (let t = every / 2; t < tl.duration; t += every) times.push(t); }

const tiles = [];
for (const t of times) {
  await page.evaluate(tt => window.__video.renderAt(tt), t);
  const b64 = await page.screenshot({ type: 'jpeg', quality: 88, encoding: 'base64' });
  const sec = tl.sections.find(s => t < s.end) || tl.sections.at(-1);
  tiles.push({ b64, label: `${t.toFixed(1)}s · ${sec.id} +${(t - sec.start).toFixed(1)}` });
}
const cols = +opt('cols', phone ? 6 : 3);
const tw = phone ? 260 : 560, th = Math.round(tw * h / w);
const sheet = await browser.newPage();
await sheet.setViewport({ width: cols * (tw + 6), height: 100, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px">${tiles.map(x => `<div style="position:relative;width:${tw}px;height:${th}px"><img src="data:image/jpeg;base64,${x.b64}" style="width:100%;height:100%;display:block"><span style="position:absolute;left:0;top:0;background:rgba(0,0,0,.7);color:#fff;font:13px Consolas;padding:3px 6px">${x.label}</span></div>`).join('')}</body>`);
const out = path.join(DIR, 'dev', 'out');
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, `${opt('out', phone ? 'sheet-phone' : 'sheet')}.jpg`);
await sheet.screenshot({ path: file, type: 'jpeg', quality: 86, fullPage: true });
if (errors.length) console.log('sayfa hataları:\n' + errors.join('\n'));
console.log(`${file} (${tiles.length} kare)`);
await close();
