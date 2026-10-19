// Player: the clock (follows the recording, never goes back), rendering, subtitles, controls,
// quality tiers (picked at start, dropped while playing), and the ?video=1 contract.

const Q = new URLSearchParams(location.search);
const VIDEO = Q.get('video') === '1';
const TL = buildTimeline(SECTIONS, MANIFEST);
const N = TL.sections.length;
const BYID = Object.fromEntries(TL.sections.map(s => [s.id, s]));
const TH = 0.6;   // half-length of a plate change
const SHIFT = +Q.get('shift') || 0;

const TIERS = {
  ultra: { gs: 1.0, os: 1.0, oct: 5 },
  high: { gs: 1.0, os: 1.0, oct: 5 },
  mid: { gs: 0.78, os: 0.85, oct: 4 },
  low: { gs: 0.6, os: 0.72, oct: 3 },
  min: { gs: 0.46, os: 0.6, oct: 3 },
};
const ORDER = ['high', 'mid', 'low', 'min'];
let tier = VIDEO ? 'ultra' : (TIERS[Q.get('tier')] ? Q.get('tier') : 'high');
const tierFixed = VIDEO || !!TIERS[Q.get('tier')];

const glCanvas = document.getElementById('gl');
const over = document.createElement('canvas');
const octx = over.getContext('2d');
const R = createGL(glCanvas);
const O = makeOverlay();
let W = 0, H = 0, U = 1, port = false, dpr = 1;

function resize() {
  W = VIDEO ? 1920 : innerWidth; H = VIDEO ? 1080 : innerHeight;
  if (VIDEO) { W = innerWidth; H = innerHeight; }
  port = W / H < 1;
  U = port ? W / 1.25 : Math.min(H, W / 1.25);
  dpr = VIDEO ? (+Q.get('dpr') || 1) : Math.min(window.devicePixelRatio || 1, 1.5);
  const T = TIERS[tier];
  glCanvas.width = Math.round(W * dpr * T.gs); glCanvas.height = Math.round(H * dpr * T.gs);
  over.width = Math.round(W * dpr * T.os); over.height = Math.round(H * dpr * T.os);
}
function setTier(t) { tier = t; resize(); }

// ---- scenes → one frame -------------------------------------------------------------------
const CTX = { TL, S: BYID, get port() { return port; } };
function sceneOf(i, t) { const s = TL.sections[i]; return (SCENES[s.id] || SCENES.blank)(t, s, CTX); }

let lastDraw = null;
function renderFrame(t) {
  t = clamp(t, 0, TL.duration - 1e-3);
  const i = sectionAt(TL, t), s = TL.sections[i];
  let A, B = null, k = 0;
  if (i < N - 1 && t > s.end - TH && !TL.sections[i + 1].cont) { A = sceneOf(i, t); B = sceneOf(i + 1, t); k = (t - (s.end - TH)) / (2 * TH); }
  else if (i > 0 && t < s.start + TH && !s.cont) { A = sceneOf(i - 1, t); B = sceneOf(i, t); k = (t - (s.start - TH)) / (2 * TH); }
  else A = sceneOf(i, t);
  // covers: push the subject to the right of the frame (?shift=world units)
  if (SHIFT) for (const P of [A, B]) if (P) P.cam = { ...P.cam, x: P.cam.x - SHIFT / P.cam.z };
  const T = TIERS[tier];
  const os = over.width / W;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, over.width, over.height);
  octx.setTransform(os, 0, 0, os, 0, 0);
  O.begin(octx, W, H, U, port, t);
  const bx = B ? W * (1 - ease.inOut(clamp(k))) : W;
  octx.save();
  if (B) { octx.beginPath(); octx.rect(0, 0, bx, H); octx.clip(); }
  O.setCam(A.cam); A.draw && A.draw(O); plateMarks(O, A);
  octx.restore();
  if (B) {
    O.boxes = O.boxes.filter(b => b.kind === 'keep');
    octx.save(); octx.beginPath(); octx.rect(bx, 0, W - bx, H); octx.clip(); octx.translate(bx, 0);
    O.setCam(B.cam); B.draw && B.draw(O); plateMarks(O, B);
    octx.restore();
  }
  const gs = glCanvas.width / W;
  const grainSeed = VIDEO ? 1 : Math.floor(t * 12);
  R.draw([A, B], { x: bx * gs, active: !!B, shadow: 0.4 }, { grainSeed, grain: VIDEO ? 0.022 : 0.035, octaves: T.oct, time: t }, over, U * gs);
  lastDraw = { t, i };
}

