// Player: story clock that follows the narration, camera, drawing, subtitles and controls.
import { CHAPTERS } from './story.js';
import { compile, makeClock, letterShare, shownToSaid } from './text.js';
import * as Paint from './paint.js';
import { SCENES, worldState, drawWorld, CAMS } from './scenes.js';
import { Subtitles } from './subs.js';
import { Sound } from './sound.js';

const LEAD = 0.6, TAIL = 0.9;
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem('fetih1453.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('fetih1453.' + k, String(v)); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- timeline from the recordings
let manifest = { lines: {} };
try { manifest = await (await fetch('narration.json')).json(); } catch { /* no voice: reading-speed fallback */ }

const chapters = [];
let total = 0;
CHAPTERS.forEach((ch, i) => {
  const c = compile(ch.text);
  const m = manifest.lines?.[ch.id];
  const clip = m?.dur ?? (1.3 + c.said.length / 14.5);
  const clock = makeClock(c.said, m?.words, clip);
  const at = saidPos => LEAD + clock(letterShare(c.said, saidPos));
  const cue = name => {
    if (!(name in c.cues)) { console.warn(`${ch.id}: cue @${name} yok`); return LEAD; }
    return at(c.cues[name]);
  };
  const words = [];
  for (const m2 of c.shown.matchAll(/\S+/g)) words.push({ text: m2[0], t: at(shownToSaid(c.anchors, m2.index)) });
  const dur = LEAD + clip + TAIL;
  chapters.push({ ...ch, i, c, clip, file: m?.file || null, start: total, dur, at, cue, words });
  total += dur;
});
const TOTAL = total;
const chapterAt = T => { let i = 0; while (i < chapters.length - 1 && chapters[i + 1].start <= T) i++; return i; };

// global camera keyframes: [time, cam, duration]; starting camera of each move precomputed so cam(T) is pure
const keys = [];
for (const ch of chapters) for (const [t, cam, d] of CAMS[ch.id](ch.cue, ch)) keys.push({ t: ch.start + t, cam, d: d ?? 2.4 });
keys.sort((a, b) => a.t - b.t);
const lerp = (a, b, f) => a + (b - a) * f;
const ease = f => f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
function camMove(a, b, f) {
  const e = ease(Math.max(0, Math.min(1, f)));
  // zoom out a little on long moves so the viewer keeps their bearings
  const dist = Math.hypot(b.x - a.x, b.y - a.y), lift = Math.max(0, dist * 0.9 - Math.max(a.span, b.span)) * Math.sin(Math.PI * e) * 0.6;
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), span: Math.exp(lerp(Math.log(a.span), Math.log(b.span), e)) + lift };
}
keys[0].from = keys[0].cam;
for (let k = 1; k < keys.length; k++) {
  const p = keys[k - 1];
  keys[k].from = camMove(p.from, p.cam, (keys[k].t - p.t) / p.d);
}
function camera(T) {
  let k = 0;
  while (k < keys.length - 1 && keys[k + 1].t <= T) k++;
  return camMove(keys[k].from, keys[k].cam, (T - keys[k].t) / keys[k].d);
}

// ---------------------------------------------------------------- canvas and view
const canvas = $('#stage'), ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  subs.layout(W);
}
// the panel ("levha") takes the right side on wide screens and the upper part on tall ones
export function panelRect() {
  if (W >= H * 1.05) {
    const w = Math.min(W * 0.4, 640), h = Math.min(H - 190, w * 0.95);
    return { x: W - w - Math.max(20, W * 0.03), y: Math.max(90, (H - 60 - h) / 2 - 10), w, h, side: 'right' };
  }
  const w = W - 24, h = Math.min(H * 0.4, w * 0.9);
  return { x: 12, y: 104, w, h, side: 'top' };
}
function makeView(cam, open) {
  const r = panelRect();
  let vx0 = 0, vy0 = 0, vw = W, vh = H - 58;
  if (r.side === 'right') vw = lerp(W, r.x, open);
  else { vy0 = lerp(0, r.y + r.h, open); vh = H - 58 - vy0; }
  // landscape subjects: on a tall screen crop the sides a little rather than shrinking everything
  const s = Math.min(vw / cam.span, vh / (cam.span * 0.5625)) * (W < H ? 1.35 : 1);
  return { W, H, dpr: DPR, cx: cam.x, cy: cam.y, s, vx: vx0 + vw / 2, vy: vy0 + vh / 2 - (W < H ? 0 : 10), panel: r, open };
}

