// Boot, player and video interface. Story time follows the narration clip while it plays
// (never going backwards, waiting while a clip loads); outside clips it runs on the clock.
import { Engine } from '@babylonjs/core';
import { createCinema, createEnvironment, createSky } from './env.js';
import { antMaterials, buildAntTemplate } from './ant.js';
import { buildSurface } from './world.js';
import { buildNest } from './nest.js';
import { buildLab } from './lab.js';
import { createMosaic, createSmell, createLens } from './vision.js';
import { Overlay } from './overlay.js';
import { buildTimeline } from './timeline.js';
import { buildSubs, SubtitleView } from './subs.js';
import { createDirector } from './director.js';
import { scoreEvents, playEvent } from './sound.js';

const Q = new URLSearchParams(location.search);
const VIDEO = Q.has('video');
const store = { get: (k, d) => { try { const v = localStorage.getItem('antdoc.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('antdoc.' + k, JSON.stringify(v)); } catch { } } };
const $ = id => document.getElementById(id);
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const coarse = matchMedia('(pointer: coarse)').matches;
const quality = Q.get('q') || (VIDEO ? 'high' : (coarse || innerWidth < 800) ? 'low' : 'high');

const OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));
window.__off = OFF;
const canvas = $('view');
const engine = new Engine(canvas, quality !== 'low', { preserveDrawingBuffer: true, stencil: true, antialias: quality !== 'low', powerPreference: 'high-performance' }, false);
let maxPix = VIDEO ? 4e6 : quality === 'high' ? 1.8e6 : 0.8e6;
function fixResolution() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const level = Math.max(1 / dpr, Math.sqrt((w * h) / maxPix));
  engine.setHardwareScalingLevel(level);
  engine.resize();
  overlay && overlay.resize(w, h);
}
let overlay = null;

const cinema = createCinema(engine, canvas, { quality });
const { scene, camera, sunDir, shadows } = cinema;
createSky(scene, sunDir);
const envReady = createEnvironment(scene, sunDir);
const mats = antMaterials(scene);
const T = buildAntTemplate(scene, mats);
const world = buildSurface(scene, { quality, shadows: OFF.has('shadows') ? null : shadows });
if (OFF.has('shadows')) { cinema.sun.shadowEnabled = false; }
const nest = buildNest(scene, { quality, shadows });
const lab = buildLab(scene, { shadows });
const lens = quality === 'low' || Q.has('nolens') ? null : createLens(scene, camera, engine, cinema.pipe, cinema.sun);
if (lens) cinema.setLens(lens.pp);
// rendering tier: fixed for video; otherwise measured at start (see pickTier) and lowered during playback if needed
function applyTier(name) {
  cinema.setTier(name);
  maxPix = VIDEO ? 4e6 : cinema.tierPixels(name);
  fixResolution();
  document.body.dataset.tier = name;
}
applyTier(Q.get('tier') || (VIDEO ? 'ultra' : quality === 'low' ? 'low' : 'high'));
if (VIDEO) cinema.pipe.grain.animated = false;   // moving grain survives YouTube re-encoding badly; keep it still in the upload
const TIER_ORDER = ['high', 'mid', 'low', 'min'];
// startup: time a few heavy frames per tier (GPU-synchronous) and keep the first tier under budget
async function pickTier() {
  if (VIDEO || Q.has('tier')) return;
  const probes = ['ciftlik', 'olcek', 'acilis'].map(id => { const c = tl.chapters.find(x => x.id === id); return c.start + c.dur * 0.5; });
  const gl = engine._gl, px = new Uint8Array(4);
  const cost = () => {
    const ts = [];
    for (const t of probes) { director.update(t); scene.render(); const a = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); director.update(t + 0.05); scene.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push((performance.now() - a) / 2); }
    ts.sort((a, b) => a - b); return ts[1];
  };
  for (const name of TIER_ORDER) {
    applyTier(name);
    await new Promise(r => setTimeout(r, 30));
    cost();                                  // warm the shaders of this tier
    const ms = cost();
    console.log(`[kalite] ${name}: ${ms.toFixed(1)} ms/kare`);
    if (ms < 27 || name === 'min') return;   // ~37 fps synchronous ≈ 50+ fps pipelined   // ~45 fps synchronous ≈ 60 fps pipelined
  }
}
// playback: if frames stay slow for a while, drop one tier (never climbs back, to avoid flicker)
let slowSince = 0;
function watchFrame(dt) {
  if (VIDEO || Q.has('tier') || !playing) { slowSince = 0; return; }
  const cur = document.body.dataset.tier, i = TIER_ORDER.indexOf(cur);
  if (i < 0 || i === TIER_ORDER.length - 1) return;
  if (dt > 0.045) { if (!slowSince) slowSince = performance.now(); else if (performance.now() - slowSince > 2500) { applyTier(TIER_ORDER[i + 1]); slowSince = 0; console.log('[kalite] düşürüldü →', TIER_ORDER[i + 1]); } }
  else if (dt < 0.03) slowSince = 0;
}
const mosaic = createMosaic(camera, engine);
const smell = createSmell(scene);
overlay = new Overlay(scene, camera);
const tl = buildTimeline();
buildSubs(tl.chapters);
const director = createDirector({ scene, camera, env: cinema, world, nest, lab, T, overlay, mosaic, smell, tl, quality });
const subsView = new SubtitleView($('subs'));
fixResolution();
addEventListener('resize', fixResolution);