// catalogue number, pinholes: every plate is an object in an archive
function plateMarks(O, P) {
  if (!P.no) return;
  const m = Math.min(W, H) * 0.028;
  const sz = O.fs(13, 10);
  textS(O, P.no, m + sz * 1.6, m + sz * 1.9, { kind: 'mono', size: 13, a: 0.62, halo: 0, spacing: 0.12 });
  O.claim('plate-no', { x: m + sz * 1.4, y: m + sz, w: sz * 16, h: sz * 1.8 });
  const ctx = O.ctx; ctx.save(); ctx.fillStyle = 'rgba(8,26,51,0.55)';
  for (const [x, y] of [[m * 0.5, m * 0.5], [W - m * 0.5, m * 0.5], [m * 0.5, H - m * 0.5], [W - m * 0.5, H - m * 0.5]]) { ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, m * 0.09), 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---- subtitles -----------------------------------------------------------------------------
const SUBS = TL.sections.map(buildSubs);
function buildSubs(sec) {
  const words = [];
  const re = /\S+/g; let m;
  while ((m = re.exec(sec.text))) words.push({ w: m[0], t: sec.charTime(m.index / sec.text.length) });
  const chunks = [];
  let cur = [], len = 0;
  const push = () => { if (cur.length) chunks.push(cur); cur = []; len = 0; };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    if (cur.length && (len + w.w.length > 88 || (/[.?!]$/.test(prev.w) && len > 26) || (/[,:;]$/.test(prev.w) && len > 62))) push();
    cur.push(w); len += w.w.length + 1;
  });
  push();
  return chunks.map((c, i) => {
    // two balanced lines (≤ 44 chars each where possible), preferring to break after punctuation
    const total = c.reduce((a, w) => a + w.w.length + 1, 0);
    let best = c.length, bestD = 1e9, acc = 0;
    if (total > 44) for (let k = 1; k < c.length; k++) {
      acc += c[k - 1].w.length + 1;
      const d = Math.abs(acc - total / 2) - (/[.?!:]$/.test(c[k - 1].w) ? 12 : /[,;]$/.test(c[k - 1].w) ? 7 : 0) + (Math.max(acc, total - acc) > 47 ? 40 : 0);
      if (d < bestD) { bestD = d; best = k; }
    }
    const next = chunks[i + 1];
    return { lines: [c.slice(0, best), c.slice(best)], t0: c[0].t - 0.25, t1: next ? next[0].t - 0.27 : sec.ve + 0.7 };
  });
}
const subsEl = document.getElementById('subs'), l1 = document.getElementById('l1'), l2 = document.getElementById('l2');
let subKey = null, subSpans = [];
function updateSubs(t) {
  const i = sectionAt(TL, t);
  const ch = SUBS[i].find(c => t >= c.t0 && t < c.t1);
  const key = ch ? `${i}:${SUBS[i].indexOf(ch)}` : null;
  if (key !== subKey) {
    subKey = key; subSpans = [];
    [l1, l2].forEach((el, k) => {
      el.textContent = '';
      if (!ch) return;
      ch.lines[k].forEach((w, j) => {
        const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w.w + (j < ch.lines[k].length - 1 ? ' ' : '');
        el.appendChild(sp); subSpans.push({ el: sp, t: w.t });
      });
    });
  }
  for (const s of subSpans) {
    const k = clamp((t - s.t + 0.04) / 0.2);
    const e = ease.out(k);
    s.el.style.opacity = (0.0 + e).toFixed(3);
    s.el.style.transform = `translateY(${((1 - e) * 4).toFixed(2)}px)`;
    s.el.style.filter = k < 1 ? `blur(${((1 - e) * 2.5).toFixed(2)}px)` : 'none';
  }
}

