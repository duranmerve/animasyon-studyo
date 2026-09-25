// Renders this animation to MP4, frame by frame (smooth on any computer).
//   node tools/render-video.mjs          → renders/*.mp4
//   node tools/render-video.mjs test     → one PNG per chapter in renders/work to check the layout
// env: FPS (default 60)
// needs: Chrome, ffmpeg in PATH, PowerShell 7 (pwsh) + the Windows "Microsoft Tolga" voice for narration.
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { build } from '../build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'animation.json'), 'utf8'));
const OUT = path.join(ROOT, 'renders'), WORK = path.join(OUT, 'work');
fs.mkdirSync(WORK, { recursive: true });
const FPS = +(process.env.FPS || 60), W = 1920, H = 1080, ENDHOLD = CFG.video?.endHold ?? 10;
const TEST = process.argv[2] === 'test';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const log = (...a) => console.log(new Date().toLocaleTimeString('tr-TR'), ...a);
build(); // always render the current sources

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on('pageerror', e => log('PAGE ERROR', e.message));
await page.goto(pathToFileURL(path.join(ROOT, 'dist', 'index.html')).href + '?capture=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ready === true && window.__preloaded === true', { timeout: 300000 });
await page.evaluate(() => document.fonts.ready);
const CH = await page.evaluate(() => window.__dbg.CH.map(c => ({ id: c.id, start: c.start, dur: c.dur, cues: c.cues || [] })));
const last = CH[CH.length - 1];
const TEND = last.start + Math.min(ENDHOLD, last.dur);

if (TEST) {
  // one frame from the middle of every chapter
  for (const c of CH) {
    const T = c.start + c.dur / 2;
    await page.evaluate((T, v) => window.__frame(T, v), T, T);
    await page.evaluate((T, v) => window.__frame(T, v), T, T);
    await page.screenshot({ path: path.join(WORK, `test_${c.id}.png`) });
  }
  log('test frames written to', WORK); await browser.close(); process.exit(0);
}

