// Player: the recording is the clock. Story time follows the narration, never goes back,
// waits while a clip loads, and the playing clip is never re-seeked because of a slow frame.
import { buildTimeline, toSrt, toChapters } from './timeline.js';
import { createScene } from './scene.js';
import { createSfx, synth } from './sfx.js';

const qs = new URLSearchParams(location.search);
const VIDEO = qs.has('video');
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('git-hatti.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('git-hatti.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const manifest = await fetch('manifest.json').then(r => r.json()).catch(() => null);
const tl = buildTimeline(manifest);
const scene = createScene(tl);
const sfx = createSfx();

// ---------------------------------------------------------------- canvas (resolution fixed per size)
const canvas = $('c'), ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
}
resize();

// fonts before the first real frame
await Promise.race([
  Promise.all(['800 20px "Barlow Condensed"', '700 20px "Barlow Condensed"', '500 20px Barlow', '600 20px Barlow', '700 20px Barlow', '800 20px Barlow',
    'italic 600 20px Barlow', 'italic 500 20px Barlow', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 4000)),
]);

// ---------------------------------------------------------------- state
let T = Math.max(0, Math.min(tl.duration, Number(qs.get('t')) || 0));
let playing = false, rate = store.get('rate', 1), narr = store.get('narr', true), cc = store.get('cc', true), subSize = store.get('subsize', 'm');
let curCh = -1, needPosition = true;
const metrics = { seeksWhilePlaying: 0, positions: 0, backwards: 0, waitFrames: 0, diffs: [] };

// ---------------------------------------------------------------- narration clips
const audios = new Map();
function audioFor(i) {
  const ch = tl.chapters[i];
  if (!ch || !ch.file) return null;
  let a = audios.get(i);
  if (!a) {
    a = new Audio();
    a.preload = 'auto';
    a.src = ch.file;
    a.preservesPitch = true;
    a.playbackRate = rate;
    audios.set(i, a);
  }
  return a;
}
// keep the current and the next clip loaded, let the others go
function keepAudios(i) {
  for (const [k, a] of audios) if (k !== i && k !== i + 1) { a.pause(); a.removeAttribute('src'); a.load(); audios.delete(k); }
  audioFor(i); audioFor(i + 1);
}
function pauseAll() { for (const a of audios.values()) a.pause(); }
function position(a, x) {
  if (!a.paused) metrics.seeksWhilePlaying++;
  metrics.positions++;
  try { a.currentTime = Math.max(0, x); } catch { /* not loaded yet */ }
}

// ---------------------------------------------------------------- clock
function step(dt) {
  const ch = tl.at(T);
  if (ch.i !== curCh) {
    const old = audios.get(curCh);
    if (old) old.pause();
    curCh = ch.i; keepAudios(ch.i); needPosition = true;
  }
  const a = narr ? audioFor(ch.i) : null;
  const clipT = T - ch.clipStart;
  let next = T + dt * rate;
  let speaking = false;
  if (a && !a.dataset.blocked && clipT >= 0 && clipT < ch.clip - 0.05) {
    if (needPosition) {
      if (Math.abs(a.currentTime - clipT) > 0.08) position(a, clipT);
      needPosition = false;
    }
    if (a.paused && !a.ended) a.play().catch(() => { a.dataset.blocked = '1'; });
    if (a.readyState < 3 || a.seeking) { metrics.waitFrames++; return false; }
    if (!a.paused) {
      speaking = true;
      const at = ch.clipStart + a.currentTime;
      const diff = at - next;
      if (diff > 0.4) next = at;                 // the voice ran ahead: catch up
      else if (diff < -0.4) next = T;            // the voice is behind: hold, never go back
      else next += diff * Math.min(1, dt * 3);   // small drift: glide towards it
      metrics.diffs.push(Math.abs(at - T));
      if (metrics.diffs.length > 20000) metrics.diffs.shift();
    }
  }
  sfx.setDuck(speaking);
  if (next < T) { metrics.backwards++; next = T; }
  const prev = T;
  T = Math.min(next, tl.duration);
  if (T - prev < 0.5) for (const [et, type] of scene.sfx) if (et > prev && et <= T) sfx.fire(type);
  if (T >= tl.duration) { playing = false; pauseAll(); ui.sync(); }
  return true;
}

function seek(t) {
  T = Math.max(0, Math.min(tl.duration - 0.01, t));
  pauseAll();
  curCh = tl.at(T).i; keepAudios(curCh); needPosition = true;
  render();
}
function setPlaying(p) {
  if (p && T >= tl.duration - 0.05) seek(0);
  playing = p;
  if (!p) pauseAll(); else needPosition = true;
  ui.sync();
}

