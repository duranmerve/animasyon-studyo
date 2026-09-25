// Yazıcının İçinde — entry point: builds the scene, runs the page simulation and plays the story.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadPageFonts, drawPage } from './page/content.js';
import { PagePipeline } from './page/pipeline.js';
import { setupStudio, Laptop, TonerParticles, Steam } from './scene/studio.js';
import { Printer } from './scene/printer.js';
import { Sheet } from './scene/sheet.js';
import { PAGE_L, PAGE_W, LEAD_FINAL } from './scene/layout.js';
import { buildTimeline, smoother, lerp, clamp01, twoLines } from './story/timeline.js';
import { makeState } from './story/state.js';
import { STEPS } from './story/script.js';
import { Insets } from './ui/insets.js';
import { LoupeRenderer } from './ui/loupe.js';
import { Sound, renderSoundtrack, wavBytes } from './audio/sound.js';
import { Narration } from './audio/narration.js';

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const VIDEO = params.get('video') === '1';
if (params.get('ui') === '0') document.body.classList.add('noui');
if (VIDEO) document.body.classList.add('video');

// ---------------------------------------------------------------- renderer
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('capture') || VIDEO });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
let dpr = VIDEO ? 1 : Math.min(maxDpr, 1.25);
renderer.setPixelRatio(dpr);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 1600);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- content + simulation
await loadPageFonts();
const pageCanvas = document.createElement('canvas');
drawPage(pageCanvas);
const pipe = new PagePipeline(renderer, pageCanvas);
pipe.run();
const covOrig = pipe.readOriginalK();

// ---------------------------------------------------------------- scene
setupStudio(renderer, scene);
const printer = new Printer(scene);
const sheet1 = new Sheet(scene); sheet1.setSource(pipe.orig.texture, false);
const sheet2 = new Sheet(scene); sheet2.setSource(pipe.gens[1].texture, true);
const genSheets = [2, 4, 8].map(g => { const s = new Sheet(scene); s.setSource(pipe.gens[g].texture, true); s.mesh.visible = false; return s; });
const laptop = new Laptop(scene, pageCanvas);
const particles = new TonerParticles(scene);
const steam = new Steam(scene);
renderer.compile(scene, camera);

const tl = buildTimeline();
const S = makeState(tl);
const insets = new Insets($('insetCanvas'), pageCanvas);
const loupeR = new LoupeRenderer();
const sound = new Sound();
const narr = new Narration();

const covSampler = (u, v, ch, mono) => {
  if (!mono) return covOrig.sample(u, v, ch);
  const k = covOrig.sample(u, v, 3), c = covOrig.sample(u, v, 0), m = covOrig.sample(u, v, 1);
  return Math.max(k, (c + m) * 0.5);
};

