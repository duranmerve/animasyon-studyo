// find where the first render at t differs from the second: node dev/puritydiff.mjs <t> [prevT]
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('../../../../node_modules/sharp');
const [t = 12.375, prev = 0] = process.argv.slice(2).map(Number);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=0', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 240000 });
const grab = async tt => { const u = await page.evaluate(tt => { window.__video.renderAt(tt); return document.querySelector('canvas').toDataURL('image/png'); }, tt); return Buffer.from(u.split(',')[1], 'base64'); };
await grab(prev);
const a = await grab(t), b = await grab(t);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true }), B = await sharp(b).raw().toBuffer();
const { width, height, channels } = A.info; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, mx = 0;
for (let i = 0; i < width * height; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * channels + c] - B[i * channels + c])); if (d > 0) { n++; const x = i % width, y = (i / width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); mx = Math.max(mx, d); } }
console.log(`t=${t} after ${prev}: ${n} px differ, box ${x0},${y0} → ${x1},${y1}, max ${mx}`);
await sharp(a).toFile('C:/Users/EYP~1/AppData/Local/Temp/claude/c--Users-Ey-p-Desktop-animasyon-lab/a31edc26-5cba-4a70-a4bc-9bd1593e85d9/scratchpad/pa.png');
await sharp(b).toFile('C:/Users/EYP~1/AppData/Local/Temp/claude/c--Users-Ey-p-Desktop-animasyon-lab/a31edc26-5cba-4a70-a4bc-9bd1593e85d9/scratchpad/pb.png');
await browser.close();