// ---------------------------------------------------------------- subtitles (two lines, word by word)
const subsEl = $('subs');
let shownChunk = null, spans = [];
function subs(t) {
  const ch = tl.at(t);
  const k = ch.chunks.find(c => t >= c.t0 - 0.15 && t < c.t1 - 0.05) || null;
  if (k !== shownChunk) {
    shownChunk = k;
    subsEl.textContent = ''; spans = [];
    if (k) {
      const mk = (a, b) => {
        const l = document.createElement('span'); l.className = 'l';
        for (let i = a; i < b; i++) {
          const s = document.createElement('span'); s.className = 'w'; s.textContent = ch.words[i].w;
          l.appendChild(s); if (i < b - 1) l.appendChild(document.createTextNode(' '));
          spans.push([s, ch.wordT[i]]);
        }
        subsEl.appendChild(l);
      };
      mk(k.a, k.br); if (k.br < k.b) mk(k.br, k.b);
    }
  }
  // CC off: hide outright (the fade below writes an inline opacity every frame)
  subsEl.style.display = cc ? '' : 'none';
  if (k) subsEl.style.opacity = Math.min(1, (t - (k.t0 - 0.15)) / 0.2, (k.t1 - 0.05 - t) / 0.2);
  for (const [s, wt] of spans) {
    const u = Math.max(0, Math.min(1, (t - wt + 0.06) / 0.3));
    s.style.opacity = u;
    s.style.transform = `translateY(${((1 - u) * 5).toFixed(1)}px)`;
    s.style.filter = u < 1 ? `blur(${((1 - u) * 4).toFixed(1)}px)` : 'none';
  }
}

// ---------------------------------------------------------------- controls
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ui = (() => {
  const track = $('track'), done = track.querySelector('.done'), knob = track.querySelector('.knob'), tip = $('tip');
  const stops = tl.chapters.map(c => {
    const d = document.createElement('div'); d.className = 'stop'; d.style.left = (c.start / tl.duration * 100) + '%';
    $('stops').appendChild(d); return d;
  });
  const setPct = p => { done.style.width = p + '%'; knob.style.left = p + '%'; };
  const tAt = e => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * tl.duration; };
  let drag = false;
  track.addEventListener('pointerdown', e => { drag = true; track.setPointerCapture(e.pointerId); seek(tAt(e)); });
  track.addEventListener('pointermove', e => {
    const t = tAt(e), c = tl.at(t), r = track.getBoundingClientRect();
    tip.textContent = `${c.n}. ${c.title}`; tip.style.left = Math.max(80, Math.min(r.width - 80, e.clientX - r.left)) + 'px';
    if (drag) seek(t);
  });
  track.addEventListener('pointerup', () => { drag = false; });
  $('play').onclick = () => setPlaying(!playing);
  $('prev').onclick = () => { const c = tl.at(T); seek(T - c.start > 2 || c.i === 0 ? c.start : tl.chapters[c.i - 1].start); };
  $('next').onclick = () => { const c = tl.at(T); if (c.i < tl.chapters.length - 1) seek(tl.chapters[c.i + 1].start); };
  const setCC = v => { cc = v; store.set('cc', v); document.body.classList.toggle('nocc', !v); $('cc').classList.toggle('off', !v); };
  const setNarr = v => { narr = v; store.set('narr', v); $('narr').classList.toggle('off', !v); if (!v) pauseAll(); else needPosition = true; };
  const setRate = v => { rate = v; store.set('rate', v); for (const a of audios.values()) a.playbackRate = v; $('speed').textContent = String(v).replace('.', ',') + '×'; for (const b of document.querySelectorAll('#rates button')) b.classList.toggle('on', +b.dataset.r === v); };
  const setSize = v => { subSize = v; store.set('subsize', v); document.documentElement.style.setProperty('--sub', { s: '17px', m: '20px', l: '23px' }[v] || '20px'); for (const b of document.querySelectorAll('#sizes button')) b.classList.toggle('on', b.dataset.s === v); };
  $('cc').onclick = () => setCC(!cc);
  $('narr').onclick = () => setNarr(!narr);
  const RATES = [0.75, 1, 1.25, 1.5];
  $('speed').onclick = () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);
  $('gear').onclick = e => { e.stopPropagation(); $('menu').classList.toggle('open'); };
  document.addEventListener('click', e => { if (!$('menu').contains(e.target) && e.target !== $('gear')) $('menu').classList.remove('open'); });
  for (const b of document.querySelectorAll('#sizes button')) b.onclick = () => setSize(b.dataset.s);
  for (const b of document.querySelectorAll('#rates button')) b.onclick = () => setRate(+b.dataset.r);
  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  $('fs').onclick = fullscreen;
  setCC(cc); setNarr(narr); setRate(rate); setSize(subSize);
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || !started) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) $('prev').onclick(); else seek(T - 5); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) $('next').onclick(); else seek(T + 5); }
    else if (e.key === 'PageUp') $('prev').onclick();
    else if (e.key === 'PageDown') $('next').onclick();
    else if (k === 'c') setCC(!cc);
    else if (k === 'n') setNarr(!narr);
    else if (k === 'f') fullscreen();
    else return;
    poke();
  });
  // auto-hide the bar while playing
  let idleTimer = 0;
  const poke = () => { document.body.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (playing && !$('menu').classList.contains('open')) document.body.classList.add('idle'); }, 2600); };
  addEventListener('pointermove', poke); addEventListener('pointerdown', poke);
  let lastTxt = '';
  return {
    sync() {
      $('playIcon').setAttribute('d', playing ? 'M6 4h4v16H6zm8 0h4v16h-4z' : 'M7 4v16l13-8z');
      if (!playing) document.body.classList.remove('idle'); else poke();
    },
    update(t) {
      setPct(t / tl.duration * 100);
      const txt = `${fmt(t)} / ${fmt(tl.duration)}`;
      if (txt !== lastTxt) { $('time').textContent = txt; lastTxt = txt; stops.forEach((d, i) => d.classList.toggle('past', tl.chapters[i].start <= t)); }
    },
  };
})();