// ---------------------------------------------------------------- camera from shots
// shots are framed for 16:9; on narrow screens widen the vertical fov to keep most of the width
function fitFov(f) {
  const a = camera.aspect;
  if (a >= 1.5) return f;
  const tanH = Math.tan(f * Math.PI / 360) * 1.78 * (a < 1 ? 0.78 : 1);
  return Math.min(92, Math.max(f, 2 * Math.atan(tanH / a) * 180 / Math.PI));
}
const _p = new THREE.Vector3(), _t = new THREE.Vector3();
function shotAt(T) {
  const c = tl.chapterAt(T);
  const u = clamp01((T - c.start) / c.dur);
  const keys = c.shots;
  const prev = c.index > 0 ? tl.chapters[c.index - 1].shots.at(-1) : keys[0];
  const K = (k) => ({ p: new THREE.Vector3(...k[1]), t: new THREE.Vector3(...k[2]), f: k[3] });
  let a, b, e;
  if (u < keys[0][0]) { a = K(prev); b = K(keys[0]); e = smoother(u / keys[0][0]); }
  else {
    let i = 0;
    while (i < keys.length - 1 && u > keys[i + 1][0]) i++;
    if (i >= keys.length - 1) { a = b = K(keys.at(-1)); e = 0; }
    else { a = K(keys[i]); b = K(keys[i + 1]); e = smoother((u - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); }
  }
  _p.copy(a.p).lerp(b.p, e); _t.copy(a.t).lerp(b.t, e);
  const f = lerp(a.f, b.f, e);
  // gentle hand-held drift proportional to the shot distance
  const d = _p.distanceTo(_t) * 0.006;
  _p.x += Math.sin(T * 0.23) * d * 1.2; _p.y += Math.sin(T * 0.17 + 1) * d * 0.8;
  return { p: _p, t: _t, f };
}

// ---------------------------------------------------------------- UI construction
const segEls = tl.chapters.map((c) => {
  const d = document.createElement('div');
  d.style.flex = String(c.dur);
  d.innerHTML = '<b></b>';
  $('segs').appendChild(d);
  return d;
});
$('chapTotal').textContent = String(tl.chapters.length).padStart(2, '0');
STEPS.forEach((s, i) => { const li = document.createElement('li'); li.innerHTML = `<b>${i + 1}</b>${s}`; $('steps').appendChild(li); });
const stepEls = [...$('steps').children];
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
$('startMeta').textContent = `Yaklaşık ${Math.round(tl.total / 60)} dakika · 16 bölüm · ses için hoparlörü açın`;

// ---------------------------------------------------------------- viewer preferences (remembered)
const PREF_KEY = 'yazicinin-ici:prefs';
const prefs = { voice: true, subs: true, subSize: 'm', sfx: true, speed: 1 };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch { /* private mode */ }
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } };

// ---------------------------------------------------------------- playback state
let T = 0, playing = false, speed = prefs.speed, explore = false;
if (params.has('ch')) T = tl.byId[params.get('ch')].start + Number(params.get('t') || 0);
if (params.has('T')) T = Number(params.get('T'));
let lastSeg = null, lastChapter = null, prevSt = null, muted = false;

function setPlaying(p) {
  playing = p;
  $('iPlay').innerHTML = p ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M7 4v16l13-8z"/>';
}
function seek(t) {
  T = Math.max(0, Math.min(tl.total - 0.01, t));
  lastSeg = null;
  if (explore) leaveExplore();
  narr.reset();
}
function chapterJump(dir) {
  const c = tl.chapterAt(T);
  const i = Math.max(0, Math.min(tl.chapters.length - 1, c.index + dir));
  seek(tl.chapters[i].start + 0.01);
}
$('bPlay').onclick = () => { if (explore) { leaveExplore(); seek(0); } setPlaying(!playing); };
$('bPrev').onclick = () => chapterJump(-1);
$('bNext').onclick = () => chapterJump(1);
$('bSubs').onclick = () => applyPrefs({ subs: !prefs.subs });
$('bSound').onclick = () => { muted = !muted; sound.setMuted(muted || !prefs.sfx); narr.muted = muted; $('iSound').style.opacity = muted ? 0.35 : 1; };
$('bFull').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
$('bReplay').onclick = () => { leaveExplore(); seek(0); setPlaying(true); };
// settings panel
const panel = $('settings');
$('bSettings').onclick = (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; $('bSettings').classList.toggle('on', !panel.hidden); };
document.addEventListener('pointerdown', e => {
  if (!panel.hidden && !panel.contains(e.target) && !$('bSettings').contains(e.target)) { panel.hidden = true; $('bSettings').classList.remove('on'); }
});
panel.querySelectorAll('[data-pref]').forEach(el => el.addEventListener('click', () => {
  const k = el.dataset.pref, v = el.dataset.val;
  applyPrefs({ [k]: v === undefined ? !prefs[k] : k === 'speed' ? Number(v) : v });
}));
function applyPrefs(change = {}) {
  Object.assign(prefs, change);
  savePrefs();
  speed = prefs.speed;
  narr.enabled = prefs.voice;
  if (!prefs.voice) narr.stop();
  sound.setMuted(muted || !prefs.sfx);
  document.body.classList.toggle('nosubs', !prefs.subs);
  document.body.classList.remove('sub-s', 'sub-m', 'sub-l');
  document.body.classList.add(`sub-${prefs.subSize}`);
  $('bSubs').classList.toggle('on', prefs.subs);
  $('bSubs').setAttribute('aria-pressed', String(prefs.subs));
  panel.querySelectorAll('[data-pref]').forEach(el => {
    const k = el.dataset.pref, v = el.dataset.val;
    el.classList.toggle('on', v === undefined ? !!prefs[k] : String(prefs[k]) === v);
    if (v === undefined) el.setAttribute('aria-checked', String(!!prefs[k]));
  });
}
const track = $('track');
track.addEventListener('pointermove', e => {
  const r = track.getBoundingClientRect(), f = clamp01((e.clientX - r.left) / r.width);
  const c = tl.chapterAt(f * tl.total);
  $('tip').textContent = `${c.index + 1}. ${c.title}`;
  $('tip').style.left = `${e.clientX - r.left}px`;
});
track.addEventListener('click', e => {
  const r = track.getBoundingClientRect(), f = clamp01((e.clientX - r.left) / r.width);
  const c = tl.chapterAt(f * tl.total);
  seek(c.start + 0.01);
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); $('bPlay').click(); }
  else if (e.code === 'ArrowRight') chapterJump(1);
  else if (e.code === 'ArrowLeft') chapterJump(-1);
  else if (e.key === 'f' || e.key === 'F') $('bFull').click();
  else if (e.key === 'n' || e.key === 'N') applyPrefs({ voice: !prefs.voice });
  else if (e.key === 'c' || e.key === 'C') applyPrefs({ subs: !prefs.subs });
  else if (e.key === 'm' || e.key === 'M') $('bSound').click();
});
let idleTimer = 0;
window.addEventListener('pointermove', () => { idleTimer = 0; document.body.classList.remove('idle'); });

