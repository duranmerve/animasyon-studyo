// Player: layout, the code sheet, scene cross-fades, the narration-driven clock, word-by-word subtitles,
// controls and the ?video=1 contract (window.__video).
import { C, SANS, MONO, clamp, lerp, eo, eio, ramp, rand, rr, card, text, codeBody } from './draw.js';
import { SECTIONS, RAIL } from './narration.js';
import { buildTimeline, sectionAt, LEAD } from './timeline.js';
import { play as playSfx } from './sfx.js';
import * as A from './scenes1.js';
import * as B from './scenes2.js';

const SCENES = { ...A, ...B };
const Q = new URLSearchParams(location.search);
const VIDEO = Q.get('video') === '1';
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('sbi.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sbi.' + k, JSON.stringify(v)); } catch { } },
};

let TL = null;              // timeline
let T = 0;                  // story time (s)
let playing = false, started = false;
let rate = store.get('rate', 1);
let narr = store.get('narr', true);
let cc = store.get('cc', true);
let ccSize = store.get('ccSize', 'm');
const stats = { seeks: 0, midSeeks: 0, backwards: 0, waits: 0, drift: [], frames: 0 };
window.__stats = stats;

// ------------------------------------------------------------------ layout
const cv = $('#stage'), g = cv.getContext('2d');
let L = null, paper = null;
function layout() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const portrait = h > w * 1.05;
  let W, H;
  if (portrait) { W = 1000; H = Math.max(1500, 1000 * h / w); } else { W = 1600; H = 900; }
  const s = Math.min(w / W, h / H);
  const ox = (w - W * s) / 2, oy = portrait ? 0 : (h - H * s) / 2;
  L = { w, h, dpr, portrait, W, H, s, ox, oy };
  if (portrait) {
    L.head = { h: 150 };
    L.dia = { x: 0, y: 170, w: 1000, h: 640 };
    L.wide = { x: 0, y: 190, w: 1000, h: 1000 * 640 / 1400 };
    L.code = { x: 30, y: 840, w: 940, h: Math.max(260, H - 840 - 300), size: 23 };
  } else {
    L.head = { h: 96 };
    L.code = { x: 40, y: 124, w: 520, h: 596, size: 19 };
    L.dia = { x: 590, y: 118, w: 980, h: 980 * 640 / 1000 };
    L.wide = { x: 80, y: 118, w: 1440, h: 1440 * 640 / 1400 };
  }
  paper = makePaper();
  document.documentElement.style.setProperty('--sub-bottom', portrait ? '84px' : '78px');
}
function makePaper() {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.fillStyle = C.paper; x.fillRect(0, 0, c.width, c.height);
  const k = L.s * L.dpr;
  x.setTransform(k, 0, 0, k, L.ox * L.dpr, L.oy * L.dpr);
  const W = L.w / L.s + 400, H = L.h / L.s + 400;
  for (let gx = -200; gx < W; gx += 20) { x.fillStyle = gx % 100 === 0 ? 'rgba(40,86,184,0.10)' : 'rgba(40,86,184,0.045)'; x.fillRect(gx, -200, gx % 100 === 0 ? 1.2 : 0.8, H); }
  for (let gy = -200; gy < H; gy += 20) { x.fillStyle = gy % 100 === 0 ? 'rgba(40,86,184,0.10)' : 'rgba(40,86,184,0.045)'; x.fillRect(-200, gy, W, gy % 100 === 0 ? 1.2 : 0.8); }
  x.setTransform(1, 0, 0, 1, 0, 0);
  const r = rand(99);
  for (let i = 0; i < c.width * c.height / 900; i++) { x.fillStyle = `rgba(90,70,40,${0.025 + r() * 0.04})`; x.fillRect(r() * c.width, r() * c.height, 1 + r() * 1.5, 1 + r() * 1.5); }
  const vg = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(80,60,30,0.10)');
  x.fillStyle = vg; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ------------------------------------------------------------------ scene helpers
function scope(sec) { return { at: k => (k === 0 ? 0 : sec.marks[k] ?? 1e9), dur: sec.dur }; }
function codeStates(sec) {
  const sc = SCENES[sec.id];
  if (!sc.code) return null;
  const out = []; let prev = {};
  for (const st of sc.code) { const s = { ...prev, ...st }; if (!('hl' in st)) s.hl = prev.hl; if (!st.code && !st.file) s.type = false; out.push(s); prev = s; }
  return out.map(s => ({ ...s, t: s.at === 0 ? 0 : sec.marks[s.at] ?? 1e9 }));
}

function drawHeader(sec, lt) {
  const P = L.portrait;
  const a = eo(ramp(lt, 0, 0.6));
  const num = String(sec.index + 1).padStart(2, '0');
  text(g, num, P ? 40 : 44, P ? 58 : 52, { size: P ? 44 : 38, font: MONO, weight: 700, color: C.red });
  text(g, sec.title, P ? 118 : 110, P ? 60 : 53, { size: P ? 46 : 36, weight: 800, alpha: a, max: P ? 850 : 780 });
  // the run() rail: which part of the story we are in
  const x0 = P ? 44 : 900, x1 = P ? 956 : 1560, y = P ? 124 : 52;
  g.save(); g.strokeStyle = 'rgba(28,34,48,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.restore();
  RAIL.forEach((r, i) => {
    const x = lerp(x0, x1, i / (RAIL.length - 1));
    const cur = i === sec.rail, past = i < sec.rail;
    g.beginPath(); g.arc(x, y, cur ? 9 : 6, 0, 7); g.fillStyle = cur ? C.red : past ? C.ink : C.shade; g.fill();
    text(g, r, x, y + (P ? -26 : 26), { size: 16, font: MONO, weight: cur ? 700 : 500, align: i === 0 ? 'left' : i === RAIL.length - 1 ? 'right' : 'center', color: cur ? C.red : C.ink2 });
  });
}

function drawCode(sec, lt, alpha) {
  if (alpha <= 0) return;
  const R = L.code;
  const states = codeStates(sec);
  if (!states) return;
  let i = 0;
  for (let k = 0; k < states.length; k++) if (lt >= states[k].t) i = k;
  const cur = states[i], prev = states[i - 1];
  const changed = prev && (prev.code !== cur.code || prev.file !== cur.file);
  const k = prev ? eo(ramp(lt, cur.t, 0.45)) : 1;
  card(g, R.x, R.y, R.w, R.h, { fill: C.sheet, r: 10, alpha, lift: 1 });
  // file tab
  const file = changed && k < 0.5 ? prev.file : cur.file;
  g.save(); g.globalAlpha *= alpha;
  rr(g, R.x + 16, R.y - 20, Math.min(R.w - 32, 34 + file.length * R.size * 0.62), 36, 8); g.fillStyle = C.ink; g.fill();
  g.restore();
  text(g, file, R.x + 32, R.y - 1, { size: R.size * 0.86, font: MONO, weight: 700, color: '#fff', alpha, max: R.w - 64 });
  // highlight band glides between ranges
  const band = s => s && s.hl ? [s.hl[0] - 1, s.hl[1] - s.hl[0] + 1] : [0, 0];
  const [y1, h1] = band(cur), [y0, h0] = prev && !changed ? band(prev) : band(cur);
  const hk = prev && !changed ? eio(ramp(lt, cur.t, 0.4)) : 1;
  const hlY = lerp(y0, y1, hk), hlH = lerp(h0, h1, hk);
  const hlA = cur.hl ? 1 : 1 - hk;
  const inner = { x: R.x + 8, y: R.y + 14, w: R.w - 16, h: R.h - 22 };
  const reveal = cur.type ? ramp(lt, cur.t, 1.6) : 1;
  const fit = st => Math.max(13, Math.min(R.size, (inner.w - 60) / (0.61 * Math.max(...st.code.split(/\n/).map(l => l.length)))));
  if (changed) {
    codeBody(g, prev, inner.x, inner.y - 20 * k, inner.w, inner.h, { alpha: alpha * (1 - k), size: fit(prev), hlY: band(prev)[0], hlH: prev.hl ? band(prev)[1] : 0 });
    codeBody(g, cur, inner.x, inner.y + 20 * (1 - k), inner.w, inner.h, { alpha: alpha * k, size: fit(cur), hlY: y1, hlH: cur.hl ? h1 : 0, reveal });
  } else codeBody(g, cur, inner.x, inner.y, inner.w, inner.h, { alpha, size: fit(cur), hlY, hlH: hlH * (hlA > 0 ? 1 : 0), reveal });
}

function drawScene(sec, lt, alpha) {
  if (alpha <= 0) return;
  const sc = SCENES[sec.id];
  const R = sc.wide ? L.wide : L.dia;
  const nw = sc.wide ? 1400 : 1000;
  g.save();
  g.translate(R.x, R.y); const k = R.w / nw; g.scale(k, k);
  g.globalAlpha = alpha;
  sc.draw(g, lt, scope(sec));
  g.restore();
}

// renders the story at time t
function render(t) {
  stats.frames++;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(paper, 0, 0);
  const k = L.s * L.dpr;
  g.setTransform(k, 0, 0, k, L.ox * L.dpr, L.oy * L.dpr);
  const sec = sectionAt(TL, t), lt = t - sec.start;
  const prev = TL.secs[sec.index - 1];
  const X = 0.6, x = prev ? eio(ramp(lt, 0, X)) : 1;
  drawHeader(sec, lt);
  const hasCode = s => !!SCENES[s.id].code;
  // code sheet: stays put across sections when both have one
  if (hasCode(sec) && prev && hasCode(prev) && x < 1) {
    drawCode(prev, prev.dur, 1 - x); drawCode(sec, lt, x);
  } else {
    if (prev && hasCode(prev) && x < 1) drawCode(prev, prev.dur, 1 - x);
    if (hasCode(sec)) drawCode(sec, lt, x);
  }
  if (prev && x < 1) drawScene(prev, prev.dur, 1 - x);
  drawScene(sec, lt, x);
  renderSubs(sec, lt);
}

// ------------------------------------------------------------------ subtitles
const subsEl = $('#subs');
let subKey = null, subSpans = [];
function renderSubs(sec, lt) {
  subsEl.classList.toggle('off', !cc);
  if (!cc) return;
  const ch = sec.chunks.find(c => lt >= c.t0 && lt < c.t1);
  const key = ch ? sec.id + ':' + ch.t0 : null;
  if (key !== subKey) {
    subKey = key; subSpans = [];
    subsEl.innerHTML = '';
    if (ch) {
      for (const line of ch.lines) {
        const div = document.createElement('div');
        line.forEach((w, i) => {
          const s = document.createElement('span'); s.className = 'w'; s.textContent = w.w;
          div.appendChild(s); if (i < line.length - 1) div.appendChild(document.createTextNode(' '));
          subSpans.push([s, w.t]);
        });
        subsEl.appendChild(div);
      }
    }
  }
  for (const [s, wt] of subSpans) { const on = lt >= wt - 0.05; if (s._on !== on) { s._on = on; s.classList.toggle('on', on); } }
}

// ------------------------------------------------------------------ audio: narration clock + sound effects
const clips = new Map();
function audioFor(sec) {
  if (!sec.clip) return null;
  let a = clips.get(sec.id);
  if (!a) { a = new Audio(sec.clip.file); a.preload = 'auto'; a.preservesPitch = true; clips.set(sec.id, a); }
  return a;
}
function keepClips(sec) {
  const keep = new Set([sec.id, TL.secs[sec.index + 1]?.id]);
  for (const s of [sec, TL.secs[sec.index + 1]]) if (s && narr) audioFor(s);
  for (const [id, a] of clips) if (!keep.has(id)) { a.pause(); a.removeAttribute('src'); a.load(); clips.delete(id); }
}
function pauseAll() { for (const a of clips.values()) a.pause(); }
window.__clipsPlaying = () => [...clips.values()].filter(a => !a.paused).length;

let actx = null, sfxBus = null, need = true, curSec = null;
const EVENTS = [];
function collectEvents() {
  EVENTS.length = 0;
  for (const s of TL.secs) for (const [m, type, off = 0] of SCENES[s.id].sfx || []) {
    const lt = m === 0 ? 0 : s.marks[m];
    if (lt !== undefined && lt < 1e8) EVENTS.push({ t: s.start + lt + off, type });
  }
  EVENTS.sort((a, b) => a.t - b.t);
}

function step(dt) {
  const before = T;
  const sec = sectionAt(TL, T);
  if (curSec !== sec.id) { curSec = sec.id; need = true; keepClips(sec); }
  const clipT = T - sec.start - LEAD;
  const a = narr ? audioFor(sec) : null;
  for (const [id, x] of clips) if (x !== a && !x.paused) x.pause();
  let voiced = false;
  if (a && clipT >= 0 && clipT < sec.clip.dur - 0.06 && !a.ended) {
    if (a.paused || need) {
      if (!need && clipT > 0.1) stats.midSeeks++;         // must stay 0: a playing clip is never re-seeked
      if (Math.abs(a.currentTime - clipT) > 0.08) { a.currentTime = clipT; stats.seeks++; }
      a.playbackRate = rate; a.play().catch(() => { });
      need = false;
    }
    if (a.readyState < 3 || a.seeking) { stats.waits++; return; }
    voiced = true;
    const target = sec.start + LEAD + a.currentTime;
    const diff = target - T;
    let adv;
    if (diff > 0.5) adv = diff;
    else if (diff < -0.5) adv = 0;
    else adv = Math.max(0, dt * rate + diff * Math.min(1, dt * 4));
    T += adv;
    stats.drift.push(Math.abs(target - T));
    if (stats.drift.length > 5000) stats.drift.shift();
  } else T += dt * rate;
  if (T < before) stats.backwards++;
  if (T >= TL.duration) { T = TL.duration; setPlaying(false); }
  // sound effects crossing now
  if (actx && sfxBus) {
    sfxBus.gain.setTargetAtTime(voiced ? 0.32 : 0.75, actx.currentTime, 0.08);
    for (const e of EVENTS) { if (e.t > T) break; if (e.t > before && e.t > T - 0.3) playSfx(actx, sfxBus, e.type, actx.currentTime + 0.01); }
  }
}

// ------------------------------------------------------------------ controls
function setPlaying(p) {
  playing = p;
  document.body.classList.toggle('playing', p);
  $('#play').setAttribute('aria-label', p ? 'Duraklat' : 'Oynat');
  if (!p) pauseAll(); else need = true;
  poke();
}
function seek(t) {
  T = clamp(t, 0, TL.duration - 0.01);
  pauseAll(); need = true; curSec = null; subKey = null;
  if (!playing) render(T);
}
function jump(d) {
  const sec = sectionAt(TL, T);
  const lt = T - sec.start;
  const i = d < 0 && lt > 2.5 ? sec.index : sec.index + d;
  seek(TL.secs[clamp(i, 0, TL.secs.length - 1)].start);
}
function setCC(v) { cc = v; store.set('cc', v); $('#cc').classList.toggle('on', v); subKey = null; if (!playing) render(T); }
function setNarr(v) { narr = v; store.set('narr', v); $('#narr').classList.toggle('on', v); if (!v) pauseAll(); need = true; }
function setRate(v) { rate = v; store.set('rate', v); for (const a of clips.values()) a.playbackRate = v; $('#rate').textContent = (v + '×').replace('.', ','); }
function setSize(v) { ccSize = v; store.set('ccSize', v); document.body.dataset.cc = v; document.querySelectorAll('#sizes button').forEach(b => b.classList.toggle('on', b.dataset.s === v)); }

let idle = 0;
function poke() { idle = performance.now(); document.body.classList.remove('idle'); }

function buildControls() {
  const bar = $('#ticks');
  for (const s of TL.secs) {
    const d = document.createElement('i'); d.style.left = (s.start / TL.duration * 100) + '%'; d.title = s.title; bar.appendChild(d);
  }
  $('#play').onclick = () => { if (!started) return begin(); setPlaying(!playing); };
  $('#prev').onclick = () => jump(-1);
  $('#next').onclick = () => jump(1);
  $('#cc').onclick = () => setCC(!cc);
  $('#narr').onclick = () => setNarr(!narr);
  $('#rate').onclick = () => { const R = [0.75, 1, 1.25, 1.5]; setRate(R[(R.indexOf(rate) + 1) % R.length]); };
  $('#gear').onclick = e => { e.stopPropagation(); $('#menu').classList.toggle('open'); };
  document.addEventListener('click', e => { if (!e.target.closest('#menu')) $('#menu').classList.remove('open'); });
  document.querySelectorAll('#sizes button').forEach(b => b.onclick = () => setSize(b.dataset.s));
  $('#full').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  const track = $('#track');
  const at = e => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * TL.duration; };
  let drag = false;
  track.addEventListener('pointerdown', e => { drag = true; track.setPointerCapture(e.pointerId); seek(at(e)); });
  track.addEventListener('pointermove', e => { if (drag) seek(at(e)); const r = track.getBoundingClientRect(); const s = sectionAt(TL, at(e)); $('#tip').textContent = s.title; $('#tip').style.left = clamp(e.clientX - r.left, 60, r.width - 60) + 'px'; });
  track.addEventListener('pointerup', () => { drag = false; });
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!started) begin(); else setPlaying(!playing); }
    else if (e.key === 'ArrowRight') jump(1);
    else if (e.key === 'ArrowLeft') jump(-1);
    else if (e.key === 'c' || e.key === 'C') setCC(!cc);
    else if (e.key === 'n' || e.key === 'N') setNarr(!narr);
    else if (e.key === 'f' || e.key === 'F') $('#full').onclick();
    poke();
  });
  addEventListener('pointermove', poke);
  addEventListener('touchstart', poke, { passive: true });
  setCC(cc); setNarr(narr); setRate(rate); setSize(ccSize);
}
function updateBar() {
  $('#fill').style.width = (T / TL.duration * 100) + '%';
  const f = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  $('#time').textContent = `${f(T)} / ${f(TL.duration)}`;
  if (playing && performance.now() - idle > 2800 && !$('#menu').classList.contains('open')) document.body.classList.add('idle');
}

