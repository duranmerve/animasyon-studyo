// poster.jpg for the site card: one strong frame, no subtitles.  node dev/poster.mjs [section.cue+offset]
import fs from 'fs';
import path from 'path';
import { open, DIR } from './serve.mjs';
const spec = process.argv[2] || 'dwarf.name+2';
const { page, close } = await open('video=1&subs=0', { w: 1280, h: 720 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
await page.evaluate(sp => { const [id, rest] = sp.split(/\.(.*)/s); const m = rest.match(/^([A-Za-z0-9]+)([+-][\d.]+)?$/); const s = window.__tl.sections.find(x => x.id === id); window.__video.renderAt(s.cue[m[1]] + (m[2] ? +m[2] : 0)); }, spec);
await page.screenshot({ path: path.join(DIR, 'poster.jpg'), type: 'jpeg', quality: 86 });
console.log(`poster.jpg (${spec}, ${(fs.statSync(path.join(DIR, 'poster.jpg')).size / 1024).toFixed(0)} KB)`);
await close();