// ---------------- state ----------------
let storyT = Number(Q.get('t') || 0);
let playing = false;
let rate = store.get('rate', 1);
let ccOn = store.get('cc', true);
let voiceOn = store.get('voice', true);
const subSize = store.get('subsize', 'm');
document.body.classList.add('sub-' + subSize);

function draw(t) {
  const { ch, u } = director.update(t);
  scene.render();
  subsView.render(ch, u, ccOn && !(VIDEO && Q.get('subs') === '0'));
  document.body.classList.toggle('nocc', !ccOn);
  return { ch, u };
}

// ---------------- narration clips ----------------
const clips = new Map();
function clip(ch) {
  if (!ch.clip) return null;
  let a = clips.get(ch.id);
  if (!a) { a = new Audio(); a.preload = 'auto'; a.src = './' + ch.clip.file; a.preservesPitch = true; clips.set(ch.id, a); }
  return a;
}
function keepClips(ch) {
  const want = new Set([ch.id, tl.chapters[ch.index + 1]?.id].filter(Boolean));
  for (const c of tl.chapters) if (want.has(c.id)) clip(c);
  for (const [id, a] of clips) if (!want.has(id)) { a.pause(); a.removeAttribute('src'); a.load(); clips.delete(id); }
}
let activeClip = null, needSeek = true;
function stopClips() { for (const a of clips.values()) a.pause(); activeClip = null; needSeek = true; }

// ---------------- ambience ----------------
let actx = null, amb = null, events = scoreEvents(tl), live = [], schedUntil = 0;
function initAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  amb = actx.createGain(); amb.gain.value = 1; amb.connect(actx.destination);
}
function stopAmb() { for (const n of live) { try { n.stop(); } catch { } } live = []; schedUntil = storyT; }
function scheduleAmb(first) {
  if (!actx || !playing) return;
  const horizon = storyT + 6;
  if (!first && schedUntil > storyT + 3) return;
  for (const e of events) {
    const endT = e.t + e.dur;
    if (first) { if (e.t <= storyT && endT > storyT + 0.1) live.push(...playEvent(actx, amb, e, actx.currentTime - (storyT - e.t) / rate, (storyT - e.t))); }
    if (e.t >= schedUntil && e.t < horizon && e.t >= storyT) live.push(...playEvent(actx, amb, e, actx.currentTime + (e.t - storyT) / rate, 0));
  }
  schedUntil = horizon;
  if (live.length > 400) live = live.slice(-300);
}