// 16-bit stereo WAV for the video tool
const CHUNK = 3 * 1024 * 1024;
function encodeWav(buf) {
  const n = buf.length, chs = 2, bytes = 44 + n * chs * 2;
  const out = new Uint8Array(bytes), v = new DataView(out.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, chs, true); v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * chs * 2, true); v.setUint16(32, chs * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * chs * 2, true);
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  let o = 44;
  for (let i = 0; i < n; i++) {
    v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 4;
  }
  return out;
}

// ---------------------------------------------------------------- render loop
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // before "Başlat", the finished map waits behind the title
  const preview = !VIDEO && !started;
  scene.draw(ctx, W, H, preview ? tl.duration - 0.3 : T);
  if (!VIDEO && !preview) { subs(T); ui.update(T); }
}
addEventListener('resize', () => { resize(); render(); });

let started = false, last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) step(dt);
  render();
  requestAnimationFrame(frame);
}

// warm-up: draw a few heavy moments once so the first real frames are smooth
for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); scene.draw(ctx, W, H, tl.duration * f); }

if (VIDEO) {
  document.body.classList.add('video');
  let wav = null;
  window.__video = {
    duration: tl.duration,
    renderAt(t) { T = t; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); scene.draw(ctx, W, H, t); },
    // film soundtrack: every narration clip at its place + the same synthesized effects, mixed offline
    async prepareSound(from = 0, to = tl.duration) {
      const rate = 48000, len = Math.max(1, Math.ceil((to - from) * rate));
      const oac = new OfflineAudioContext(2, len, rate);
      const voice = oac.createGain(); voice.gain.value = 1; voice.connect(oac.destination);
      const fxBus = oac.createGain(); fxBus.gain.value = 0.5; fxBus.connect(oac.destination);
      for (const ch of tl.chapters) {
        if (!ch.file || ch.clipStart + ch.clip < from || ch.clipStart > to) continue;
        const buf = await oac.decodeAudioData(await (await fetch(ch.file)).arrayBuffer());
        const src = oac.createBufferSource(); src.buffer = buf; src.connect(voice);
        const at = ch.clipStart - from;
        if (at >= 0) src.start(at); else src.start(0, -at);
      }
      for (const [et, type] of scene.sfx) {
        if (et < from || et > to) continue;
        const c = tl.at(et), speaking = et > c.clipStart && et < c.clipStart + c.clip;
        synth(oac, fxBus, type, et - from, speaking ? 0.4 : 1);
      }
      const out = await oac.startRendering();
      wav = encodeWav(out);
      return Math.ceil(wav.length / CHUNK);
    },
    soundChunk(i) {
      const part = wav.subarray(i * CHUNK, (i + 1) * CHUNK);
      let bin = '';
      for (let k = 0; k < part.length; k += 0x8000) bin += String.fromCharCode.apply(null, part.subarray(k, k + 0x8000));
      return btoa(bin);
    },
    srt: (from = 0, to = tl.duration) => toSrt(tl, from, to),
    chapters: (from = 0) => tl.chapters.filter(c => c.end > from).map(c => ({ t: Math.max(0, c.start - from), title: c.title })),
  };
  window.__ready = true;
} else {
  const go = $('go');
  go.disabled = false;
  const begin = () => {
    if (started) return;
    started = true;
    sfx.unlock();
    $('start').remove();
    curCh = -1;
    setPlaying(true);
  };
  go.onclick = begin;
  if (qs.has('t')) { $('start').remove(); started = true; curCh = tl.at(T).i; keepAudios(curCh); }
  // hooks for automated checks
  window.__test = {
    tl, metrics,
    get T() { return T; }, get playing() { return playing; },
    begin, seek, setPlaying,
    audioT: () => { const c = tl.at(T), a = audios.get(c.i); return a ? { ch: c.i, at: c.clipStart + a.currentTime, paused: a.paused } : null; },
  };
  requestAnimationFrame(frame);
}
render();
