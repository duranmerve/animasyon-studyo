// clean frames (no overlay, no subtitles) for the covers: node dev/thumbframes.mjs
import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const shots = [['face', 'hafta', 'age', 1.2], ['dance', 'dans', 'duration', 1.2], ['sky', 'gok', 'rings', 1.5], ['split', 'cayir', 'target', 1.8], ['night', 'gece', 'tomorrow', 3], ['heater', 'kovan', 'heater', 2]];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
await page.goto('http://127.0.0.1:5230/index.html?video=1&subs=0', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 240000 });
await page.addStyleTag({ content: '#fg,#subs,#subshade{display:none!important}' });
for (const [name, id, cue, add] of shots) {
  await page.evaluate((id, cue, add) => { const c = window.__tl.chapters.find(x => x.id === id); const t = c.start + c.cues[cue] + add; window.__video.renderAt(t - 0.1); window.__video.renderAt(t); }, id, cue, add);
  await page.screenshot({ path: `thumbs/${name}.jpg`, type: 'jpeg', quality: 90 });
}
await browser.close();