// ---- preferences ---------------------------------------------------------------------------
const store = { get(k, d) { try { const v = localStorage.getItem('hsd.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('hsd.' + k, JSON.stringify(v)); } catch { } } };
let ccOn = VIDEO ? Q.get('subs') === '1' : store.get('cc', true);
let narOn = store.get('nar', true);
let subSize = store.get('size', 'm');
let rate = 1;
function applyPrefs() {
  subsEl.classList.toggle('off', !ccOn);
  subsEl.classList.remove('s', 'm', 'l'); subsEl.classList.add(subSize);
  document.getElementById('bCC').classList.toggle('off', !ccOn);
  document.getElementById('bNar').classList.toggle('off', !narOn);
  document.getElementById('bSize').textContent = { s: 'A−', m: 'A', l: 'A+' }[subSize];
  for (const a of Object.values(audios)) a.muted = !narOn;
}

// ---- clock that follows the recording --------------------------------------------------------
let storyT = 0, playing = false, started = false;
const audios = {}, done = {};
function audioFor(s) {
  if (!s.file) return null;
  if (!audios[s.id]) {
    const a = new Audio(); a.preload = 'auto'; a.src = s.file; a.muted = !narOn;
    a.preservesPitch = true; a.playbackRate = rate;
    a.addEventListener('ended', () => { done[s.id] = true; });
    audios[s.id] = a;
    // warm the decoder once so the first real play() does not hitch a frame
    a.addEventListener('canplaythrough', () => { if (a.__warm || !playing || cur() === s) return; a.__warm = true; const m = a.muted; a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = !narOn && m; a.muted = !narOn; }).catch(() => { }); }, { once: true });
  }
  return audios[s.id];
}
const cur = () => TL.sections[sectionAt(TL, storyT)];
function keepNear(i) {
  for (const s of TL.sections) {
    const near = s.index === i || s.index === i + 1;
    if (near) audioFor(s);
    else if (audios[s.id]) { audios[s.id].pause(); audios[s.id].removeAttribute('src'); audios[s.id].load(); delete audios[s.id]; }
  }
}
function pauseAll() { for (const a of Object.values(audios)) if (!a.paused) a.pause(); }
function seek(t) {
  storyT = clamp(t, 0, TL.duration - 0.05);
  pauseAll();
  for (const s of TL.sections) done[s.id] = storyT >= s.ve - 0.05;
  const s = cur(); keepNear(s.index);
  const a = audios[s.id];
  if (a && storyT >= s.vs && storyT < s.ve) { a.currentTime = storyT - s.vs; done[s.id] = false; }
  else if (a && storyT < s.vs) { a.currentTime = 0; }
  sfx.resync();
}

let lastNow = null;
function tick(dt) {
  if (!playing) return;
  const s = cur();
  let next = storyT + dt * rate;
  const a = audioFor(s);
  if (a && a.error) done[s.id] = true;   // a recording that cannot load: the clock carries the story
  if (a && !done[s.id] && next >= s.vs && storyT < s.ve) {
    const want = storyT - s.vs;
    if (a.paused) {
      if (a.ended || (a.duration && a.currentTime >= a.duration - 0.04)) { done[s.id] = true; }
      else {
        if (Math.abs(a.currentTime - Math.max(0, want)) > 0.25) a.currentTime = Math.max(0, want);
        a.playbackRate = rate; a.play().catch(() => { });
        if (a.readyState < 3) next = Math.max(storyT, Math.min(next, s.vs)); // wait for data
      }
    } else if (a.readyState < 3 || a.seeking) {
      next = storyT;   // buffering: hold the story
    } else {
      const target = s.vs + a.currentTime;
      if (target < next) next = Math.max(storyT, target);           // never go back; wait for the voice
      else if (target > next + 0.25) next = target;                  // voice ran ahead: one jump
      else next += (target - next) * 0.12;
    }
  }
  // the picture should not run more than 1.5 s ahead of a playing recording
  storyT = Math.min(next, TL.duration - 0.02);
  if (storyT >= TL.duration - 0.03) { playing = false; pauseAll(); updateUI(); }
  const ns = cur();
  if (ns !== s) keepNear(ns.index);
}

// ---- effects (live) --------------------------------------------------------------------------
const PLAN = sfxPlan(TL);
const sfx = {
  ac: null, drone: null, fx: null, lastT: 0,
  init() {
    if (this.ac || VIDEO) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = this.ac.createGain(); master.gain.value = 0.8; master.connect(this.ac.destination);
      this.fx = this.ac.createGain(); this.fx.connect(master);
      this.drone = makeDrone(this.ac, this.fx);
    } catch { this.ac = null; }
  },
  resync() { this.lastT = storyT; },
  update() {
    if (!this.ac) return;
    const now = this.ac.currentTime;
    const p = droneAt(TL, storyT), on = playing ? 1 : 0;
    this.drone.g.setTargetAtTime(p.g * 0.9 * on, now, 0.25);
    this.drone.lp.setTargetAtTime(220 + 900 * p.b, now, 0.4);
    this.drone.f1.setTargetAtTime(55 * p.f, now, 0.5); this.drone.f2.setTargetAtTime(82.6 * p.f, now, 0.5);
    this.fx.gain.setTargetAtTime(duckAt(TL, storyT), now, 0.4);
    if (!playing) { this.lastT = storyT; return; }
    const ahead = storyT + 0.12 * rate;
    for (const e of PLAN) if (e.t > this.lastT && e.t <= ahead) playEvent(this.ac, this.fx, now + Math.max(0, (e.t - storyT) / rate), e);
    this.lastT = Math.max(this.lastT, ahead);
  },
};

// ---- UI --------------------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function buildBar() {
  const p = $('prog');
  for (const s of TL.sections.slice(1)) { const n = document.createElement('div'); n.className = 'nt'; n.style.left = (s.start / TL.duration * 100) + '%'; p.appendChild(n); }
  const posT = e => { const r = p.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * TL.duration; };
  let drag = false;
  p.addEventListener('pointerdown', e => { drag = true; p.setPointerCapture(e.pointerId); seek(posT(e)); });
  p.addEventListener('pointermove', e => { const t = posT(e), tip = $('tip'); tip.style.display = 'block'; tip.style.left = (t / TL.duration * 100) + '%'; tip.textContent = `${fmt(t)} · ${TL.sections[sectionAt(TL, t)].title}`; if (drag) seek(t); });
  p.addEventListener('pointerup', () => { drag = false; });
  p.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; });
  $('bPlay').onclick = togglePlay;
  $('bPrev').onclick = () => { const s = cur(); seek(storyT - s.start > 2 || s.index === 0 ? s.start : TL.sections[s.index - 1].start); };
  $('bNext').onclick = () => { const s = cur(); if (s.index < N - 1) seek(TL.sections[s.index + 1].start); };
  $('bSpeed').onclick = () => { const r = [1, 1.25, 1.5, 0.75]; rate = r[(r.indexOf(rate) + 1) % r.length]; $('bSpeed').textContent = rate + '×'; for (const a of Object.values(audios)) a.playbackRate = rate; };
  $('bCC').onclick = () => { ccOn = !ccOn; store.set('cc', ccOn); applyPrefs(); };
  $('bNar').onclick = () => { narOn = !narOn; store.set('nar', narOn); applyPrefs(); };
  $('bSize').onclick = () => { subSize = { s: 'm', m: 'l', l: 's' }[subSize]; store.set('size', subSize); applyPrefs(); };
  $('bFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => { }); };
  addEventListener('keydown', e => {
    if (!started) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') seek(e.shiftKey ? TL.sections[Math.min(N - 1, cur().index + 1)].start : storyT + 5);
    else if (e.code === 'ArrowLeft') seek(e.shiftKey ? TL.sections[Math.max(0, cur().index - 1)].start : storyT - 5);
    else if (e.code === 'KeyC') $('bCC').click();
    else if (e.code === 'KeyN') $('bNar').click();
    else if (e.code === 'KeyF') $('bFull').click();
    poke();
  });
  let hideT = 0;
  const poke = () => { document.body.classList.remove('ui-hidden'); clearTimeout(hideT); hideT = setTimeout(() => { if (playing) document.body.classList.add('ui-hidden'); }, 2600); };
  addEventListener('pointermove', poke); addEventListener('pointerdown', poke);
  glCanvas.addEventListener('click', () => { if (started) togglePlay(); });
  window.__poke = poke;
}
function togglePlay() {
  if (storyT >= TL.duration - 0.1) seek(0);
  playing = !playing;
  if (!playing) pauseAll(); else { sfx.ac && sfx.ac.resume(); sfx.resync(); }
  updateUI(); window.__poke && window.__poke();
}
function updateUI() {
  $('bPlay').textContent = playing ? '❚❚' : '▶';
  const f = storyT / TL.duration * 100;
  $('prog').querySelector('.fl').style.width = f + '%';
  $('prog').querySelector('.hd').style.left = f + '%';
  $('tm').textContent = `${fmt(storyT)} / ${fmt(TL.duration)}`;
  $('ch').textContent = cur().title;
}