function begin() {
  started = true;
  $('#start').classList.add('gone');
  try { actx = new AudioContext(); sfxBus = actx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(actx.destination); } catch { }
  if (L.portrait) { $('#hint').classList.add('show'); setTimeout(() => $('#hint').classList.remove('show'), 6500); }
  setPlaying(true);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) step(dt);
  render(T);
  updateBar();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ video contract
function wav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { out.setInt16(o, clamp(data[c][i], -1, 1) * 32767, true); o += 2; }
  return new Uint8Array(out.buffer);
}
function srtTime(s) {
  s = Math.max(0, s);
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
let soundChunks = [];
function installVideo() {
  document.body.classList.add('video');
  if (Q.get('subs') !== '1') cc = false;
  $('#start').classList.add('gone');
  window.__video = {
    duration: TL.duration,
    renderAt(t) { T = t; subKey = subKey; render(t); },
    async prepareSound(from, to) {
      const sr = 48000, len = Math.max(0.1, to - from);
      const oc = new OfflineAudioContext(2, Math.ceil(sr * len), sr);
      const bus = oc.createGain(); bus.connect(oc.destination);
      for (const s of TL.secs) {
        if (!s.clip) continue;
        const c0 = s.start + LEAD, c1 = c0 + s.clip.dur;
        if (c1 < from || c0 > to) continue;
        const buf = await oc.decodeAudioData(await (await fetch(s.clip.file)).arrayBuffer());
        const src = oc.createBufferSource(); src.buffer = buf; src.connect(oc.destination);
        if (c0 >= from) src.start(c0 - from); else src.start(0, from - c0);
      }
      const voicedAt = t => TL.secs.some(s => s.clip && t >= s.start + LEAD && t < s.start + LEAD + s.clip.dur);
      for (const e of EVENTS) if (e.t >= from && e.t < to) playSfx(oc, bus, e.type, e.t - from, voicedAt(e.t) ? 0.32 : 0.75);
      const bytes = wav(await oc.startRendering());
      soundChunks = [];
      const CH = 1 << 21;
      for (let i = 0; i < bytes.length; i += CH) {
        let s = ''; const part = bytes.subarray(i, i + CH);
        for (let j = 0; j < part.length; j += 0x8000) s += String.fromCharCode.apply(null, part.subarray(j, j + 0x8000));
        soundChunks.push(btoa(s));
      }
      return soundChunks.length;
    },
    soundChunk: i => soundChunks[i],
    srt(from = 0, to = TL.duration) {
      let n = 0; const out = [];
      for (const s of TL.secs) for (const c of s.chunks) {
        const a = s.start + c.t0, b = s.start + c.t1;
        if (b <= from || a >= to) continue;
        out.push(`${++n}\n${srtTime(a - from)} --> ${srtTime(Math.min(b, to) - from)}\n${c.lines.map(l => l.map(w => w.w).join(' ')).join('\n')}\n`);
      }
      return out.join('\n');
    },
    chapters(from = 0) {
      return TL.secs.filter(s => s.start + s.dur > from).map((s, i) => ({ t: i === 0 ? 0 : Math.max(0, s.start - from), title: s.title }));
    },
  };
}

// ------------------------------------------------------------------ boot
async function main() {
  let manifest = null;
  try { manifest = await (await fetch('manifest.json')).json(); } catch { }
  TL = buildTimeline(manifest);
  window.__timeline = TL;
  collectEvents();
  await Promise.all([`800 40px 'Bricolage Grotesque'`, `600 40px 'Bricolage Grotesque'`, `500 40px 'Bricolage Grotesque'`, `700 20px 'JetBrains Mono'`, `500 20px 'JetBrains Mono'`, `400 20px 'JetBrains Mono'`].map(f => document.fonts.load(f).catch(() => { })));
  layout();
  addEventListener('resize', () => { layout(); subKey = null; if (!playing) render(T); });
  // warm-up: draw every scene once so the first real frames do not stutter
  for (const s of TL.secs) render(s.start + s.dur * 0.6);
  buildControls();
  if (VIDEO) { installVideo(); T = 0; render(0); window.__ready = true; return; }
  // behind the start screen: the strongest still (auto-configuration's chain of conditions)
  const ac = TL.secs.find(s => s.id === 'autoconfig');
  T = ac.start + (ac.marks.chain ?? ac.dur * 0.9) + 1.2;
  render(T);
  const f = s => `${Math.floor(s / 60)} dk`;
  $('#len').textContent = `${f(TL.duration)} · ${TL.secs.length} bölüm · sesli anlatım`;
  $('#go').onclick = () => { T = 0; begin(); };
  window.__ready = true;
  requestAnimationFrame(t => { last = t; frame(t); });
}
main();

// test hooks
window.__player = { seek, setPlaying, get T() { return T; }, get playing() { return playing; }, setCC, setNarr, begin: () => { T = 0; begin(); } };