// ---------------- clock ----------------
let lastNow = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  watchFrame(dt);
  if (playing) {
    const { ch, u } = tl.at(storyT);
    keepClips(ch);
    const c = voiceOn ? clip(ch) : null;
    const inVoice = c && u >= ch.head && u < ch.voiceEnd;
    if (activeClip && activeClip !== c) { activeClip.pause(); activeClip = null; }
    // a clip that has played to its end is finished: never call play() on it again (that would
    // restart it from 0 while the picture waits for it); the story runs on the clock instead
    const finished = inVoice && !needSeek && activeClip === c && (c.ended || (c.duration && c.currentTime >= c.duration - 0.05));
    if (inVoice && !finished) {
      const p = u - ch.head;
      if (activeClip !== c || needSeek || c.paused) {
        if (needSeek || Math.abs(c.currentTime - p) > 0.3) { try { c.currentTime = p; } catch { } }
        c.playbackRate = rate; c.play().catch(() => { });
        activeClip = c; needSeek = false;
      }
      if (c.readyState >= 3 && !c.seeking && !c.paused) {
        const target = ch.start + ch.head + c.currentTime;
        const diff = target - storyT;
        if (diff > 0.25) storyT = target;                     // audio ahead: jump forward
        else if (diff > -0.25) storyT = Math.max(storyT, storyT + dt * rate + diff * 0.12);
        // audio behind: hold the picture briefly until the voice catches up (never go back);
        // if it is far behind something went wrong: move the clip to the picture once
        else if (diff < -1.5) { try { c.currentTime = Math.min(c.duration || p, p); } catch { } }
      }
    } else if (finished) {
      storyT += dt * rate;
    } else {
      storyT += dt * rate;
      if (c && !c.paused && u >= ch.voiceEnd) c.pause();
    }
    if (storyT >= tl.total - 0.02) { storyT = tl.total - 0.02; setPlaying(false); }
    // duck the ambience under the voice
    if (amb) amb.gain.setTargetAtTime(inVoice ? 0.42 : 1, actx.currentTime, 0.4);
    scheduleAmb(false);
  }
  const { ch } = draw(storyT);
  updateBar(ch);
  if (!VIDEO) requestAnimationFrame(tick);
}

// ---------------- UI ----------------
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4.5h4.2v15H6zm7.8 0H18v15h-4.2z"/></svg>',
  voice: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2.4v14H6zm3.5 7L19 5v14z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15.6 5H18v14h-2.4zM5 5l9.5 7L5 19z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z"/></svg>',
};
$('bPlay').innerHTML = ICON.play; $('bVoice').innerHTML = ICON.voice; $('bPrev').innerHTML = ICON.prev; $('bNext').innerHTML = ICON.next; $('bFull').innerHTML = ICON.full;
const ticks = $('progress').querySelector('.ticks');
for (const c of tl.chapters) if (c.index > 0) { const s = document.createElement('span'); s.style.left = (c.start / tl.total * 100) + '%'; ticks.appendChild(s); }
$('dur').textContent = `${Math.round(tl.total / 60)} dakika`;

