// ============================================================
//  ENGINE — renderer, post, timeline, HUD, labels, map, audio
// ============================================================
const $ = id => document.getElementById(id);
const APP = $('app');
const TEST = new URLSearchParams(location.search);
const CAPTURE = TEST.has('capture'); // frame-by-frame video rendering
const canvas = $('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
} catch (e) {
  $('err').style.display = 'flex'; $('err').textContent = 'Bu cihazda WebGL başlatılamadı. Güncel bir tarayıcıda (Chrome, Edge, Safari, Firefox) açmayı deneyin.';
  throw e;
}
const DPR = Math.min(devicePixelRatio || 1, QUALITY < 1 ? 1.25 : 1.5);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const camera = new THREE.PerspectiveCamera(60, 1, 0.02, 600);
const headlamp = new THREE.PointLight(0xfff0e4, 4, 40, 1.3);
camera.add(headlamp); headlamp.position.set(0, 0.35, 1.3);

const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: CAPTURE ? 4 : QUALITY < 1 ? 0 : 2 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.55, 0.85);
const outputPass = new OutputPass();
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 1 }, uCA: { value: 0.004 }, uGrain: { value: 0.035 }, uBarrel: { value: 0.06 }, uFade: { value: 0 }, uFadeCol: { value: new THREE.Color(0, 0, 0) }, uAspect: { value: 1.7 }, uFlash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uVig,uCA,uGrain,uBarrel,uFade,uAspect,uFlash; uniform vec3 uFadeCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c=vUv-.5; float r2=dot(c,c);
      vec2 uv=.5+c*(1.+uBarrel*r2);
      vec2 d=c*uCA*(0.4+r2*3.);
      vec3 col=vec3(texture2D(tDiffuse,uv+d).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-d).b);
      vec2 ca=c*vec2(uAspect,1.); float v=1.-uVig*smoothstep(.35,1.05,length(ca)*1.25);
      col*=v;
      col+=(h(vUv*vec2(1731.,977.)+fract(uTime*7.))-.5)*uGrain;
      col=mix(col,vec3(1.,.93,.9),uFlash);
      col=mix(col,uFadeCol,uFade);
      gl_FragColor=vec4(col,1.);
    }`,
};
const finalPass = new ShaderPass(FinalShader);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(outputPass); composer.addPass(finalPass);
const FU = finalPass.uniforms;

let VW = 1, VH = 1;
// adaptive resolution: drop pixel ratio when frames get slow, restore when there is headroom
const PERF = { acc: 0, n: 0, scale: 1, calm: 0 };
// keep the internal render size around 1.5 megapixels at most; adaptive scaling goes lower when needed
const MAXPIX = CAPTURE ? Infinity : 1.5e6;
function resize() {
  VW = APP.clientWidth || innerWidth; VH = APP.clientHeight || innerHeight;
  const pr = Math.min(DPR, Math.sqrt(MAXPIX / (VW * VH))) * PERF.scale;
  if (Math.abs(renderer.getPixelRatio() - pr) > 0.01) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); }
  renderer.setSize(VW, VH, false); composer.setSize(VW, VH);
  bloom.resolution.set(VW * renderer.getPixelRatio() * 0.4, VH * renderer.getPixelRatio() * 0.4);
  camera.aspect = VW / VH; camera.updateProjectionMatrix();
  FU.uAspect.value = VW / VH;
}
addEventListener('resize', resize);

// ---------------- Registry ----------------
const WORLDS = {};
const CH = [];
const defWorld = (k, fn) => { WORLDS[k] = fn; };
const defChapter = o => { CH.push(o); };
let TOTAL = 0;
function layoutChapters() {
  CH.sort((a, b) => a.order - b.order);
  let s = 0;
  CH.forEach((c, i) => {
    c.i = i; c.start = s; s += c.dur;
    const prev = CH[i - 1], next = CH[i + 1];
    if (c.fadeIn === undefined) c.fadeIn = !prev || prev.world !== c.world;
    if (c.fadeOut === undefined) c.fadeOut = !!next && next.world !== c.world;
  });
  TOTAL = s;
}
const built = new Map(); // key → world
function getWorld(key) {
  if (built.has(key)) return built.get(key);
  const t0 = performance.now();
  const w = WORLDS[key]();
  w.key = key; w.motes = [];
  w.scene.traverse(o => { if (o.userData.motes) w.motes.push(o.material); });
  built.set(key, w);
  if (TEST.has('log')) console.log('built', key, Math.round(performance.now() - t0) + 'ms');
  return w;
}
// Free GPU memory of scenes far from the current chapter (their data stays in RAM and re-uploads
// on first render, which always happens under a fade).
function releaseGPU(w) {
  const tex = new Set();
  w.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k of ['map', 'normalMap']) if (m[k]) tex.add(m[k]); });
  tex.forEach(t => t.dispose()); w.gpu = false;
}
function manageGPU(i) {
  const keep = new Set(); for (let d = -1; d <= 2; d++) { const c = CH[i + d]; if (c) keep.add(c.world); }
  for (const [k, w] of built) { if (keep.has(k)) w.gpu = true; else if (w.gpu !== false) releaseGPU(w); }
}
function chapterAt(t) { for (let i = CH.length - 1; i >= 0; i--) if (t >= CH[i].start) return i; return 0; }

// ---------------- State ----------------
let T = 0, playing = false, speed = 1, started = false, curI = -1, curW = null, lastNow = performance.now(), REAL = 0;
let holdK = 1, holdTarget = 1;

// ---------------- HUD ----------------
const hud = { clock: $('r-clock'), loc: $('r-loc'), ph: $('r-ph'), phv: $('r-ph').firstElementChild, phbar: $('r-ph').querySelector('i'), scale: $('r-scale'), state: $('r-state'),
  num: $('ch-num'), name: $('ch-name'), latin: $('ch-latin'), blurb: $('ch-blurb'), card: $('chapter'), facts: $('facts'), sub: $('sub-text'), banner: $('banner'), bannerText: $('banner-text'), where: $('map-where') };
const cache = {};
const setText = (el, key, v) => { if (cache[key] !== v) { cache[key] = v; el.textContent = v; } };
const pad2 = n => String(Math.floor(n)).padStart(2, '0');
function fmtClock(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return `+${pad2(h)}:${pad2(m)}:${pad2(x)}`; }
const trNum = (v, d = 1) => v.toFixed(d).replace('.', ',');
function valAt(spec, t, dur) {
  if (spec == null) return null;
  if (typeof spec === 'number' || typeof spec === 'string') return spec;
  if (typeof spec === 'function') return spec(t);
  if (Array.isArray(spec) && Array.isArray(spec[0])) return typeof spec[0][1] === 'string' ? stepVal(t, spec) : kf(t, spec, x => x);
  if (Array.isArray(spec)) return lerp(spec[0], spec[1], clamp(t / dur));
  return null;
}
function enterChapter(i) {
  const c = CH[i]; curI = i;
  curW = getWorld(c.world);
  if (preloaded) manageGPU(i);
  renderPass.scene = curW.scene;
  camera.removeFromParent(); curW.scene.add(camera);
  headlamp.intensity = c.lamp?.[0] ?? curW.lamp?.[0] ?? 4; headlamp.distance = c.lamp?.[1] ?? curW.lamp?.[1] ?? 40; headlamp.decay = c.lamp?.[3] ?? curW.lamp?.[3] ?? 1.3; headlamp.color.set(c.lamp?.[2] ?? curW.lamp?.[2] ?? 0xfff0e4);
  c.enter?.(curW);
  // card
  hud.num.textContent = c.n != null ? `${pad2(c.n)} / ${pad2(Math.max(...CH.map(x => x.n ?? 0)))}` : 'Başlangıç';
  hud.name.textContent = c.name; hud.latin.textContent = c.latin || ''; hud.blurb.textContent = c.blurb || '';
  hud.card.classList.remove('swap'); void hud.card.offsetWidth; hud.card.classList.add('swap');
  hud.facts.innerHTML = (c.facts || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  setLabels(c);
  MAP.enter(c);
  cache.cue = null;
  document.querySelectorAll('#segs i').forEach((el, k) => el.classList.toggle('cur', k === i));
  APP.classList.toggle('fin', c.id === 'final');
  $('end').classList.toggle('gone', c.id !== 'final' || endHidden);
  if (c.id === 'final' && started) { playing = true; }
}
function updateHUD(c, t) {
  const dur = c.dur;
  const clk = valAt(c.clock, t, dur) ?? 0;
  const rate = Array.isArray(c.clock) && !Array.isArray(c.clock[0]) ? (c.clock[1] - c.clock[0]) / dur : 1;
  setText(hud.clock, 'clk', fmtClock(clk) + (rate > 3 ? `  ⏩×${rate > 999 ? Math.round(rate / 100) * 100 : Math.round(rate)}` : ''));
  setText(hud.loc, 'loc', valAt(c.loc, t, dur) ?? c.name);
  const ph = valAt(c.ph, t, dur);
  if (ph != null) { setText(hud.phv, 'ph', trNum(ph)); const x = (ph / 14 * 100).toFixed(1) + '%'; if (cache.phx !== x) { cache.phx = x; hud.phbar.style.left = x; } }
  setText(hud.scale, 'sc', valAt(c.scale, t, dur) ?? '');
  setText(hud.state, 'st', valAt(c.state, t, dur) ?? '');
  // subtitle
  let cue = null, next = dur;
  if (c.cues) for (let k = 0; k < c.cues.length; k++) { if (t >= c.cues[k][0]) { cue = k; next = c.cues[k + 1]?.[0] ?? dur; } }
  const key = c.id + ':' + cue;
  if (cache.cue !== key) {
    cache.cue = key; const txt = cue != null ? c.cues[cue][1] : '';
    if (CAPTURE) hud.sub.textContent = txt;
    else { hud.sub.classList.add('out'); clearTimeout(hud._st); hud._st = setTimeout(() => { setSubWords(c, cue, txt); hud.sub.classList.remove('out'); }, cache.first ? 260 : 0); }
    APP.classList.toggle('has-sub', !!txt && !CAPTURE);
    cache.first = true;

  }
  if (CAPTURE) {
    const cs = cue != null ? c.cues[cue][0] : 0;
    hud.sub.style.opacity = (sstep(cs, cs + 0.35, t) * (1 - sstep(next - 0.3, next, t))).toFixed(3);
    hud.card.style.opacity = sstep(0.1, 1.0, t).toFixed(3);
    hud.card.style.transform = `translateY(${((1 - sstep(0.1, 1.0, t)) * 14).toFixed(1)}px)`;
  }
  // hold if narration still speaking near the next cue
  if (!CAPTURE && SUBW.els.length) revealSubWords(c, t);
  holdTarget = 1;
  // without narration: slow down a cue that is on screen for less time than it takes to read (~14 chars/s)
  if (cue != null && !CAPTURE && !(VOICE.on && VOICE.map(c))) {
    const read = 1.2 + c.cues[cue][1].length / 14, span = next - c.cues[cue][0];
    if (span < read) holdTarget = Math.max(0.4, span / read);
  }
  // banner
  let bo = 0;
  if (c.banner) { const [a, b, text] = c.banner; bo = win(t, a, b, 0.5); if (bo > 0) setText(hud.bannerText, 'ban', text); }
  if (cache.bo !== bo) { cache.bo = bo; hud.banner.style.opacity = bo; hud.banner.style.transform = `scale(${1 + (1 - bo) * 0.06})`; if (CAPTURE) hud.card.style.opacity = Math.min(+hud.card.style.opacity || 1, 1 - bo); if (!CAPTURE) hud.card.style.opacity = 1 - bo; }
}

// ---------------- 3D labels ----------------
let LBL = [];
const _lv = new THREE.Vector3();
function setLabels(c) {
  const root = $('labels'); root.innerHTML = ''; LBL = [];
  for (const d of c.labels || []) {
    const el = document.createElement('div'); el.className = 'lbl' + (d.hero ? ' hero' : '');
    el.innerHTML = `<i class="pin"></i><i class="lead"></i><div class="tag"><b></b>${d.sub ? '<i></i>' : ''}</div>`;
    el.querySelector('b').textContent = d.text; if (d.sub) el.querySelector('.tag i').textContent = d.sub;
    el.style.opacity = 0; root.appendChild(el);
    LBL.push({ d, el, lead: el.querySelector('.lead'), tag: el.querySelector('.tag'), side: 0 });
  }
}
function updateLabels(c, t) {
  const k = FU.uBarrel.value;
  for (const L of LBL) {
    const d = L.d; let a = win(t, d.t0, d.t1, 0.35);
    if (a <= 0.001) { if (L.vis !== false) { L.el.style.opacity = 0; L.vis = false; } continue; }
    const p = d.at(curW, t); if (!p) { L.el.style.opacity = 0; L.vis = false; continue; }
    _lv.copy(p).project(camera);
    if (_lv.z > 1 || _lv.z < -1) { L.el.style.opacity = 0; L.vis = false; continue; }
    let sx = _lv.x * 0.5, sy = -_lv.y * 0.5; // centred (-.5...5)
    for (let it = 0; it < 3; it++) { const r2 = sx * sx + sy * sy; sx = (_lv.x * 0.5) / (1 + k * r2); sy = (-_lv.y * 0.5) / (1 + k * r2); }
    const x = (sx + 0.5) * VW, y = (sy + 0.5) * VH;
    if (x < -40 || x > VW + 40 || y < -40 || y > VH + 40) { L.el.style.opacity = 0; L.vis = false; continue; }
    const narrow = VW < 760;
    let dx = (d.dx ?? 64) * (narrow ? 0.6 : 1), dy = (d.dy ?? -44) * (narrow ? 0.7 : 1);
    const side = x > VW * 0.6 ? -1 : x < VW * 0.4 ? 1 : Math.sign(dx) || 1;
    if (L.side !== side) { L.side = side; L.tag.style.transform = side > 0 ? 'translate(6px,-50%)' : 'translate(calc(-100% - 6px),-50%)'; }
    dx = Math.abs(dx) * side;
    const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    L.lead.style.width = len + 'px'; L.lead.style.transform = `rotate(${ang}rad)`;
    L.tag.style.left = dx + 'px'; L.tag.style.top = dy + 'px';
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    L.el.style.opacity = a.toFixed(3); L.vis = true;
  }
}

// ---------------- Body map ----------------
function mapSVG(id) {
  const M = MAPDATA;
  let s = `<svg id="${id}" class="bmap" viewBox="0 0 200 432" role="img" aria-label="Vücut haritası: besinin rotası"><defs><filter id="${id}-g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
  s += `<path class="body" d="${M.body}"/><ellipse class="body" cx="100" cy="40" rx="24" ry="31"/>`;
  for (const [k, v] of Object.entries(M.organs)) s += v.replace(/^<(\w+)/, `<$1 class="org" data-o="${k}"`);
  s += `<path d="M86,30 C90,24 96,28 100,24 C104,28 110,24 114,30 M84,38 C90,34 94,40 100,36 C106,40 110,34 116,38" fill="none" stroke="rgba(244,163,191,.3)" stroke-width=".6"/>`;
  for (const [c, d] of M.vessels) s += `<path class="ves" stroke="${c}" d="${d}"/>`;
  for (const [k, d] of Object.entries(M.tract)) s += `<path class="tract" data-o="${k}" d="${d}"/>`;
  for (const [k, d] of Object.entries(M.routes)) s += `<path class="route" data-r="${k}" d="${d}"/>`;
  s += `<circle class="mhalo" r="7" filter="url(#${id}-g)"/><circle class="mdot" r="2.6"/></svg>`;
  return s;
}
const MAP = {
  init() {
    if (typeof MAPDATA === 'undefined') { document.querySelector('.mapbox').remove(); document.querySelector('.end-side').insertAdjacentHTML('afterbegin', ''); this.off = true; return; }
    document.querySelector('.mapbox').insertAdjacentHTML('beforeend', mapSVG('map'));
    document.querySelector('.end-side').insertAdjacentHTML('afterbegin', mapSVG('map2'));
    this.svg = $('map'); this.dot = this.svg.querySelector('.mdot'); this.halo = this.svg.querySelector('.mhalo');
    this.routes = {}; this.svg.querySelectorAll('.route').forEach(p => { this.routes[p.dataset.r] = p; p._len = p.getTotalLength(); p.style.strokeDasharray = p._len; p.style.strokeDashoffset = p._len; });
    // end map shows full route
    $('map2').querySelectorAll('.route').forEach(p => { p.classList.add('done'); });
    $('map2').querySelectorAll('.mdot,.mhalo').forEach(e => e.remove());
    $('map2').querySelectorAll('.org,.tract').forEach(e => e.classList.add('on'));
  },
  enter(c) {
    if (this.off) return;
    const on = new Set(c.mapOn || []);
    this.svg.querySelectorAll('.org,.tract').forEach(e => e.classList.toggle('on', on.has(e.dataset.o)));
    const order = CH.map(x => x.route);
    const doneSet = new Set(order.slice(0, c.i));
    if (c.route === 'colon') doneSet.delete('absorb');
    for (const [k, p] of Object.entries(this.routes)) {
      const done = doneSet.has(k) && !(c.route === 'colon' && ['absorb', 'liver', 'heart', 'lungs', 'aorta', 'brain'].includes(k) && false);
      p.classList.toggle('done', done); p.classList.toggle('cur', k === c.route);
      p.style.strokeDashoffset = done ? 0 : p._len;
    }
    hud.where.textContent = c.mapWhere || c.name;
  },
  update(c, t) {
    if (this.off) return;
    const p = this.routes[c.route]; if (!p) return;
    const f = clamp(c.mapProg ? c.mapProg(t) : t / c.dur);
    const off = (p._len * (1 - f)).toFixed(1);
    if (p._off !== off) { p._off = off; p.style.strokeDashoffset = off; const pt = p.getPointAtLength(p._len * f); this.dot.setAttribute('cx', pt.x); this.dot.setAttribute('cy', pt.y); this.halo.setAttribute('cx', pt.x); this.halo.setAttribute('cy', pt.y); }
  },
};

