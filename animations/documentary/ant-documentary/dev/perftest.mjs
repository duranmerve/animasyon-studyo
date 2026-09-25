// frame cost across the film: node dev/perftest.mjs [fps] [q] [w] [h]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [fps = 4, q = 'high', w = 1600, h = 900] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: +w, height: +h });
await page.goto(`http://127.0.0.1:5200/index.html?q=high&t=1&${q}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ok === true', { timeout: 240000 });
const r = await page.evaluate(async (fps) => {
  const tl = window.__tl, out = [];
  for (let t = 0; t < tl.total; t += 1 / fps) { out.push({ t, ch: tl.at(t).ch.id, ...window.__probe(t) }); if (out.length % 10 === 0) await new Promise(r => setTimeout(r, 0)); }
  const by = {};
  for (const f of out) { const b = by[f.ch] ||= { n: 0, upd: 0, rnd: 0, gpu: 0, dom: 0, max: 0, maxT: 0, draws: 0 }; b.n++; for (const k of ['upd', 'rnd', 'gpu', 'dom', 'draws']) b[k] += f[k]; const tot = f.upd + f.rnd + f.gpu + f.dom; if (tot > b.max) { b.max = tot; b.maxT = f.t; } }
  for (const b of Object.values(by)) { for (const k of ['upd', 'rnd', 'gpu', 'dom', 'draws']) b[k] = +(b[k] / b.n).toFixed(1); b.max = +b.max.toFixed(0); b.maxT = +b.maxT.toFixed(1); }
  const all = out.map(f => f.upd + f.rnd + f.gpu + f.dom).sort((a, b) => a - b);
  return { by, median: all[all.length >> 1].toFixed(1), p90: all[Math.floor(all.length * 0.9)].toFixed(1), worst: all[all.length - 1].toFixed(0) };
}, +fps);
console.log(`q=${q} ${w}x${h}  median ${r.median} ms · p90 ${r.p90} ms · worst ${r.worst} ms`);
for (const [k, b] of Object.entries(r.by)) console.log(k.padEnd(8), `upd ${b.upd} rnd ${b.rnd} gpu ${b.gpu} dom ${b.dom} ms · draws ${b.draws} · max ${b.max}ms @${b.maxT}`);
await browser.close();
