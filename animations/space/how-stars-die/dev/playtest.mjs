// Real-time playback tests in headless Chrome (GPU on).
//   node dev/playtest.mjs play [--from 20 --secs 25]   clock never goes back, audio–picture gap, console errors
//   node dev/playtest.mjs ends                          every section end at 1.06× speed: no rewind, no freeze
//   node dev/playtest.mjs toggle                        CC and narration buttons really hide/mute, choice remembered
//   node dev/playtest.mjs fps [--tiers high,mid,low,min] real rAF fps per tier at heavy moments + auto pick
import { open } from './serve.mjs';
const args = process.argv.slice(2), mode = args[0] || 'play';
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'HATA'} ${msg}`); if (!ok) fail++; };

async function start(query = '') {
  const s = await open(query, { w: 1280, h: 720 });
  await s.page.waitForFunction(() => !document.getElementById('go').disabled, { timeout: 120000 });
  await s.page.click('#go');
  await wait(300);
  return s;
}
async function sample(page, secs, every = 100) {
  const out = [];
  for (let i = 0; i < secs * 1000 / every; i++) { out.push(await page.evaluate(() => window.__state())); await wait(every); }
  return out;
}
function analyse(st, tl) {
  let back = 0, maxGap = 0, gaps = [], stalls = 0;
  for (let i = 1; i < st.length; i++) {
    if (st[i].storyT < st[i - 1].storyT - 1e-4) back++;
    if (st[i].playing && st[i].storyT === st[i - 1].storyT) stalls++;
    const sec = tl.find(s => s.id === st[i].section), a = st[i].audio[sec.id];
    if (a && !a.paused && st[i].storyT > sec.vs + 0.3 && st[i].storyT < sec.ve - 0.3) { const g = Math.abs(st[i].storyT - (sec.vs + a.t)); gaps.push(g); maxGap = Math.max(maxGap, g); }
  }
  return { back, maxGap, gaps: gaps.length, stalls };
}

if (mode === 'play') {
  const s = await start();
  const tl = await s.page.evaluate(() => window.__tl.sections.map(x => ({ id: x.id, vs: x.vs, ve: x.ve, end: x.end })));
  await s.page.evaluate(t => window.__seek(t), +opt('from', 20));
  const st = await sample(s.page, +opt('secs', 25));
  const r = analyse(st, tl);
  check(r.back === 0, `hikâye saati geri gitmedi (${r.back} geri adım)`);
  check(st.at(-1).storyT - st[0].storyT > +opt('secs', 25) * 0.85, `hikâye ilerledi: ${st[0].storyT.toFixed(1)} → ${st.at(-1).storyT.toFixed(1)} sn`);
  if (r.gaps) check(r.maxGap < 0.15, `ses–görüntü farkı en çok ${(r.maxGap * 1000).toFixed(0)} ms (${r.gaps} örnek)`);
  else console.log('UYARI ses hiç çalmadı (bu makinede tarayıcı ses dosyalarını alamıyor olabilir); senkron ölçülemedi');
  check(s.errors.length === 0, `konsol hatası: ${s.errors.length}${s.errors.length ? ' → ' + s.errors.slice(0, 3).join(' | ') : ''}`);
  await s.close();
}
if (mode === 'ends') {
  const s = await start();
  const tl = await s.page.evaluate(() => window.__tl.sections.map(x => ({ id: x.id, vs: x.vs, ve: x.ve, end: x.end })));
  await s.page.click('#bSpeed');   // 1.25×
  for (const sec of tl.slice(0, -1)) {
    await s.page.evaluate(t => window.__seek(t), sec.ve - 1.2);
    const st = await sample(s.page, 4.2, 100);
    const r = analyse(st, tl);
    const passed = st.at(-1).storyT > sec.end + 0.3;
    check(r.back === 0 && passed, `${sec.id}: sonundan geçti (${st[0].storyT.toFixed(1)} → ${st.at(-1).storyT.toFixed(1)}), geri adım ${r.back}`);
  }
  check(s.errors.length === 0, `konsol hatası: ${s.errors.length}`);
  await s.close();
}
if (mode === 'toggle') {
  let s = await start();
  await s.page.evaluate(t => window.__seek(t), 30);
  await wait(800);
  const vis = () => s.page.evaluate(() => window.__state().subsVisible);
  check(await vis(), 'altyazı başta görünüyor');
  await s.page.click('#bCC');
  let hidden = true;
  for (let i = 0; i < 16; i++) { if (await vis()) hidden = false; await wait(500); }
  check(hidden, 'CC kapalıyken 8 sn boyunca altyazı görünmedi');
  await s.page.click('#bNar');
  await wait(400);
  const st = await s.page.evaluate(() => window.__state());
  check(!st.nar && Object.values(st.audio).every(a => a.muted), 'anlatım kapatılınca kayıtlar sessiz');
  await s.page.reload({ waitUntil: 'load' });
  await s.page.waitForFunction(() => !document.getElementById('go').disabled, { timeout: 120000 });
  const st2 = await s.page.evaluate(() => window.__state());
  check(!st2.cc && !st2.nar, 'seçimler yeniden yüklemede hatırlandı');
  await s.page.click('#go'); await wait(500);
  await s.page.click('#bCC'); await s.page.click('#bNar'); await wait(300);
  const st3 = await s.page.evaluate(() => window.__state());
  check(st3.cc && st3.nar && st3.subsVisible, 'yeniden açıldı');
  check(s.errors.length === 0, `konsol hatası: ${s.errors.length}`);
  await s.close();
}
if (mode === 'fps') {
  const auto = await open('', { w: 1600, h: 900 });
  await auto.page.waitForFunction(() => !document.getElementById('go').disabled, { timeout: 120000 });
  console.log('otomatik seçim:', await auto.page.evaluate(() => window.__tier()), JSON.stringify(await auto.page.evaluate(() => window.__tierLog || [])));
  await auto.close();
  for (const tier of opt('tiers', 'high,mid,low,min').split(',')) {
    const s = await start(`tier=${tier}`);
    const spots = await s.page.evaluate(() => { const S = Object.fromEntries(window.__tl.sections.map(x => [x.id, x])); return [S.open.cue.burst, S.balance.cue.balance, S.giant.cue.earth, S.dwarf.cue.glow, S.onion.cue.onion, S.collapse.cue.boom, S.remnant.cue.crab, S.us.cue.us]; });
    const res = [];
    for (const t of spots) {
      await s.page.evaluate(tt => window.__seek(tt), t);
      await wait(400);
      res.push(await s.page.evaluate(() => new Promise(r => { const ts = []; let last = performance.now(); const f = now => { ts.push(now - last); last = now; if (ts.length < 150) requestAnimationFrame(f); else r(ts); }; requestAnimationFrame(f); })));
    }
    const all = res.flat(), fps = 1000 / (all.reduce((a, b) => a + b, 0) / all.length), slow = all.filter(x => x > 50).length;
    const worst = res.map(r => 1000 / (r.reduce((a, b) => a + b, 0) / r.length));
    console.log(`${tier.padEnd(5)} ort ${fps.toFixed(1)} fps · en kötü an ${Math.min(...worst).toFixed(1)} fps · 50 ms üstü kare ${slow}/${all.length}`);
    await s.close();
  }
}
console.log(fail ? `${fail} sorun` : 'tamam');
process.exit(fail ? 1 : 0);