// ---------------- Audio ----------------
const AU = {
  ctx: null, on: true, t: {},
  init(offline) {
    if (CAPTURE && !offline) return;
    if (this.ctx && !offline) { this.ctx.resume?.(); return; }
    if (offline) this.ctx = offline;
    else try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.85 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5;
    this.master.connect(comp); comp.connect(c.destination);
    const mk = (secs, fn) => { const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate); fn(b.getChannelData(0)); return b; };
    let last = 0;
    this.brown = mk(6, d => { for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } });
    this.white = mk(3, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    // ambient body rumble
    this.ambF = c.createBiquadFilter(); this.ambF.type = 'lowpass'; this.ambF.frequency.value = 260;
    this.ambG = c.createGain(); this.ambG.gain.value = 0;
    const loop = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0); return s; };
    loop(this.brown).connect(this.ambF).connect(this.ambG).connect(this.master);
    // fluid rush
    this.flF = c.createBiquadFilter(); this.flF.type = 'bandpass'; this.flF.frequency.value = 420; this.flF.Q.value = 0.8;
    this.flG = c.createGain(); this.flG.gain.value = 0;
    loop(this.white).connect(this.flF).connect(this.flG).connect(this.master);
    // pad (brain/final)
    this.padG = c.createGain(); this.padG.gain.value = 0; this.padG.connect(this.master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(this.padG);
    [110, 164.8, 220, 277.2, 329.6].forEach((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 2) * 4; const g = c.createGain(); g.gain.value = 0.05; const l = c.createOscillator(); l.frequency.value = 0.07 + i * 0.03; const lg = c.createGain(); lg.gain.value = 0.035; l.connect(lg).connect(g.gain); l.start(0); o.connect(g).connect(lp); o.start(0); });
  },
  mute(v) { this.on = !v; if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.85 : 0, this.ctx.currentTime, 0.05); },
  set(a) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const amb = a.amb || [260, 0.25], fl = a.flow || [420, 0], pad = a.pad || 0;
    this.ambF.frequency.setTargetAtTime(amb[0], t, 0.4); this.ambG.gain.setTargetAtTime(amb[1], t, 0.4);
    this.flF.frequency.setTargetAtTime(fl[0], t, 0.3); this.flG.gain.setTargetAtTime(fl[1] * (0.7 + 0.3 * (a._beat || 0)), t, 0.06);
    this.padG.gain.setTargetAtTime(pad, t, 0.8);
  },
  env(node, t, a, peak, d) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  osc(type, f0, f1, dur, peak, delay = 0, a = 0.01) {
    const c = this.ctx, t = (this.at ?? c.currentTime) + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = c.createGain(); this.env(g, t, a, peak, dur); o.connect(g).connect(this.master); o.start(t); o.stop(t + a + dur + 0.05);
  },
  noise(type, f0, f1, q, dur, peak, delay = 0, a = 0.005) {
    const c = this.ctx, t = (this.at ?? c.currentTime) + delay; const s = c.createBufferSource(); s.buffer = this.white; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    const g = c.createGain(); this.env(g, t, a, peak, dur); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + a + dur + 0.05);
  },
  thump(v) {
    if (!this.ctx || v <= 0.01) return;
    this.osc('sine', 78, 38, 0.2, 0.9 * v, 0, 0.012); this.osc('triangle', 150, 60, 0.08, 0.18 * v, 0, 0.005);
    this.osc('sine', 66, 34, 0.18, 0.6 * v, 0.24, 0.012); this.noise('lowpass', 300, 120, 0.7, 0.1, 0.25 * v, 0.0);
  },
  sfx(n) {
    if (!this.ctx || !this.on) return;
    const R = Math.random;
    switch (n) {
      case 'crunch': for (let i = 0; i < 5; i++) this.noise('bandpass', 1400 + R() * 2400, 800, 1.2, 0.05 + R() * 0.05, 0.35, i * 0.025 + R() * 0.02); this.osc('sine', 120, 50, 0.12, 0.5); break;
      case 'squish': this.noise('lowpass', 900, 200, 1, 0.22, 0.4); this.osc('sine', 160, 70, 0.2, 0.3); break;
      case 'gulp': this.osc('sine', 260, 60, 0.32, 0.7, 0, 0.02); this.noise('lowpass', 700, 150, 2, 0.3, 0.35); break;
      case 'splash': this.noise('lowpass', 4000, 250, 0.7, 0.9, 0.55); for (let i = 0; i < 6; i++) this.osc('sine', 300 + R() * 500, 900 + R() * 900, 0.07, 0.12, 0.1 + R() * 0.6); break;
      case 'bubble': this.osc('sine', 280 + R() * 300, 700 + R() * 700, 0.06, 0.12); break;
      case 'bubbles': for (let i = 0; i < 7; i++) this.osc('sine', 250 + R() * 300, 600 + R() * 900, 0.06, 0.09, R() * 1.2); break;
      case 'whoosh': this.noise('bandpass', 250, 2200, 0.9, 0.6, 0.35, 0, 0.25); this.noise('bandpass', 2200, 300, 0.9, 0.7, 0.22, 0.55, 0.05); break;
      case 'valve': this.osc('sine', 140, 55, 0.12, 0.55, 0, 0.004); this.noise('highpass', 2500, 1500, 0.7, 0.03, 0.2); break;
      case 'boom': this.osc('sine', 60, 28, 0.6, 0.9, 0, 0.01); this.noise('lowpass', 500, 80, 0.7, 0.5, 0.35); break;
      case 'zap': this.osc('sine', 1600 + R() * 800, 2800, 0.1, 0.12); break;
      case 'ping': [880, 1318.5, 1760].forEach((f, i) => this.osc('sine', f, f * 0.998, 1.6, 0.09 / (i + 1), i * 0.04, 0.005)); break;
      case 'shimmer': [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => this.osc('sine', f, f, 2.2, 0.07, i * 0.09, 0.02)); break;
      case 'pop': this.osc('sine', 700, 300, 0.05, 0.2); break;
      case 'drip': this.osc('sine', 900 + R() * 400, 300, 0.08, 0.15); break;
    }
  },
};