// explore mode: orbit + hover magnifier
const controls = new OrbitControls(camera, canvas);
controls.enabled = false; controls.enableDamping = true; controls.maxDistance = 400; controls.minDistance = 8;
controls.maxPolarAngle = Math.PI * 0.49;
function enterExplore() {
  explore = true; setPlaying(false);
  const s = shotAt(tl.total - 0.01);
  camera.position.copy(s.p); controls.target.copy(s.t); controls.enabled = true; controls.update();
  $('explore').hidden = false;
}
function leaveExplore() { explore = false; controls.enabled = false; $('explore').hidden = true; }
const pointer = { x: -1, y: -1, in: false };
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.in = true; });
canvas.addEventListener('pointerleave', () => { pointer.in = false; });

// ---------------------------------------------------------------- per-frame application
const sheetKeys = { s1: sheet1, s2: sheet2, g2: genSheets[0], g4: genSheets[1], g8: genSheets[2] };
const sheetPose = {};
function applySheet(sheet, s, active, st, key) {
  sheet.mesh.visible = s.visible !== false;
  if (!sheet.mesh.visible) return;
  if (s.mode === 'path') { sheet.followPath(s.lead); sheetPose[key] = null; }
  else { sheet.setPose(s.p, s.q, s.bow || 0); sheetPose[key] = { p: s.p.clone(), q: s.q.clone(), bow: s.bow || 0 }; }
  sheet.setPrint({ lead: s.lead ?? LEAD_FINAL, full: s.full, active, scanX: st.scanX, scanOn: key === 's1' ? st.lampOn : 0 });
}
function sheetPoint(key, u, v) {
  const P = sheetPose[key];
  if (!P) return null;
  return new THREE.Vector3((u - 0.5) * PAGE_W, 0.05, (v - 0.5) * PAGE_L).applyQuaternion(P.q).add(P.p);
}