// ---------------------------------------------------------------- UI
const subs = new Subtitles($('#subs'), chapters);
const sound = new Sound(chapters);
let T = Math.max(0, Math.min(TOTAL, Number(params.get('t')) || 0));
if (params.get('ch')) { const c = chapters.find(c => c.id === params.get('ch')); if (c) T = c.start + (Number(params.get('t')) || 0); }
let playing = false, rate = Number(store.get('rate', 1)) || 1;
let voiceOn = store.get('voice', '1') === '1', ccOn = store.get('cc', '1') === '1';
document.body.dataset.subsize = store.get('size', 'm');
sound.enabled = store.get('sfx', '1') === '1';

function setToggles() {
  $('#cc').classList.toggle('off', !ccOn); $('#voice').classList.toggle('off', !voiceOn);
  $('#subs').classList.toggle('off', !ccOn);
  $('#speed').textContent = String(rate).replace('.', ',') + '×';
  for (const seg of document.querySelectorAll('.seg')) for (const b of seg.children) {
    const k = seg.dataset.k, cur = k === 'size' ? document.body.dataset.subsize : k === 'rate' ? String(rate) : sound.enabled ? '1' : '0';
    b.classList.toggle('on', b.dataset.v === cur);
  }
}

// progress bar with chapter ticks
const ticks = $('#track .ticks');
for (const ch of chapters.slice(1)) { const b = document.createElement('b'); b.style.left = (ch.start / TOTAL * 100) + '%'; ticks.appendChild(b); }
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
$('#len').textContent = Math.round(TOTAL / 60);

// ---------------------------------------------------------------- audio (narration clock)
const audios = new Map();
let cur = -1, needSeek = true, waiting = false, waitSince = 0;
const stats = { seeks: 0, seeksMid: 0, backwards: 0 };
function audioFor(i) {
  const ch = chapters[i];
  if (!ch?.file) return null;
  if (!audios.has(i)) { const a = new Audio(ch.file); a.preload = 'auto'; a.preservesPitch = true; audios.set(i, a); }
  return audios.get(i);
}
function keepAudio(i) {
  audioFor(i); audioFor(i + 1);
  for (const [k, a] of audios) if (k !== i && k !== i + 1) { a.pause(); a.removeAttribute('src'); a.load(); audios.delete(k); }
}
function stopAudio() { for (const a of audios.values()) a.pause(); }

function seek(t) {
  T = Math.max(0, Math.min(TOTAL - 0.01, t));
  stopAudio(); needSeek = true; cur = -1;
  sound.jump(T);
}
function play() {
  if (T >= TOTAL - 0.05) seek(0);
  playing = true; needSeek = true; document.body.classList.add('playing');
  sound.resume();
}
function pause() { playing = false; stopAudio(); document.body.classList.remove('playing'); sound.pauseAll(); }