// ---------------- Voice (recorded narration) ----------------
// One recording per chapter (narration/voice/<chapter>.mp3, `npm run voice` at the repository root),
// read as a whole paragraph. While it plays, story time follows it: each subtitle's scene time is
// matched to the moment its sentence starts in the recording, so the pictures keep pace with the
// narrator (never jumping backwards) and sentences flow into each other.
const VOICE = {
  on: true, ok: false, el: null, ch: null, pool: new Map(), maps: new Map(),
  init() { this.ok = !!(NARRATION && NARRATION.lines); try { const v = localStorage.getItem('sindirim:voice'); if (v !== null) this.on = v === '1'; } catch (e) {} this.btn(); },
  btn() { const b = $('b-voice'); b.style.display = this.ok ? '' : 'none'; b.setAttribute('aria-pressed', String(this.on)); },
  toggle() { this.on = !this.on; try { localStorage.setItem('sindirim:voice', this.on ? '1' : '0'); } catch (e) {} this.btn(); if (!this.on) this.stop(); },
  get speaking() { return !!this.el && !this.el.paused && !this.el.ended; },
  get waiting() { return this.speaking && (this.el.readyState < 3 || this.el.seeking); },
  // story-time <-> recording-time map of a chapter: anchors at every subtitle start
  map(c) {
    if (this.maps.has(c.id)) return this.maps.get(c.id);
    const info = this.ok ? NARRATION.lines[c.id] : null;
    let m = null;
    if (info && c.cues && c.cues.length) {
      const at = speechClock(info.words, info.dur);
      const len = info.len || 1, marks = info.marks || c.cues.map((q, k) => k * len / c.cues.length);
      const S = [], A = [];
      c.cues.forEach((q, k) => { S.push(q[0]); A.push(k === 0 ? 0 : at(marks[k] / len)); });
      S.push(Math.max(S[S.length - 1] + 0.5, c.dur - 0.3)); A.push(info.dur + 0.25);
      for (let k = 1; k < A.length; k++) { if (A[k] <= A[k - 1]) A[k] = A[k - 1] + 0.05; if (S[k] <= S[k - 1]) S[k] = S[k - 1] + 0.05; }
      const lerpArr = (X, Y, x) => { if (x <= X[0]) return Y[0] + (x - X[0]); for (let k = 1; k < X.length; k++) if (x <= X[k]) return Y[k - 1] + (Y[k] - Y[k - 1]) * (x - X[k - 1]) / (X[k] - X[k - 1]); return Y[Y.length - 1] + (x - X[X.length - 1]); };
      m = { info, at, marks, len, url: './' + info.file, s2a: t => lerpArr(S, A, t), a2s: a => lerpArr(A, S, a), s0: S[0] };
    }
    this.maps.set(c.id, m);
    return m;
  },
  audio(url) {
    let a = this.pool.get(url);
    if (!a) { a = new Audio(); a.preload = 'auto'; a.preservesPitch = true; a.src = url; this.pool.set(url, a); }
    return a;
  },
  prefetch(cs) {
    const keep = new Set(cs.map(c => c && this.map(c)?.url).filter(Boolean));
    for (const u of keep) this.audio(u);
    for (const [u, a] of this.pool) if (!keep.has(u) && a !== this.el) { a.removeAttribute('src'); a.load(); this.pool.delete(u); }
  },
  // called every frame: start / keep the chapter recording in step with story time t (chapter-local)
  sync(c, t) {
    const m = this.map(c);
    if (!this.on || !m || !playing || CAPTURE) { this.pause(); return; }
    const a = m.s2a(t);
    if (this.ch !== c) {
      if (t < m.s0 || a >= m.info.dur - 0.05) return;
      if (this.el) this.el.pause();
      this.ch = c; this.el = this.audio(m.url);
      const el = this.el, set = () => { try { el.currentTime = Math.max(0, a); } catch (e) {} };
      if (a > 0.05 || el.currentTime > 0.05 || el.ended) { if (el.readyState >= 1) set(); else el.addEventListener('loadedmetadata', set, { once: true }); }
    }
    this.el.playbackRate = speed; this.el.muted = !AU.on;
    if (this.el.paused && !this.el.ended) this.el.play().catch(() => {});
  },
  // story time (chapter-local) as told by the recording, or null
  clock(c) { const m = this.map(c); return this.speaking && this.ch === c && m ? m.a2s(this.el.currentTime) : null; },
  resume() { if (this.on && this.el && this.el.paused && !this.el.ended && this.el.currentTime > 0) { this.el.playbackRate = speed; this.el.play().catch(() => {}); } },
  pause() { if (this.el && !this.el.paused) this.el.pause(); },
  stop() { this.pause(); this.el = null; this.ch = null; },
};