function apply(st) {
  printer.update({
    ...st,
    sepTex: st.job === 2 ? pipe.gens[1].texture : pipe.orig.texture,
  }, T, covSampler);
  applySheet(sheet1, st.sheet1, [1, 1, 1, 1], st, 's1');
  applySheet(sheet2, st.sheet2, [0, 0, 0, 1], st, 's2');
  st.gens.forEach((g, i) => applySheet(genSheets[i], { mode: 'pose', full: true, visible: g.visible, p: g.p, q: g.q, bow: g.bow }, [0, 0, 0, 1], st, ['g2', 'g4', 'g8'][i]));
  laptop.update(st);
  const devVis = st.chapter.id === 'develop' ? 1 : st.chapter.id === 'laser' ? clamp01((tl.ph('laser', T) - 0.8) * 5) : st.chapter.id === 'transfer' ? 1 - clamp01(tl.ph('transfer', T) * 4) : 0;
  particles.update(st, st.job === 1 ? (u, v) => covOrig.sample(u, v, 3) : null, devVis);
  const fu = tl.ph('fuse', T), ou = tl.ph('output', T);
  steam.update(T, (fu > 0.05 && fu < 1 ? 1 : 0) + (ou > 0 && ou < 0.2 ? 1 - ou * 5 : 0));
}