// ---- quality: measure at start, drop while playing ---------------------------------------------
function timeTier(name, times) {
  setTier(name);
  const gl = R.gl, px = new Uint8Array(4);
  renderFrame(times[0]); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let sum = 0;
  for (const t of times) { const a = performance.now(); renderFrame(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); sum += performance.now() - a; }
  return sum / times.length;
}
function heavyTimes() { return [BYID.onion.cue.onion + 1, BYID.collapse.cue.boom + 1.5, BYID.giant.cue.earth + 1, BYID.dwarf.cue.name + 1, BYID.remnant.cue.crab + 1]; }
function autoTier() {
  if (tierFixed) return;
  const times = heavyTimes();
  for (const name of ORDER) { const ms = timeTier(name, times); window.__tierLog = (window.__tierLog || []).concat([[name, +ms.toFixed(1)]]); if (ms < 27) return; }
}
let slow = 0;
function watchFps(dt) {
  if (tierFixed || !playing) return;
  slow = dt > 0.045 ? slow + dt : Math.max(0, slow - dt * 0.5);
  if (slow > 2.5) { const i = ORDER.indexOf(tier); if (i < ORDER.length - 1) setTier(ORDER[i + 1]); slow = 0; }
}

// ---- main loop -------------------------------------------------------------------------------
function loop(now) {
  const dt = lastNow === null ? 0 : Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  tick(dt);
  watchFps(dt);
  renderFrame(started ? storyT : POSTER_T());
  updateSubs(started ? storyT : -1);
  sfx.update();
  if (started && playing) updateUI();
  requestAnimationFrame(loop);
}
const POSTER_T = () => BYID.collapse.cue.boom + 2.6;