// ---------------- Subtitles: words appear as they are spoken ----------------
// Each written word gets the moment its position in the sentence is reached in the recording
// (Whisper word timings in NARRATION), so "%20" follows "yüzde yirmi" and lines never reflow.
function speechClock(words, dur) {
  if (!words || !words.length) return f => f * dur;
  const total = words.reduce((a, w) => a + w[2].length + 1, 0);
  const pts = []; let acc = 0;
  for (const w of words) { pts.push([acc / total, w[0]]); acc += w[2].length + 1; }
  pts.push([1, words[words.length - 1][1]]);
  return f => {
    if (f <= 0) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const [f0, t0] = pts[i - 1], [f1, t1] = pts[i]; return t0 + (t1 - t0) * (f - f0) / Math.max(1e-6, f1 - f0); }
    return pts[pts.length - 1][1];
  };
}
const SUBW = { els: [], times: [], key: null, shown: 0 };
function setSubWords(c, cue, txt) {
  const m = VOICE.map(c);
  const words = txt.split(/\s+/).filter(Boolean);
  let pos = 0;
  const frac = words.map(w => { const i = txt.indexOf(w, pos); pos = i + w.length; return i / txt.length; });
  if (m) {
    // a written word takes the time of its place inside its sentence's stretch of the recording
    const f0 = m.marks[cue] / m.len, f1 = (cue + 1 < m.marks.length ? m.marks[cue + 1] : m.len) / m.len;
    SUBW.times = frac.map(f => m.at(f0 + (f1 - f0) * f));
  } else {
    const cs = c.cues[cue][0], next = c.cues[cue + 1]?.[0] ?? c.dur;
    SUBW.times = frac.map(f => cs + (next - cs - 0.4) * f);
  }
  hud.sub.innerHTML = words.map(w => `<i>${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i>`).join(' ');
  SUBW.els = [...hud.sub.querySelectorAll('i')];
  SUBW.key = c.id + '-' + cue; SUBW.shown = 0; SUBW.voiced = !!m;
}
function revealSubWords(c, t) {
  const m = VOICE.map(c);
  const now = SUBW.voiced && m ? (VOICE.ch === c && VOICE.el && !VOICE.el.ended ? VOICE.el.currentTime : m.s2a(t)) : t;
  let n = 0;
  while (n < SUBW.times.length && SUBW.times[n] <= now + 0.06) n++;
  if (n !== SUBW.shown) { SUBW.els.forEach((el, i) => el.classList.toggle('on', i < n)); SUBW.shown = n; }
}

