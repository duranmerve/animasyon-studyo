// Layout check (craft.md → 12): every 0.1 s of the film, the real on-screen boxes of the field-guide
// text (DOM, not the register's estimate) must not overlap each other or the subtitles, and must keep
// 4 px from the screen edge.   node dev/layout-check.mjs [w] [h] [step]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [w = 1600, h = 900, step = 0.1] = process.argv.slice(2).map(Number);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: w, height: h });
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ready === true', { timeout: 240000, polling: 300 });
const res = await page.evaluate(async (step) => {
  const tl = window.__tl, W = innerWidth, H = innerHeight;
  const vis = e => { let op = 1; for (let n = e; n && n.id !== 'fg'; n = n.parentNode) { const s = n.style; if (!s) continue; if (s.display === 'none' || s.visibility === 'hidden') return 0; if (s.opacity !== '') op *= +s.opacity; } return op; };
  const out = { frames: 0, texts: 0, overlaps: [], subs: [], margins: [] };
  const seen = new Set();
  const note = (list, key, v) => { if (seen.has(key)) return; seen.add(key); if (list.length < 40) list.push(v); };
  for (let t = 0; t < tl.total; t += step) {
    window.__video.renderAt(t);
    out.frames++;
    const { ch } = tl.at(t);
    const boxes = [];
    for (const e of document.querySelectorAll('#fg text')) {
      if (!e.textContent.trim()) continue;
      const o = vis(e); if (o < 0.05) continue;
      const r = e.getBoundingClientRect(); if (r.width < 1) continue;
      const id = (e.closest('g')?.dataset?.id) || e.textContent.slice(0, 24);
      boxes.push({ id: e.textContent.slice(0, 28), x0: r.left, x1: r.right, y0: r.top, y1: r.bottom });
    }
    out.texts += boxes.length;
    const sEl = document.getElementById('subs');
    let sub = null;
    if (sEl.style.display !== 'none' && sEl.textContent.trim()) { const lines = [...sEl.querySelectorAll('.sub-line')]; if (lines.length) { const rs = lines.map(l => l.getBoundingClientRect()); sub = { x0: Math.min(...rs.map(r => r.left)), x1: Math.max(...rs.map(r => r.right)), y0: Math.min(...rs.map(r => r.top)), y1: Math.max(...rs.map(r => r.bottom)) }; } }
    const hit = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (let j = i + 1; j < boxes.length; j++) { const ar = hit(a, boxes[j]); if (ar > 1) note(out.overlaps, `${ch.id}|${a.id}|${boxes[j].id}`, `${t.toFixed(1)}s ${ch.id}: "${a.id}" × "${boxes[j].id}" (${ar.toFixed(0)} px²)`); }
      if (sub && hit(a, sub) > 1) note(out.subs, `${ch.id}|${a.id}|sub`, `${t.toFixed(1)}s ${ch.id}: "${a.id}" × altyazı`);
      if (a.x0 < 4 || a.y0 < 4 || a.x1 > W - 4 || a.y1 > H - 4) note(out.margins, `${ch.id}|${a.id}|m`, `${t.toFixed(1)}s ${ch.id}: "${a.id}" kenara ${Math.min(a.x0, a.y0, W - a.x1, H - a.y1).toFixed(0)} px`);
    }
    if (out.frames % 50 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return out;
}, step);
console.log(`${w}×${h}, her ${step} sn: ${res.frames} kare, ${res.texts} yazı kutusu`);
console.log(`yazı × yazı çakışması: ${res.overlaps.length}${res.overlaps.length ? '\n  ' + res.overlaps.join('\n  ') : ''}`);
console.log(`yazı × altyazı: ${res.subs.length}${res.subs.length ? '\n  ' + res.subs.join('\n  ') : ''}`);
console.log(`kenar payı < 4 px: ${res.margins.length}${res.margins.length ? '\n  ' + res.margins.join('\n  ') : ''}`);
await browser.close();
process.exit(res.overlaps.length + res.subs.length + res.margins.length ? 1 : 0);