let last = performance.now();
function step(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) {
    const i = chapterAt(T), ch = chapters[i], local = T - ch.start;
    if (i !== cur) { stopAudio(); cur = i; keepAudio(i); needSeek = true; }
    let next = T + dt * rate;
    const a = voiceOn && !ch.voiceFailed ? audioFor(i) : null;
    const wasWaiting = waiting;
    waiting = false;
    if (a && local + dt * rate >= LEAD && local < LEAD + ch.clip - 0.08 && !a.ended) {
      if (needSeek) { try { a.currentTime = Math.max(0, local - LEAD); } catch { /* not loaded yet */ } needSeek = false; stats.seeks++; if (local - LEAD > 0.3) stats.seeksMid++; }
      a.playbackRate = rate;
      if (a.paused) a.play().catch(() => {});
      if (a.readyState < 3 || a.seeking || a.paused) {
        next = T; waiting = true;
        if (!wasWaiting) waitSince = now;
        // a clip that fails or never arrives must not freeze the story: go on without it
        if (a.error || now - waitSince > 6000) { ch.voiceFailed = true; waiting = false; a.pause(); next = T + dt * rate; }
      }
      else {
        const target = ch.start + LEAD + a.currentTime, err = target - next;
        if (err > 0.3) next = target;              // the picture fell behind (a slow frame): catch up
        else if (err < -0.3) next = T;             // the voice is behind: the picture waits
        else next += err * Math.min(1, dt * 6);    // gentle pull toward the voice
      }
    }
    const prevT = T;
    if (next < T) stats.backwards++;
    T = Math.max(T, Math.min(next, TOTAL));
    sound.update(prevT, T, a && !a.paused && !waiting, rate);
    if (T >= TOTAL) pause();
  }
  // before the start the card sits on the finished map; the story then begins on blank paper
  render(started ? T : TOTAL - 0.4);
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- drawing
let lastSeal = '';
function render(T) {
  const i = chapterAt(T), ch = chapters[i], lt = T - ch.start;
  const sc = SCENES[ch.id];
  const open = sc.panel ? sc.panel(lt, ch.cue, ch) : 0;
  const view = makeView(camera(T), open);
  const st = worldState(chapters, T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  Paint.drawMap(ctx, view, st.map);
  drawWorld(ctx, view, st, T);
  Paint.paperGrain(ctx, view);
  if (st.night > 0) {
    Paint.screenTransform(ctx, view);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(40,62,140,${0.78 * st.night})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(8,16,48,${0.3 * st.night})`; ctx.fillRect(0, 0, W, H);
    sc.drawNight?.(ctx, view, lt, ch.cue, st, ch);
  }
  sc.draw?.(ctx, view, lt, ch.cue, st, ch);
  if (open > 0.001 && sc.drawPanel) {
    Paint.screenTransform(ctx, view);
    sc.drawPanel(ctx, view.panel, lt, ch.cue, open, ch);
  }
  sc.drawTop?.(ctx, view, lt, ch.cue, st, ch);
  vignette(view);
  compass(view, st);
  // seal
  const key = ch.id;
  if (key !== lastSeal) {
    lastSeal = key;
    $('.seal-no').textContent = `Bölüm ${i + 1} / ${chapters.length}`;
    $('.seal-title').textContent = ch.title;
    $('.seal-date').textContent = ch.seal;
    const days = $('.seal-days');
    days.hidden = ch.day === undefined;
    if (ch.day !== undefined) { days.querySelector('i').style.setProperty('--f', (ch.day / 53 * 100) + '%'); days.querySelector('span').textContent = ch.day >= 53 ? '53. gün' : ch.day <= 0 ? '1. gün' : `${Math.round(ch.day)}. gün`; }
  }
  $('#seal').classList.toggle('on', started && !(i === 0 && lt < ch.cue('armies') - 0.3));
  subs.render(i, lt, ccOn && started);
  const shown = started ? T : 0;
  $('#track .fill').style.width = (shown / TOTAL * 100) + '%';
  $('#time').textContent = `${fmt(shown)} / ${fmt(TOTAL)}`;
}
// compass rose and scale bar, top right
function compass(v, st) {
  const a = Math.min(1, st.map.reveal * 1.2);
  if (a <= 0) return;
  Paint.screenTransform(ctx, v);
  const small = W < 700, r = small ? 17 : 24, cx = W - (small ? 30 : 46), cy = small ? 34 : 46;
  ctx.save(); ctx.globalAlpha = a;
  for (let k = 0; k < 8; k++) {
    const ang = k * Math.PI / 4 - Math.PI / 2, len = k % 2 ? r * 0.55 : r;
    ctx.fillStyle = k === 0 ? Paint.RED : k % 2 ? Paint.GOLD : '#3A281B';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    ctx.lineTo(cx + Math.cos(ang + 0.5) * r * 0.2, cy + Math.sin(ang + 0.5) * r * 0.2); ctx.lineTo(cx, cy); ctx.lineTo(cx + Math.cos(ang - 0.5) * r * 0.2, cy + Math.sin(ang - 0.5) * r * 0.2); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = Paint.GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.font = `700 ${small ? 12 : 14}px ${Paint.FONT_SC}`; ctx.textAlign = 'center'; ctx.fillStyle = Paint.INK;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(247,238,219,0.9)'; ctx.strokeText('K', cx, cy - r - 5); ctx.fillText('K', cx, cy - r - 5);
  // scale bar: the largest round length that fits in ~120 px
  const opts = [0.1, 0.2, 0.25, 0.5, 1, 2, 3, 5];
  let km = opts[0]; for (const o of opts) if (o * v.s <= (small ? 90 : 130)) km = o;
  const bw = km * v.s, bx = cx + r - bw, by = cy + r + (small ? 22 : 30);
  ctx.fillStyle = 'rgba(247,238,219,0.85)'; ctx.fillRect(bx - 6, by - 16, bw + 12, 26);
  ctx.fillStyle = Paint.INK; ctx.fillRect(bx, by, bw, 4); ctx.fillStyle = 'rgba(247,238,219,1)'; ctx.fillRect(bx + bw / 2, by + 1, bw / 2 - 1, 2);
  ctx.fillStyle = Paint.INK; ctx.font = `700 ${small ? 12 : 14}px ${Paint.FONT}`; ctx.textAlign = 'right';
  ctx.fillText(km >= 1 ? `${km} km` : `${Math.round(km * 1000)} m`, bx + bw, by - 4);
  ctx.restore();
}
function vignette(v) {
  Paint.screenTransform(ctx, v);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(60,35,15,0)'); g.addColorStop(1, 'rgba(60,35,15,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- controls
let started = false;
$('#play').onclick = () => (playing ? pause() : play());
$('#prev').onclick = () => { const i = chapterAt(T); seek(chapters[T - chapters[i].start > 2 ? i : Math.max(0, i - 1)].start); };
$('#next').onclick = () => { const i = chapterAt(T); if (i < chapters.length - 1) seek(chapters[i + 1].start); };
$('#cc').onclick = () => { ccOn = !ccOn; store.set('cc', ccOn ? 1 : 0); setToggles(); };
$('#voice').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn ? 1 : 0); if (!voiceOn) stopAudio(); needSeek = true; setToggles(); };
const rates = [0.75, 1, 1.25, 1.5];
function setRate(r) { rate = r; store.set('rate', r); for (const a of audios.values()) a.playbackRate = r; setToggles(); }
$('#speed').onclick = () => setRate(rates[(rates.indexOf(rate) + 1) % rates.length]);
$('#gear').onclick = e => { e.stopPropagation(); $('#menu').hidden = !$('#menu').hidden; };
document.addEventListener('click', e => { if (!$('#menu').hidden && !e.target.closest('#menu') && !e.target.closest('#gear')) $('#menu').hidden = true; });
for (const seg of document.querySelectorAll('.seg')) seg.onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = seg.dataset.k, v = b.dataset.v;
  if (k === 'size') { document.body.dataset.subsize = v; store.set('size', v); subs.layout(W); }
  if (k === 'rate') setRate(Number(v));
  if (k === 'sfx') { sound.enabled = v === '1'; store.set('sfx', v); }
  setToggles();
};
$('#full').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };

const track = $('#track'), tip = track.querySelector('.tip');
const tAt = e => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * TOTAL; };
track.addEventListener('pointermove', e => { const t = tAt(e), c = chapters[chapterAt(t)]; tip.textContent = `${chapterAt(t) + 1}. ${c.title}`; tip.style.left = (t / TOTAL * 100) + '%'; if (track.classList.contains('drag')) seek(t); });
track.addEventListener('pointerdown', e => { track.setPointerCapture(e.pointerId); track.classList.add('drag'); seek(tAt(e)); });
track.addEventListener('pointerup', () => track.classList.remove('drag'));
track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') seek(T + 5); if (e.key === 'ArrowLeft') seek(T - 5); });

document.addEventListener('keydown', e => {
  if (e.target.closest?.('#track') && e.key.startsWith('Arrow')) return;
  if (!started && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); begin(); return; }
  if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playing ? pause() : play(); }
  else if (e.key === 'ArrowRight') $('#next').click();
  else if (e.key === 'ArrowLeft') $('#prev').click();
  else if (e.key === 'c' || e.key === 'C') $('#cc').click();
  else if (e.key === 'n' || e.key === 'N') $('#voice').click();
  else if (e.key === 'f' || e.key === 'F') $('#full').click();
});
let idleTimer;
const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add('idle'), 2800); };
for (const ev of ['pointermove', 'pointerdown', 'keydown']) document.addEventListener(ev, wake);

function begin() {
  if (started) return;
  started = true;
  $('#start').classList.add('gone');
  sound.start();
  play(); wake();
}
$('#go').onclick = begin;

// ---------------------------------------------------------------- start: fonts, warm-up, go
window.addEventListener('resize', resize);
await Promise.race([Promise.all([document.fonts.load("500 20px 'Alegreya'"), document.fonts.load("700 20px 'Alegreya SC'"), document.fonts.load("800 20px 'Alegreya'"), document.fonts.load("italic 500 20px 'Alegreya'")]), new Promise(r => setTimeout(r, 2500))]);
Paint.initMap();
resize();
setToggles();
// warm-up: draw a few different moments once so the first real frames don't stall
for (const ch of chapters) { const s = SCENES[ch.id]; if (s.drawPanel) render(ch.start + ch.dur * 0.5); }
render(T);
if (T > 0) audioFor(chapterAt(T));
else audioFor(0);
$('#go').disabled = false; $('#go').textContent = 'Başlat';
if (params.get('autoplay') === '1') begin();
else if (params.get('shot') === '1') { started = true; $('#start').classList.add('gone'); }
if (params.get('poster') === '1') document.body.classList.add('poster');
requestAnimationFrame(step);

// hooks for tests and screenshots
window.__fetih = {
  chapters: chapters.map(c => ({ id: c.id, start: c.start, dur: c.dur, clip: c.clip })), total: TOTAL,
  get T() { return T; }, get playing() { return playing; }, get waiting() { return waiting; },
  seek, play, pause, render: t => { T = t; render(t); }, audio: () => audios.get(chapterAt(T)), stats, LEAD,
  chapterAt: t => chapterAt(t),
};
window.__fetihCue = (id, cue) => chapters.find(c => c.id === id).cue(cue);