// ---------------- Subtitles on/off ----------------
let SUBS = true;
try { SUBS = localStorage.getItem('sindirim:subs') !== '0'; } catch (e) {}
function setSubs(v) {
  SUBS = v; try { localStorage.setItem('sindirim:subs', v ? '1' : '0'); } catch (e) {}
  $('subtitle').style.display = v ? '' : 'none';
  APP.classList.toggle('nosubs', !v);
  $('b-sub').setAttribute('aria-pressed', String(v));
}

// ---------------- Controls ----------------
const PLAY_D = 'M4 2.5v11l9-5.5z', PAUSE_D = 'M4 2.5h3v11H4zM9 2.5h3v11H9z';
function setPlaying(v) {
  playing = v; $('i-play').setAttribute('d', v ? PAUSE_D : PLAY_D); $('b-play').setAttribute('aria-label', v ? 'Duraklat' : 'Oynat');
  if (!v) VOICE.pause(); else { AU.init(); VOICE.resume(); }
}
function seek(t) { T = clamp(t, 0, TOTAL - 0.001); lastEvT = T; VOICE.stop(); cache.cue = null; }
function jump(d) { const i = clamp(chapterAt(T) + d, 0, CH.length - 1); seek(CH[i].start + (d < 0 && T - CH[chapterAt(T)].start > 2 && d === -1 ? 0 : 0)); }
let endHidden = false;
function initControls() {
  const segs = $('segs');
  segs.innerHTML = CH.map(c => `<i style="flex:${c.dur} 1 0"><b></b></i>`).join('');
  $('b-play').onclick = () => setPlaying(!playing);
  $('b-prev').onclick = () => { const i = chapterAt(T); seek(CH[T - CH[i].start > 2.5 ? i : Math.max(0, i - 1)].start); };
  $('b-next').onclick = () => { const i = chapterAt(T); seek(CH[Math.min(CH.length - 1, i + 1)].start); };
  const speeds = [0.5, 1, 1.5, 2];
  $('b-speed').onclick = () => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; $('b-speed').textContent = trNum(speed, speed % 1 ? 1 : 0) + '×'; if (VOICE.el) VOICE.el.playbackRate = speed; };
  $('b-sound').onclick = () => { AU.init(); AU.mute(AU.on); if (VOICE.el) VOICE.el.muted = !AU.on; $('b-sound').setAttribute('aria-pressed', String(AU.on)); $('i-wave').style.opacity = AU.on ? 1 : 0.15; };
  $('b-voice').onclick = () => VOICE.toggle();
  $('b-sub').onclick = () => setSubs(!SUBS);
  $('b-full').onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else APP.requestFullscreen?.().catch(() => {}); };
  const tl = $('timeline'), tip = $('tl-tip');
  const posToT = e => { const r = tl.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * TOTAL; };
  let drag = false;
  tl.addEventListener('pointerdown', e => { drag = true; tl.setPointerCapture(e.pointerId); seek(posToT(e)); });
  tl.addEventListener('pointermove', e => { const t = posToT(e); const c = CH[chapterAt(t)]; tip.textContent = c.name; tip.style.left = (e.clientX - tl.getBoundingClientRect().left) + 'px'; if (drag) seek(t); });
  tl.addEventListener('pointerup', () => { drag = false; });
  addEventListener('keydown', e => {
    if (!started) { if (e.key === 'Enter') start(); return; }
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') $('b-next').click();
    else if (e.key === 'ArrowLeft') $('b-prev').click();
    else if (e.key === 'f' || e.key === 'F') $('b-full').click();
    else if (e.key === 'm' || e.key === 'M') $('b-sound').click();
    else if (e.key === 'c' || e.key === 'C') setSubs(!SUBS);
    else if (e.key === 'n' || e.key === 'N') VOICE.toggle();
  });
  $('b-start').onclick = start;
  $('b-again').onclick = () => { endHidden = false; APP.classList.remove('free'); seek(0); setPlaying(true); };
  $('b-close').onclick = () => { endHidden = true; $('end').classList.add('gone'); APP.classList.add('free'); };
  canvas.addEventListener('click', () => { if (CH[curI]?.id === 'final' && endHidden) { endHidden = false; $('end').classList.remove('gone'); APP.classList.remove('free'); } });
  // start screen stop list + end legs
  $('stops').innerHTML = CH.filter(c => c.n != null && c.n > 0).map(c => `<span>${c.name}</span>`).join('');
  $('legs').innerHTML = CH.filter(c => c.leg).map(c => `<li data-i="${c.i}"><span class="n">${pad2(c.n)}</span><b>${c.name}</b><span class="d">${c.leg[0]}</span><p>${c.leg[1]}</p></li>`).join('');
  $('legs').addEventListener('click', e => { const li = e.target.closest('li'); if (li) { endHidden = false; seek(CH[+li.dataset.i].start); setPlaying(true); } });
  const mins = Math.round(TOTAL / 60 * 2) / 2;
  $('start-meta').textContent = `≈ ${trNum(mins, mins % 1 ? 1 : 0)} dakika · ${CH.filter(c => c.n > 0).length} ${PAGE.stopWord || 'durak'} · Sesi açın · Tam ekran önerilir`;
}
function start() {
  if (started || !preloaded) return; started = true;
  AU.init();
  APP.classList.remove('pre'); $('start').classList.add('gone');
  seek(0); setPlaying(true);
}

