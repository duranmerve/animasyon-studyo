// 16:9 poster for the site card: node tools/poster.mjs [chapter.cue]
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';
const at = process.argv[2] || 'resolve.done';
const srv = await serve();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${srv.address().port}/?video=1`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__video');
const t = await page.evaluate(async a => {
  const m = await (await fetch('manifest.json')).json();
  const { buildTimeline } = await import('./src/timeline.js');
  const [id, c] = a.split('.');
  return buildTimeline(m).cue(id, c) + 2.5;
}, at);
await page.evaluate(t => window.__video.renderAt(t), t);
await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: 'poster.jpg', type: 'jpeg', quality: 86 });
console.log('poster.jpg @', t.toFixed(1));
await browser.close(); srv.close();
