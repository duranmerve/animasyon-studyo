// poster.jpg: a clean frame (no text) at chapter/cue: node dev/poster.mjs fizik sip 1.5
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [chId = 'cayir', cue = 'target', add = 1.5] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=0', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 240000 });
await page.addStyleTag({ content: '#labels,#lines,#panels,#card,#scalebar,#subs,#subshade{display:none!important}' });
await page.evaluate((id, cue, add) => { const c = window.__tl.chapters.find(x => x.id === id); const t = c.start + c.cues[cue] + add; window.__video.renderAt(t - 0.1); window.__video.renderAt(t); }, chId, cue, +add);
await page.screenshot({ path: 'poster.jpg', type: 'jpeg', quality: 88 });
await browser.close();