// ---------------------------------------------------------------- overlay (labels, leaders, loupes, texts)
const labelsEl = $('labels'), loupesEl = $('loupes'), svg = $('leaders');
const pool = { labels: [], loupes: [] };
const getEl = (list, parent, cls) => { let el = list.find(e => !e._used); if (!el) { el = document.createElement('div'); el.className = cls; parent.appendChild(el); list.push(el); } el._used = true; return el; };
const _v = new THREE.Vector3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight, front: _v.z < 1 && _v.z > -1 };
}
function overlay(st, loupeDraws) {
  pool.labels.forEach(e => (e._used = false));
  pool.loupes.forEach(e => (e._used = false));
  let lines = '';
  const c = st.chapter, u = (T - c.start) / c.dur;
  const W = window.innerWidth, H = window.innerHeight, md = Math.min(W, H), sc = md < 700 ? 0.7 : 1;
  if (!explore) {
    // part labels
    c.labels.forEach(([key, text, a, b, dx, dy]) => {
      const anchor = printer.anchors[key];
      if (!anchor || u < a || u > b) return;
      const fade = Math.min(1, (u - a) * c.dur / 0.5, (b - u) * c.dur / 0.5);
      const s = toScreen(anchor);
      if (!s.front) return;
      const el = getEl(pool.labels, labelsEl, 'lbl');
      el.className = 'lbl';
      el.textContent = text;
      const lx = s.x + dx * 1.6 * sc, ly = s.y + dy * 1.6 * sc;
      el.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;
      el.style.opacity = fade;
      lines += `<g opacity="${fade}"><line x1="${s.x}" y1="${s.y}" x2="${lx}" y2="${ly}"/><circle cx="${s.x}" cy="${s.y}" r="4"/></g>`;
    });
    // sheet names on the desk
    if (c.id === 'compare' || c.id === 'generations') {
      const names = c.id === 'compare' ? [['s1', 'Orijinal'], ['s2', 'Kopya']] : [['s1', 'Orijinal'], ['s2', '1. kopya'], ['g2', '2. kopya'], ['g4', '4. kopya'], ['g8', '8. kopya']];
      const f = c.id === 'compare' ? clamp01((tl.ph('compare', T) - 0.2) * 8) : 1;
      names.forEach(([k, n]) => {
        if (!sheetKeys[k].mesh.visible) return;
        const top = c.id === 'compare';
        const p = sheetPoint(k, 0.5, top ? -0.03 : 1.03); if (!p) return;
        const s = toScreen(p); if (!s.front) return;
        const el = getEl(pool.labels, labelsEl, 'lbl');
        el.className = 'lbl sheetName'; el.textContent = n;
        el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, ${top ? '-100%' : '0'})`;
        el.style.opacity = f;
      });
    }
  }
  // loupes
  const list = explore ? hoverLoupe() : st.loupes;
  const n = list.length;
  const R = md * (n >= 5 ? 0.075 : n >= 4 ? 0.095 : n >= 2 ? 0.125 : 0.15);
  list.forEach(L => {
    const sheet = sheetKeys[L.sheet];
    if (!sheet.mesh.visible) return;
    const P = sheetPoint(L.sheet, L.u, L.v); if (!P) return;
    const s = toScreen(P); if (!s.front) return;
    // projected size of the magnified patch
    const P2 = sheetPoint(L.sheet, L.u + L.span / 2 / PAGE_W, L.v);
    const s2 = toScreen(P2);
    const ring = Math.max(4, Math.hypot(s2.x - s.x, s2.y - s.y));
    let cx = s.x + L.dx * md, cy = s.y + L.dy * md;
    cx = Math.max(R + 12, Math.min(W - R - 12, cx)); cy = Math.max(R + 70, Math.min(H - R - 150, cy));
    const el = getEl(pool.loupes, loupesEl, 'loupe');
    el.style.width = el.style.height = `${2 * R}px`;
    el.style.transform = `translate(${cx - R}px, ${cy - R}px)`;
    el.innerHTML = `<i>×${Math.max(2, Math.round(R / ring))}</i>${L.label ? `<span>${L.label}</span>` : ''}`;
    el.style.opacity = 1;
    const ang = Math.atan2(cy - s.y, cx - s.x);
    lines += `<g><circle class="ring" cx="${s.x}" cy="${s.y}" r="${ring}" fill="none"/><line class="lp" x1="${s.x + Math.cos(ang) * ring}" y1="${s.y + Math.sin(ang) * ring}" x2="${cx - Math.cos(ang) * R}" y2="${cy - Math.sin(ang) * R}"/></g>`;
    loupeDraws.push({ x: cx - R + 6, y: cy - R + 6, size: 2 * R - 12, tex: L.sheet === 's1' ? pipe.orig.texture : pipe.gens[{ s2: 1, g2: 2, g4: 4, g8: 8 }[L.sheet]].texture, mono: L.sheet !== 's1', u: L.u, v: L.v, span: L.span });
  });
  svg.innerHTML = lines.replace(/class="ring"/g, 'style="fill:none"');
  pool.labels.forEach(e => { if (!e._used) e.style.opacity = 0; });
  pool.loupes.forEach(e => { if (!e._used) e.style.opacity = 0; });
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hoverLoupe() {
  if (!pointer.in) return [];
  ndc.set(pointer.x / window.innerWidth * 2 - 1, -(pointer.y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const names = { s1: 'Orijinal', s2: '1. kopya', g2: '2. kopya', g4: '4. kopya', g8: '8. kopya' };
  let best = null;
  for (const [k, sh] of Object.entries(sheetKeys)) {
    const P = sheetPose[k]; if (!P || !sh.mesh.visible) continue;
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(P.q);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, P.p);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (!hit) continue;
    const loc = hit.clone().sub(P.p).applyQuaternion(P.q.clone().invert());
    const u = loc.x / PAGE_W + 0.5, v = loc.z / PAGE_L + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const d = hit.distanceTo(camera.position);
    if (!best || d < best.d) best = { d, sheet: k, u, v };
  }
  if (!best) return [];
  return [{ sheet: best.sheet, u: best.u, v: best.v, span: 2.4, dx: 0.14, dy: -0.14, label: names[best.sheet] }];
}

let insetKind = null, subWords = [], subShown = 0;
function texts(st) {
  const c = st.chapter;
  if (c !== lastChapter) {
    lastChapter = c;
    $('chapNum').textContent = String(c.index + 1).padStart(2, '0');
    $('chapTitle').textContent = c.title;
  }
  // steps
  const showSteps = c.step !== undefined && c.step >= 0 || c.id === 'summary';
  $('steps').classList.toggle('hide', !showSteps);
  const order = [0, 1, 2, 3, 4, 5];
  stepEls.forEach((el, i) => {
    el.classList.toggle('on', c.id === 'summary' ? i === Math.floor((T - c.start) / 1.3) % 6 : i === c.step);
    el.classList.toggle('done', c.step >= 0 && order.indexOf(i) < order.indexOf(c.step) && i !== 5);
  });
  // subtitle, one two-line segment at a time
  const sg = explore ? null : tl.segAt(T);
  const sub = $('subText');
  if (sg !== lastSeg) {
    if (sg) {
      // every word is its own element, laid out from the start so lines never reflow as words appear
      let k = 0;
      sub.innerHTML = twoLines(sg.text).map(l => `<span class="ln">${l.split(/\s+/).map(w => `<i data-k="${k++}">${esc(w)}</i>`).join(' ')}</span>`).join('');
      subWords = [...sub.querySelectorAll('i')].map((el, i) => ({ el, t: sg.words[i]?.t ?? sg.start }));
      subShown = 0;
      sub.classList.add('show'); document.body.classList.add('has-sub');
    } else { sub.classList.remove('show'); document.body.classList.remove('has-sub'); subWords = []; }
    lastSeg = sg;
  }
  // reveal the words that have been spoken (a hair early, so the eye is not behind the voice)
  let n = 0;
  while (n < subWords.length && subWords[n].t <= T + 0.06) n++;
  if (n !== subShown) {
    subWords.forEach((w, i) => w.el.classList.toggle('on', i < n));
    subShown = n;
  }
  // inset
  const ch = c.inset && !explore ? c.inset : null;
  const u = (T - c.start) / c.dur;
  const show = ch && u > (ch === 'scan' ? tl.cueU('scan', 1) - 0.01 : 0.03) && u < 0.985;
  $('inset').classList.toggle('show', !!show);
  if (show) {
    const q = c.cues.reduce((acc, qq, i) => (T >= qq.start - 0.1 ? i : acc), 0);
    const lt = T - (c.cues[q]?.start ?? c.start);
    const r = insets.draw(ch, ch === 'summary' ? T - c.start : lt, q, { scan: pipe.scan1, progress: st.scanProgress });
    if (insetKind !== ch + q) { $('insetTitle').textContent = r.title; $('insetCaption').textContent = r.caption; insetKind = ch + q; }
  }
  // bar
  segEls.forEach((el, i) => {
    const cc = tl.chapters[i];
    el.firstChild.style.width = `${clamp01((T - cc.start) / cc.dur) * 100}%`;
    el.classList.toggle('cur', cc === c);
  });
  $('clock').textContent = `${fmt(T)} / ${fmt(tl.total)}`;
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- sound: narration clips + machine
const cueList = tl.chapters.flatMap(c => c.cues);
function audio(st, prev, dt) {
  const ch = explore ? null : tl.voiceAt(T);
  narr.sync(T, playing, speed, ch);
  const cur = tl.chapterAt(T);
  narr.prefetch([cur, tl.chapters[cur.index + 1]]);
  sound.setDuck(narr.speaking);
  sound.step(st, prev, dt, tl, { playing, explore });
}

// ---------------------------------------------------------------- loop
let last = performance.now(), frameAvg = 16, dprTimer = 0;
let dprLocked = VIDEO || params.has('capture'), dprSamples = [], playClock = 0;
function frame(now) {
  const raw = now - last;
  const dt = Math.min(0.1, raw / 1000);
  last = now;
  if (playing && !explore) {
    const before = T;
    T += dt * speed;
    // while a chapter recording plays it is the clock: the picture catches up with the voice,
    // or waits for it, but story time never runs backwards (no visible jumps)
    const at = narr.clock();
    if (at !== null) {
      const d = at - T;
      if (narr.waiting) T = before;                              // recording still buffering: wait for it
      else if (d > -6 && d < 1.5) T = Math.max(before, T + d * 0.25);
      else if (d <= -6) narr.seekTo(T - narr.ch.voice.start);    // far behind (e.g. tab was hidden)
    }
    if (T >= tl.total) { T = tl.total - 0.001; enterExplore(); }
  }
  const st = renderAt(T);
  audio(st, prevSt, dt);
  prevSt = st;
  idleTimer += dt;
  if (playing && idleTimer > 3.5 && panel.hidden) document.body.classList.add('idle');
  // resolution: measured once while the start screen shows, lowered if needed, then fixed
  // measured behind the start screen, so playback itself never changes resolution
  if (!dprLocked && playing) dprLocked = true;
  if (!dprLocked) {
    playClock += dt;
    if (playClock > 1.5) dprSamples.push(raw);
    if (dprSamples.length >= 90) {
      dprSamples.sort((x, y) => x - y);
      const typical = dprSamples[Math.floor(dprSamples.length * 0.6)];
      if (typical > 24 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr * Math.sqrt(16.7 / typical));
        renderer.setPixelRatio(dpr); resize();
      }
      dprLocked = true;
    }
  }
  requestAnimationFrame(frame);
}

// draw the story at time t (also called frame by frame when rendering a video)
function renderAt(t) {
  T = t;
  const st = S(T);
  apply(st);
  if (explore) controls.update();
  else if (params.has('cam')) {
    const c = params.get('cam').split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]); camera.lookAt(c[3], c[4], c[5]);
    if (c[6] && camera.fov !== c[6]) { camera.fov = c[6]; camera.updateProjectionMatrix(); }
  } else {
    const s = shotAt(T);
    camera.position.copy(s.p); camera.lookAt(s.t);
    const f = fitFov(s.f);
    if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
  }
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
  const loupeDraws = [];
  overlay(st, loupeDraws);
  renderer.autoClear = false;
  loupeDraws.forEach(d => loupeR.draw(renderer, d.x, d.y, d.size, d.tex, d.mono, d.u, d.v, d.span));
  renderer.autoClear = true;
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  texts(st);
  return st;
}
if (!VIDEO) requestAnimationFrame(frame);

// ---------------------------------------------------------------- start
const skipStart = params.has('ch') || params.has('T');
$('cVoice').checked = prefs.voice;
$('cSubs').checked = prefs.subs;
applyPrefs();
$('bStart').disabled = false;
$('bStart').textContent = 'Başla';
$('bStart').onclick = () => {
  $('start').classList.add('gone');
  sound.start();
  applyPrefs({ voice: $('cVoice').checked, subs: $('cSubs').checked });
  setPlaying(true);
};
if (skipStart || VIDEO) { $('start').classList.add('gone'); if (params.get('play') === '1') { sound.start(); setPlaying(true); } }

// ---------------------------------------------------------------- video rendering hooks (tools/render-video.mjs at the root)
// subtitles are burned in only with ?subs=1; the .srt file is always made for YouTube captions
if (VIDEO) {
  applyPrefs({ subs: params.get('subs') === '1', subSize: 'm' });
  let wav = null;
  window.__video = {
    duration: tl.total,
    renderAt: (t) => { renderAt(Math.min(t, tl.total - 0.001)); },
    async prepareSound(from = 0, to = tl.total, opts = {}) {
      const buf = await renderSoundtrack(tl, S, { from, to, ...opts });
      wav = wavBytes(buf);
      return Math.ceil(wav.length / 2e6);
    },
    soundChunk(i) {
      const part = wav.subarray(i * 2e6, (i + 1) * 2e6);
      let s = '';
      for (let k = 0; k < part.length; k += 0x8000) s += String.fromCharCode.apply(null, part.subarray(k, k + 0x8000));
      return btoa(s);
    },
    srt(from = 0, to = tl.total) {
      const ts = (x) => {
        x = Math.max(0, x - from);
        const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
      };
      return tl.segments.filter(g => g.end > from && g.start < to)
        .map((g, i) => `${i + 1}\n${ts(g.start)} --> ${ts(Math.min(g.end, to))}\n${twoLines(g.text).join('\n')}\n`).join('\n');
    },
    chapters(from = 0) { return tl.chapters.filter(c => c.end > from).map(c => ({ t: Math.max(0, c.start - from), title: c.title })); },
  };
}

// hooks for automated screenshots
window.__tl = tl;
window.__narr = narr;
window.__T = () => T;
window.__seek = (t) => { T = t; };
// warm-up: render the moments that first use a shader (laser beams, particles, loupes) behind the start screen
if (!VIDEO) {
  const keep = T;
  for (const id of ['laser', 'develop', 'output', 'scan', 'compare', 'generations']) {
    const c = tl.byId[id];
    renderAt(c.start + c.dur * 0.6);
  }
  renderAt(keep); T = keep;
}
window.__ready = true;