// ---- video contract --------------------------------------------------------------------------
let soundPCM = null, soundRate = 44100;
const CHUNK = 4 << 20;
function srt(from, to) {
  let n = 0, out = '';
  const ts = t => { t = Math.max(0, t); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`; };
  SUBS.forEach(list => list.forEach(c => {
    if (c.t1 < from || c.t0 > to) return;
    out += `${++n}\n${ts(c.t0 - from)} --> ${ts(Math.min(c.t1, to) - from)}\n${c.lines.map(l => l.map(w => w.w).join(' ')).filter(Boolean).join('\n')}\n\n`;
  }));
  return out;
}
async function voiceBuffers() {
  const ac = new OfflineAudioContext(1, 44100, 44100), out = {};
  for (const s of TL.sections) {
    if (!s.file) continue;
    // a ranged request, like the one the <audio> element itself makes
    try { const r = await fetch(s.file, { headers: { Range: 'bytes=0-' } }); out[s.id] = await ac.decodeAudioData(await r.arrayBuffer()); }
    catch (e) { (window.__soundWarn = window.__soundWarn || []).push(s.id); console.warn('anlatım çözülemedi: ' + s.id); }
  }
  return out;
}
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }

if (VIDEO) {
  document.body.classList.add('video');
  window.__video = {
    duration: TL.duration,
    renderAt(t) { renderFrame(t); updateSubs(t); },
    async prepareSound(from, to) {
      const r = await renderSoundtrack(TL, from, to, await voiceBuffers(), soundRate);
      soundPCM = new Uint8Array(r.pcm.buffer);
      return Math.ceil((44 + soundPCM.length) / CHUNK);
    },
    soundChunk(i) {
      const all = soundPCM; const head = wavHeader(all.length / 4, soundRate);
      const a = i * CHUNK - (i ? 44 : 0), b = Math.min(all.length, (i + 1) * CHUNK - 44);
      if (i === 0) { const c = new Uint8Array(44 + b); c.set(head); c.set(all.subarray(0, b), 44); return b64(c); }
      return b64(all.subarray(a, b));
    },
    srt,
    chapters(from) { return TL.sections.filter((s, i) => s.end > from).map((s, i) => ({ t: i === 0 ? 0 : Math.max(0, s.start - from), title: s.title })); },
  };
}
window.__tl = TL;
window.__render = t => renderFrame(t);
window.__setTier = setTier;
window.__tier = () => tier;
window.__layout = on => { O.log = on ? [] : null; return O.log; };
window.__layoutLog = () => O.log;
window.__state = () => ({ storyT, playing, tier, section: cur().id, cc: ccOn, nar: narOn, subsVisible: getComputedStyle(subsEl).display !== 'none', audio: Object.fromEntries(Object.entries(audios).map(([k, a]) => [k, { t: a.currentTime, paused: a.paused, muted: a.muted }])) });
window.__play = () => { if (!started) $('go').click(); else if (!playing) togglePlay(); };
window.__seek = t => seek(t);

// ---- boot --------------------------------------------------------------------------------------
addEventListener('resize', resize);
resize();
buildBar();
applyPrefs();
(async () => {
  // canvas-only faces load lazily on first use: load every face explicitly before the first real frame
  const faces = ['italic 400 30px "Instrument Serif"', '400 30px "Instrument Serif"', '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"', '500 16px "IBM Plex Sans"'];
  try { await Promise.race([Promise.all(faces.map(f => document.fonts.load(f, 'Aağış'))).then(() => document.fonts.ready), new Promise(r => setTimeout(r, 6000))]); } catch { }
  // warm every scene once (all cue moments), so shaders and fonts are hot before playback
  for (const s of TL.sections) { renderFrame(s.start + 0.8); for (const v of Object.values(s.cue)) renderFrame(v + 0.5); }
  if (VIDEO) {
    setTier('ultra');
    renderFrame(0);
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
    return;
  }
  autoTier();
  resize();
  const go = $('go');
  go.disabled = false; go.textContent = 'Başlat';
  go.onclick = () => {
    started = true; $('start').style.display = 'none';
    sfx.init(); seek(0); playing = true; sfx.resync(); updateUI(); window.__poke();
  };
  requestAnimationFrame(loop);
})();