function setPlaying(v) {
  if (v === playing) return;
  playing = v;
  $('bPlay').innerHTML = v ? ICON.pause : ICON.play;
  if (v) { initAudio(); actx.resume(); needSeek = true; stopAmb(); scheduleAmb(true); lastNow = performance.now(); }
  else { stopClips(); stopAmb(); }
}
function seek(t) {
  storyT = Math.max(0, Math.min(tl.total - 0.05, t));
  stopClips(); stopAmb(); if (playing) scheduleAmb(true);
}
function chapterJump(d) {
  const { ch, u } = tl.at(storyT);
  let k = ch.index + d;
  if (d < 0 && u > 2.5) k = ch.index;
  k = Math.max(0, Math.min(tl.chapters.length - 1, k));
  seek(tl.chapters[k].start + 0.01);
}
const refreshToggles = () => {
  $('bCC').classList.toggle('off', !ccOn); $('bVoice').classList.toggle('off', !voiceOn);
  $('bSpeed').textContent = String(rate).replace('.', ',') + '×';
  document.querySelectorAll('#setMenu button').forEach(b => b.classList.toggle('on', document.body.classList.contains('sub-' + b.dataset.size)));
};
refreshToggles();
$('bPlay').onclick = () => setPlaying(!playing);
$('bPrev').onclick = () => chapterJump(-1);
$('bNext').onclick = () => chapterJump(1);
$('bCC').onclick = () => { ccOn = !ccOn; store.set('cc', ccOn); refreshToggles(); };
$('bVoice').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn); stopClips(); refreshToggles(); };
const RATES = [0.75, 1, 1.25, 1.5];
$('bSpeed').onclick = () => { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; store.set('rate', rate); for (const a of clips.values()) a.playbackRate = rate; stopAmb(); if (playing) scheduleAmb(true); refreshToggles(); };
$('bSet').onclick = e => { e.stopPropagation(); $('setMenu').classList.toggle('hidden'); };
document.querySelectorAll('#setMenu button').forEach(b => b.onclick = () => { document.body.classList.remove('sub-s', 'sub-m', 'sub-l'); document.body.classList.add('sub-' + b.dataset.size); store.set('subsize', b.dataset.size); refreshToggles(); });
$('bFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else $('stage').requestFullscreen?.(); };
const prog = $('progress');
const posAt = e => { const r = prog.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * tl.total; };
prog.addEventListener('pointerdown', e => { seek(posAt(e)); const mv = ev => seek(posAt(ev)); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
prog.addEventListener('pointermove', e => { const t = posAt(e); const h = prog.querySelector('.hover'); h.textContent = `${fmt(t)} · ${tl.at(t).ch.title}`; h.style.left = (t / tl.total * 100) + '%'; });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); if (!$('start').classList.contains('gone')) start(); else setPlaying(!playing); }
  else if (e.code === 'ArrowRight') chapterJump(1);
  else if (e.code === 'ArrowLeft') chapterJump(-1);
  else if (e.key === 'c' || e.key === 'C') $('bCC').click();
  else if (e.key === 'n' || e.key === 'N') $('bVoice').click();
  else if (e.key === 'f' || e.key === 'F') $('bFull').click();
  showBar();
});
let barTimer = 0;
function showBar() { if (!$('start').classList.contains('gone')) return; $('bar').classList.remove('hidden'); document.body.classList.add('bar-on'); clearTimeout(barTimer); barTimer = setTimeout(() => { if (playing) { $('bar').classList.add('hidden'); document.body.classList.remove('bar-on'); $('setMenu').classList.add('hidden'); } }, 2600); }
addEventListener('pointermove', showBar); addEventListener('pointerdown', showBar);
canvas.addEventListener('click', () => { if ($('start').classList.contains('gone')) setPlaying(!playing); });
let lastBarUpdate = -1;
function updateBar(ch) {
  const k = Math.floor(storyT * 4);
  if (k === lastBarUpdate) return; lastBarUpdate = k;
  prog.querySelector('.fill').style.width = (storyT / tl.total * 100) + '%';
  $('time').textContent = `${fmt(storyT)} / ${fmt(tl.total)}`;
  $('chapName').textContent = ch.title;
}

function start() {
  $('start').classList.add('gone'); document.body.classList.add('started');
  if (storyT > tl.total - 1 || Q.get('t') == null) storyT = Number(Q.get('t') || 0);
  setPlaying(true); showBar();
}
$('go').onclick = start;

// ---------------- warm-up: compile every look before the start button ----------------
async function warmup() {
  await envReady;
  await scene.whenReadyAsync();
  const probes = [];
  for (const c of tl.chapters) for (const f of [0.2, 0.5, 0.8]) probes.push(c.start + c.dur * f);
  for (let i = 0; i < probes.length; i++) {
    draw(probes[i]);
    $('prep').firstElementChild.style.width = ((i + 1) / probes.length * 100) + '%';
    await new Promise(r => setTimeout(r, 0));
  }
  await scene.whenReadyAsync();
  await pickTier();
}