// ---------------- Main loop ----------------
let lastEvT = 0, beatIdx = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; REAL += dt;
  holdK += (holdTarget - holdK) * Math.min(1, dt * 3);
  if (playing) {
    const before = T;
    T += dt * speed * holdK;
    const ci = chapterAt(before), cc = CH[ci];
    const vt = VOICE.clock(cc);
    if (vt !== null) {
      const want = cc.start + vt;
      if (VOICE.waiting) T = before; // recording still buffering: wait for it
      else if (Math.abs(want - T) < 6) T = Math.max(before, T + (want - T) * 0.3);
    }
  }
  if (started && dt > 0 && !TEST.has('noadapt') && REAL - (PERF.t0 ??= REAL) < 12) {
    PERF.acc += dt; PERF.n++;
    if (PERF.acc > 1.5) {
      const fps = PERF.n / PERF.acc; PERF.acc = 0; PERF.n = 0;
      let s = PERF.scale;
      if (fps < 48 && s > 0.5) s = Math.max(0.5, s - (fps < 32 ? 0.2 : 0.1)), PERF.calm = 0;
      if (s !== PERF.scale) { PERF.scale = s; resize(); }
    }
  }
  if (T >= TOTAL) { T = TOTAL - 0.001; }
  render(dt);
}
function render(dt) {
  const i = chapterAt(T);
  if (i !== curI) enterChapter(i);
  const c = CH[i], t = T - c.start;
  // events (forward playback only)
  if (playing && c.events) for (const [et, ev] of c.events) { const g = c.start + et; if (lastEvT < g && T >= g) typeof ev === 'function' ? ev() : AU.sfx(ev); }
  if (playing && c.fadeIn && lastEvT < c.start + 0.05 && T >= c.start + 0.05 && i > 0) AU.sfx('whoosh');
  lastEvT = T;
  // update world
  camera.fov = 60; camera.far = 600; camera.near = 0.02;
  const post = { bloom: 0.7, radius: 0.55, thr: 0.85, vig: 1, barrel: 0.06, ca: 0.004, grain: 0.035, exp: 1, flash: 0, ...(curW.post || {}), ...(c.post ? c.post(t) : {}) };
  c.update(t, curW, dt);
  camera.updateProjectionMatrix();
  const sc = (VH * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  for (const m of curW.motes) { m.uniforms.uScale.value = sc; m.uniforms.uTime.value = T; }
  bloom.strength = post.bloom; bloom.radius = post.radius; bloom.threshold = post.thr;
  renderer.toneMappingExposure = post.exp;
  FU.uVig.value = post.vig; FU.uBarrel.value = post.barrel; FU.uCA.value = post.ca; FU.uGrain.value = post.grain; FU.uTime.value = REAL; FU.uFlash.value = post.flash;
  let fade = 0;
  if (c.fadeIn && i > 0) fade = Math.max(fade, 1 - sstep(0, c.fadeInDur ?? 0.7, t));
  if (c.fadeOut) fade = Math.max(fade, sstep(c.dur - (c.fadeOutDur ?? 0.7), c.dur, t));
  FU.uFade.value = fade; FU.uFadeCol.value.set(c.fadeColor ?? 0x000000);
  // heartbeat audio
  const bt = c.beatT ? c.beatT(t) : T; const BEAT = c.beat ?? 0.88; const bi = Math.floor(bt / BEAT);
  if (playing && bi !== beatIdx) { if (beatIdx >= 0 && bi === beatIdx + 1) AU.thump(c.audio?.heart ?? 0.12); beatIdx = bi; }
  const bph = frac(bt / BEAT); const beatEnv = Math.exp(-bph * 7);
  if (REAL - (AU._last || 0) > 0.066) { AU._last = REAL; AU.set({ ...(c.audio || {}), _beat: beatEnv, amb: c.audio?.amb, flow: c.audio?.flow }); }
  updateHUD(c, t); updateLabels(c, t); MAP.update(c, t);
  if (!CAPTURE) { VOICE.sync(c, t); VOICE.prefetch([c, CH[i + 1]]); }
  // timeline
  const segs = $('segs').children;
  for (let k = 0; k < CH.length; k++) { const f = k < i ? 1 : k > i ? 0 : t / c.dur; const s = f.toFixed(3); const b = segs[k].firstChild; if (b._f !== s) { b._f = s; b.style.transform = `scaleX(${s})`; } }
  setText($('time'), 'time', `${Math.floor(T / 60)}:${pad2(T % 60)} / ${Math.floor(TOTAL / 60)}:${pad2(TOTAL % 60)}`);
  composer.render(dt);
}

// Offline soundtrack for the video: the same synth, scheduled on a warped timeline.
// segs = [[v0, T0, slope], ...] maps video time v to journey time T = T0 + (v - v0) * slope.
async function renderSoundtrack(segs, vDur) {
  const TtoV = Tq => { let s = segs[0]; for (const g of segs) if (g[1] <= Tq) s = g; return s[0] + (Tq - s[1]) / s[2]; };
  const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(vDur * sr), sr);
  AU.on = true; AU.init(ctx);
  const setAt = (p, v, at, tau = 0.4) => p.setTargetAtTime(v, Math.max(0, at), tau);
  for (const c of CH) {
    const v0 = TtoV(c.start); if (v0 >= vDur) break;
    const a = c.audio || {}, amb = a.amb || [260, 0.25], fl = a.flow || [420, 0];
    setAt(AU.ambF.frequency, amb[0], v0); setAt(AU.ambG.gain, amb[1], v0); setAt(AU.flF.frequency, fl[0], v0); setAt(AU.flG.gain, fl[1] * 0.85, v0); setAt(AU.padG.gain, a.pad || 0, v0, 0.8);
    for (const [et, ev] of c.events || []) if (typeof ev === 'string') { AU.at = TtoV(c.start + et); if (AU.at < vDur) AU.sfx(ev); }
    if (c.fadeIn && c.i > 0) { AU.at = TtoV(c.start + 0.05); AU.sfx('whoosh'); }
    const BEAT = c.beat ?? 0.88, hg = a.heart ?? 0.12;
    if (hg > 0.01) {
      const local = !!c.beatT;
      for (let k = Math.ceil((local ? 0 : c.start) / BEAT); ; k++) {
        const tt = local ? k * BEAT : k * BEAT - c.start; if (tt >= c.dur) break; if (tt < 0) continue;
        AU.at = TtoV(c.start + tt); if (AU.at >= vDur) break; AU.thump(hg);
      }
    }
  }
  AU.at = null;
  const buf = await ctx.startRendering();
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
  const pcm = new Int16Array(n * 2);
  for (let i = 0; i < n; i++) { pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  const bytes = new Uint8Array(pcm.buffer); let s = ''; const out = [];
  for (let i = 0; i < bytes.length; i += 0x8000) { s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); if (s.length > 4e6) { out.push(btoa(s)); s = ''; } }
  if (s) out.push(btoa(s));
  window.__audio = { sr, channels: 2, chunks: out };
  return out.length;
}