// ---- 1. narration clips (local Windows voice) ----
const cues = [];
for (const c of CH) c.cues.forEach(([t, text], k) => cues.push({ T: c.start + t, text, chEnd: c.start + c.dur, file: path.join(WORK, `n_${String(cues.length).padStart(3, '0')}.wav`) }));
const todo = cues.filter(q => q.T < TEND);
fs.writeFileSync(path.join(WORK, 'cues.json'), JSON.stringify(todo.map(q => ({ text: q.text, file: q.file }))), 'utf8');
const ps = `$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Tolga'); $s.Rate = 1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$items = Get-Content -Raw -Encoding UTF8 '${path.join(WORK, 'cues.json')}' | ConvertFrom-Json
foreach ($it in $items) { $s.SetOutputToWaveFile($it.file, $fmt); $s.Speak($it.text) }
$s.SetOutputToNull(); $s.Dispose()`;
fs.writeFileSync(path.join(WORK, 'tts.ps1'), '\ufeff' + ps, 'utf8');
let narration = CFG.video?.narration !== false && todo.length > 0;
// PowerShell 7 (pwsh) sees the modern OneCore voices such as Tolga; Windows PowerShell 5.1 does not
if (narration) try { execFileSync(process.env.PWSH || 'pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(WORK, 'tts.ps1')], { stdio: 'inherit' }); }
catch (e) { narration = false; log('Narration voice not available, continuing without it.'); }
const readWav = f => { const b = fs.readFileSync(f); let o = 12, fmt, data; while (o < b.length) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { sr: b.readUInt32LE(o + 12), ch: b.readUInt16LE(o + 10) }; if (id === 'data') data = b.subarray(o + 8, o + 8 + sz); o += 8 + sz + (sz & 1); } const s = new Float32Array(data.length / 2); for (let i = 0; i < s.length; i++) s[i] = data.readInt16LE(i * 2) / 32768; return { sr: fmt.sr, s }; };
if (narration) for (const q of todo) { const w = readWav(q.file); q.samples = w.s; q.sr = w.sr; q.dur = w.s.length / w.sr; }

// ---- 2. time warp: slow the picture where a sentence needs more time than its subtitle slot ----
const stretches = [];
if (narration) todo.forEach((q, i) => {
  const next = Math.min(todo[i + 1] ? todo[i + 1].T : Infinity, q.chEnd - 0.35);
  const avail = next - q.T, need = q.dur + 0.55;
  if (need > avail && avail > 0.8) stretches.push([q.T + 0.25, next - 0.1, need - avail]);
});
const segs = []; let v = 0, Tc = 0;
for (const [a, b, extra] of stretches) { segs.push([v, Tc, 1]); v += a - Tc; const slope = (b - a) / (b - a + extra); segs.push([v, a, slope]); v += (b - a) / slope; Tc = b; }
segs.push([v, Tc, 1]); const VDUR = v + (TEND - Tc);
const vToT = vv => { let s = segs[0]; for (const g of segs) if (g[0] <= vv) s = g; return s[1] + (vv - s[0]) * s[2]; };
const TtoV = Tq => { let s = segs[0]; for (const g of segs) if (g[1] <= Tq) s = g; return s[0] + (Tq - s[1]) / s[2]; };
log(`video length ${(VDUR / 60).toFixed(1)} min (journey ${(TEND / 60).toFixed(1)} min), ${stretches.length} slowed passages, ${Math.ceil(VDUR * FPS)} frames at ${FPS} fps`);

// ---- 3. soundtrack (effects, heartbeat, ambience) rendered offline in the page ----
const n = await page.evaluate((s, d) => window.__renderAudio(s, d), segs, VDUR);
const parts = []; for (let i = 0; i < n; i++) parts.push(Buffer.from(await page.evaluate(i => window.__audio.chunks[i], i), 'base64'));
const wavHeader = (bytes, sr, ch) => { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + bytes, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(bytes, 40); return h; };
const pcm = Buffer.concat(parts);
fs.writeFileSync(path.join(WORK, 'sfx.wav'), Buffer.concat([wavHeader(pcm.length, 48000, 2), pcm]));
if (narration) {
  const SR = 48000, mix = new Float32Array(Math.ceil(VDUR * SR));
  for (const q of todo) { const at = Math.round((TtoV(q.T) + 0.2) * SR), k = q.sr / SR; for (let i = 0; i < q.samples.length / k && at + i < mix.length; i++) { const x = i * k, i0 = Math.floor(x), f = x - i0; mix[at + i] += (q.samples[i0] || 0) * (1 - f) + (q.samples[i0 + 1] || 0) * f; } }
  const b = Buffer.alloc(mix.length * 2); for (let i = 0; i < mix.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(mix[i] * 32767))), i * 2);
  fs.writeFileSync(path.join(WORK, 'narration.wav'), Buffer.concat([wavHeader(b.length, SR, 1), b]));
}
log('audio tracks ready');

// ---- 4. frames → H.264 ----
const silent = path.join(WORK, 'picture.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.ceil(VDUR * FPS), t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const vv = i / FPS;
  await page.evaluate((T, r) => window.__frame(T, r), vToT(vv), vv);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 93, optimizeForSpeed: true });
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 300 === 0 && i) { const el = (Date.now() - t0) / 1000, eta = el / i * (frames - i); log(`frame ${i}/${frames}  ~${Math.round(eta / 60)} min left`); }
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await browser.close();

// ---- 5. shareable encode (light denoise keeps the film grain from bloating the file), then audio ----
const run = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const pic = path.join(WORK, 'picture-share.mp4');
run(['-i', silent, '-vf', 'hqdn3d=1.2:1.2:4:4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-an', pic]);
const lim = 'alimiter=limit=0.84:level=false';
run(['-i', pic, '-i', path.join(WORK, 'sfx.wav'), '-filter_complex', `[1:a]volume=2.3,${lim}[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(OUT, `${CFG.slug}.mp4`)]);
if (narration) {
  const narrated = path.join(OUT, `${CFG.slug}-narrated.mp4`);
  run(['-i', pic, '-i', path.join(WORK, 'sfx.wav'), '-i', path.join(WORK, 'narration.wav'), '-filter_complex',
    `[2:a]volume=1.9,pan=stereo|c0=c0|c1=c0,asplit=2[n1][n2];[1:a]volume=0.8[s];[s][n1]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=350[sd];[sd][n2]amix=inputs=2:normalize=0:duration=first,${lim}[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', narrated]);
  // small copy for messaging apps
  run(['-i', narrated, '-vf', 'scale=1280:720:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(OUT, `${CFG.slug}-narrated-720p.mp4`)]);
}
fs.rmSync(WORK, { recursive: true, force: true });
log('done →', OUT);