// ---------------- video interface ----------------
function wavChunks(buf) {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, ch, true); data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(data.buffer), out = [], CH = 1 << 20;
  for (let i = 0; i < bytes.length; i += CH) { let s = ''; const part = bytes.subarray(i, i + CH); for (let j = 0; j < part.length; j += 8192) s += String.fromCharCode.apply(null, part.subarray(j, j + 8192)); out.push(btoa(s)); }
  return out;
}
const srtTime = s => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
let soundOut = [];
window.__tl = tl;
// dev: cost of one frame at story time t (scene update, draw calls, GPU wait, DOM)
window.__probe = t => {
  const a = performance.now(); const { ch, u } = director.update(t); const b = performance.now();
  scene.render(); const c = performance.now();
  const gl = engine._gl; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const d = performance.now();
  subsView.render(ch, u, true); const e = performance.now();
  return { upd: b - a, rnd: c - b, gpu: d - c, dom: e - d, draws: scene.getActiveMeshes().length };
};
window.__player = { get t() { return storyT; }, get playing() { return playing; }, get clip() { return activeClip; }, seek: t => seek(t) };
window.__video = {
  duration: tl.total,
  renderAt(t) { draw(t); },
  async prepareSound(from, to) {
    const sr = 48000, len = Math.ceil((to - from) * sr);
    const off = new OfflineAudioContext(2, len, sr);
    const ambG = off.createGain(); ambG.connect(off.destination);
    for (const e of events) if (e.t + e.dur > from && e.t < to) playEvent(off, ambG, e, e.t - from, Math.max(0, from - e.t));
    // voice clips + ducking
    for (const c of tl.chapters) {
      if (!c.clip) continue;
      const t0 = c.start + c.head, t1 = t0 + c.clipDur;
      if (t1 < from || t0 > to) continue;
      const ab = await (await fetch('./' + c.clip.file)).arrayBuffer();
      const buf = await off.decodeAudioData(ab);
      const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination);
      const when = t0 - from;
      if (when >= 0) src.start(when); else src.start(0, -when);
      ambG.gain.setTargetAtTime(0.42, Math.max(0, when), 0.4); ambG.gain.setTargetAtTime(1, Math.max(0, t1 - from), 0.4);
    }
    const rendered = await off.startRendering();
    soundOut = wavChunks(rendered);
    return soundOut.length;
  },
  soundChunk(i) { return soundOut[i]; },
  srt(from = 0, to = tl.total) {
    let n = 1, out = '', prev = 0;
    for (const c of tl.chapters) for (const s of c.subs) {
      const a = Math.max(prev, c.start + s.t0 - 0.1), b = c.start + s.end; prev = b;
      if (b < from || a > to) continue;
      out += `${n++}\n${srtTime(Math.max(0, a - from))} --> ${srtTime(Math.min(to, b) - from)}\n${s.lines.map(l => l.map(w => w.w).join(' ')).join('\n')}\n\n`;
    }
    return out;
  },
  chapters(from = 0) { return tl.chapters.filter(c => c.start + c.dur > from).map(c => ({ t: Math.max(0, c.start - from), title: c.title })); },
};

warmup().then(() => {
  if (VIDEO) {
    document.body.classList.add('video');
    $('start').style.display = 'none'; $('bar').style.display = 'none';
    draw(0); window.__ready = true; return;
  }
  // start screen: a still of the hero at the nest in morning light
  const fz = tl.chapters.find(c => c.id === 'fizik');
  const posterT = Q.has('t') ? storyT : fz.start + fz.cues.sip + 1.5;
  draw(posterT);
  if (!Q.has('t')) storyT = 0;
  $('go').disabled = false; $('go').querySelector('.lbl').textContent = 'İzle';
  window.__ok = true;
  if (Q.has('shot')) { storyT = Number(Q.get('shot')); $('start').style.display = 'none'; draw(storyT); window.__shot = true; return; }
  // keep the poster alive until start
  const idle = () => { if (!playing && !$('start').classList.contains('gone')) { draw(posterT); requestAnimationFrame(idle); } else { lastNow = performance.now(); requestAnimationFrame(tick); } };
  requestAnimationFrame(idle);
  if (Q.has('autoplay')) start();
});