// Build every scene up front (while the title screen is showing) so the journey never pauses to build.
// Shaders are compiled for the composer's render target (linear, no tone mapping) with the camera's
// headlamp attached, then each scene is drawn once off-screen so textures and buffers are already on the GPU.
const warmRT = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, samples: rt.samples });
function withWorldCamera(w, fn, tt = 0.05) {
  const c = CH.find(x => x.world === w.key), prev = camera.parent;
  w.scene.add(camera);
  try { c.enter?.(w); c.update(tt, w, 0); } catch (e) {}
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  renderer.setRenderTarget(warmRT);
  let r; try { r = fn(); } catch (e) {}
  renderer.setRenderTarget(null);
  if (prev && prev !== w.scene) prev.add(camera); else if (!prev) camera.removeFromParent();
  if (curW) { camera.removeFromParent(); curW.scene.add(camera); }
  return r;
}
let preloaded = false;
async function preloadWorlds() {
  const keys = [...new Set(CH.map(c => c.world))];
  const btn = $('b-start'), label = btn.lastChild;
  const idle = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const show = pct => { if (!TEST.has('ch')) { label.textContent = ' Sahneler hazırlanıyor · %' + pct; btn.style.setProperty('--p', pct + '%'); } };
  if (!TEST.has('ch')) { btn.disabled = true; btn.classList.add('wait'); }
  // 1) build each scene and start compiling its shaders in parallel while the next one is built
  const pending = [];
  for (let i = 0; i < keys.length; i++) {
    await idle();
    const w = getWorld(keys[i]);
    const p = withWorldCamera(w, () => renderer.compileAsync ? renderer.compileAsync(w.scene, camera) : renderer.compile(w.scene, camera));
    if (p && p.then) pending.push(p.catch(() => {}));
    for (const c of CH) if (c.world === keys[i] && c.warmTimes) for (const tt of c.warmTimes) { const p2 = withWorldCamera(w, () => renderer.compileAsync ? renderer.compileAsync(w.scene, camera) : renderer.compile(w.scene, camera), tt); if (p2 && p2.then) pending.push(p2.catch(() => {})); }
    show(Math.round((i + 1) / keys.length * 88));
  }
  await Promise.all(pending);
  // 2) draw the first scenes once off-screen so their textures and buffers are already on the GPU
  for (const k of keys.slice(0, 3)) { await idle(); withWorldCamera(built.get(k), () => renderer.render(built.get(k).scene, camera)); }
  show(100);
  preloaded = true; window.__preloaded = true;
  manageGPU(Math.max(0, curI));
  btn.disabled = false; btn.classList.remove('wait'); label.textContent = PAGE.start.button;
  $('loading')?.remove();
}
function boot() {
  layoutChapters();
  MAP.init(); initControls(); VOICE.init(); setSubs(SUBS);
  window.__dig = { VOICE, T: () => T, total: () => TOTAL };
  resize();
  if (TEST.has('ch')) {
    started = true; APP.classList.remove('pre'); $('start').classList.add('gone');
    const ci = CH.findIndex(c => c.id === TEST.get('ch') || String(c.i) === TEST.get('ch'));
    T = CH[Math.max(0, ci)].start + parseFloat(TEST.get('t') || '0');
    if (TEST.get('hud') === '0') { $('hud').style.display = 'none'; $('controls').style.display = 'none'; $('labels').style.display = 'none'; }
  }
  if (CAPTURE) {
    started = true; APP.classList.add('capture'); APP.classList.remove('pre'); $('start').classList.add('gone'); $('controls').style.display = 'none'; endHidden = false;
    window.__frame = (Tv, real) => { REAL = real; T = clamp(Tv, 0, TOTAL - 0.001); render(1 / 60); return true; };
    window.__renderAudio = renderSoundtrack;
    render(0);
  } else {
    render(0);
    requestAnimationFrame(t => { lastNow = t; frame(t); });
  }
  if (TEST.has('nopre')) { preloaded = true; } else preloadWorlds();
  window.__seek = (id, t) => { const ci = CH.findIndex(c => c.id === id); T = CH[ci].start + t; playing = false; render(0); render(0); return true; };
  window.__dbg = { built, CH, camera };
  window.__jump = t => { seek(t); setPlaying(true); };
  window.__ready = true;
}
