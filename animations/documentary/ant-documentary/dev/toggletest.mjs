import puppeteer from '../../../../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
await page.goto('http://127.0.0.1:5200/index.html?t=30', { waitUntil: 'load' });
await page.waitForFunction('window.__ok === true', { timeout: 240000 });
await page.click('#go'); await new Promise(r => setTimeout(r, 3000));
const vis = () => page.evaluate(() => { const s = document.getElementById('subs'); return s.style.display !== 'none' && s.textContent.trim().length > 0 && [...s.querySelectorAll('.w')].some(w => +w.style.opacity > 0.5); });
const before = await vis();
await page.keyboard.press('c');
let shown = 0; for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 500)); if (await vis()) shown++; }
await page.keyboard.press('c'); await new Promise(r => setTimeout(r, 1500)); const back = await vis();
await page.keyboard.press('n'); await new Promise(r => setTimeout(r, 1500));
const voiceOff = await page.evaluate(() => !window.__player.clip);
const t1 = await page.evaluate(() => window.__player.t); await new Promise(r => setTimeout(r, 2000)); const t2 = await page.evaluate(() => window.__player.t);
await page.keyboard.press('n'); await new Promise(r => setTimeout(r, 2500));
const voiceOn = await page.evaluate(() => !!window.__player.clip && !window.__player.clip.paused);
const stored = await page.evaluate(() => [localStorage.getItem('antlife.cc'), localStorage.getItem('antlife.voice')]);
console.log({ subsBefore: before, subsShownWhileOff: shown, subsBack: back, voiceOff, clockRunsWithoutVoice: t2 - t1, voiceBack: voiceOn, stored });
await browser.close();
