// Local Turkish narration. Voices live in assets/voices/catalog.json:
//   OmniVoice voices (natural, designed voices; GPU) and the older Piper voice (robotic, fast).
//   npm run voice -- <slug> [--voice omni-erkek-derin] [--speed 0.88] [--force]
//   (speed < 1 speaks slower; saved in lines.json like the voice)
//   npm run voice -- <slug> --words-only   only add word timings to existing clips
//   npm run voice -- voices            list the voices
// The animation provides animations/<kategori>/<slug>/narration/lines.json:
//   { "voice": "omni-erkek-derin", "out": "public/voice", "manifest": "narration/manifest.json",
//     "lines": [ { "id": "intro-0", "say": "Metnin söylenecek hâli." }, ... ] }
// Each line becomes <out>/<id>.mp3; the manifest records every clip's exact duration so the
// animation can time its subtitles to the voice. Unchanged lines are not generated again.
// OmniVoice clips are checked with Whisper; lines that still sound wrong are listed at the end.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { findAnimation } from './lib/animations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'voices', 'catalog.json'), 'utf8'));
const LAB = process.env.TTS_LAB || 'C:\\ProgramData\\tts_lab';   // ASCII-only path: model tools dislike "ü"

// Piper profiles (Voxtory app/engines/tts/profiles.py)
const PIPER = {
  anlatici: { length_scale: 1.0, noise_scale: 0.667, noise_w: 0.8, sentence_silence: 0.3 },
  yavas: { length_scale: 1.35, noise_scale: 0.5, noise_w: 0.6, sentence_silence: 0.6 },
  hizli: { length_scale: 0.75, noise_scale: 0.8, noise_w: 0.9, sentence_silence: 0.15 },
  derin: { length_scale: 1.2, noise_scale: 0.4, noise_w: 0.4, sentence_silence: 0.4 },
};
const PIPER_MODEL = 'tr_TR-dfki-medium.onnx';

// Python workers per engine: their environment under the lab folder and the worker script
const WORKERS = {
  omnivoice: { env: 'omni', script: 'omnivoice_worker.py', name: 'OmniVoice' },
  ema: { env: 'ema', script: 'ema_worker.py', name: 'EMA-TTS' },
  supertonic: { env: 'stonic', script: 'supertonic_worker.py', name: 'Supertonic 3' },
  chatterbox: { env: 'cbox', script: 'chatterbox_worker.py', name: 'Chatterbox' },
};

const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--voice');
const flag = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };

if (!slug || slug === 'voices') {
  console.log('Sesler (assets/voices/catalog.json):');
  for (const [id, v] of Object.entries(VOICES)) console.log(`  ${id.padEnd(18)} ${v.code.padEnd(4)} ${v.label}`);
  console.log('\nkullanım: npm run voice -- <slug> [--voice <id>] [--force]');
  process.exit(slug ? 0 : 1);
}

const dir = findAnimation(slug).dir;
const linesFile = path.join(dir, 'narration', 'lines.json');
if (!fs.existsSync(linesFile)) { console.log(`${path.relative(ROOT, linesFile)} yok. Animasyon önce seslendirilecek satırları bu dosyaya yazmalı.`); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
const voiceId = flag('voice') || spec.voice || 'omni-erkek-derin';
const voice = VOICES[voiceId];
if (!voice) { console.log(`Bilinmeyen ses: ${voiceId} (npm run voice -- voices)`); process.exit(1); }
if (flag('voice') && flag('voice') !== spec.voice) { spec.voice = voiceId; fs.writeFileSync(linesFile, JSON.stringify(spec, null, 1) + '\n'); }

const outDir = path.join(dir, spec.out || 'public/voice');
const manifestFile = path.join(dir, spec.manifest || 'narration/manifest.json');
fs.mkdirSync(outDir, { recursive: true });
const old = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { lines: {} };
// URL of the clips as the page sees them ("url" in lines.json, or relative to public/)
const publicBase = spec.url || path.relative(path.join(dir, 'public'), outDir).split(path.sep).join('/');
const refFile = voice.ref ? path.join(ROOT, 'assets', 'voices', voice.ref) : null;
const speed = Number(flag('speed') || spec.speed || 1);
if (flag('speed')) { spec.speed = speed; fs.writeFileSync(linesFile, JSON.stringify(spec, null, 1) + '\n'); }
const voiceKey = JSON.stringify([voiceId, speed, voice.engine, voice.profile, voice.model_dir, voice.voice_name, voice.model_version, voice.num_step, voice.ref_text, refFile && crypto.createHash('sha1').update(fs.readFileSync(refFile)).digest('hex')]);

// OmniVoice misreads Turkish capital letters (Ş, Ç, Ğ, Ö, Ü, İ, I) at the start of words; lower-case them.
const forEngine = s => (voice.engine === 'omnivoice' || voice.engine === 'ema'
  ? s.replace(/[ŞÇĞÖÜİI]/g, c => ({ Ş: 'ş', Ç: 'ç', Ğ: 'ğ', Ö: 'ö', Ü: 'ü', İ: 'i', I: 'ı' })[c])
  : s);

// --words-only: keep every recorded clip as it is and only add the missing word timings
const todo = [], manifest = flag('words-only') ? old : { voice: voiceId, engine: voice.engine, lines: {} };
for (const line of (flag('words-only') ? [] : spec.lines)) {
  const hash = crypto.createHash('sha1').update(voiceKey + '\n' + line.say).digest('hex').slice(0, 12);
  const prev = old.lines?.[line.id];
  if (!flag('force') && prev && prev.hash === hash && fs.existsSync(path.join(outDir, `${line.id}.mp3`))) manifest.lines[line.id] = prev;
  else todo.push({ ...line, hash });
}
console.log(`${slug}: ${voice.code} ${voice.label} · hız ${speed} · ${todo.length} satır üretilecek, ${spec.lines.length - todo.length} değişmedi`);

fs.mkdirSync(LAB, { recursive: true });
const tmp = fs.mkdtempSync(path.join(LAB, 'voice_'));
const wavOf = id => path.join(tmp, `${id}.wav`);
const problems = [];
try {
  if (todo.length && WORKERS[voice.engine]) await runWorker(WORKERS[voice.engine]);
  if (todo.length && voice.engine === 'piper') runPiper();
  for (const line of todo) {
    const wav = wavOf(line.id);
    if (!fs.existsSync(wav)) { console.log(`✗ ${line.id} üretilemedi`); process.exit(1); }
    // even loudness across clips, then a compact mono MP3
    const f = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-af', 'highpass=f=60,loudnorm=I=-17:TP=-1.5:LRA=9,aresample=44100', '-ac', '1', '-b:a', '112k', path.join(outDir, `${line.id}.mp3`)]);
    if (f.status !== 0) { console.log(`✗ ${line.id}: ffmpeg hata verdi\n${f.stderr}`); process.exit(1); }
    manifest.lines[line.id] = { file: `${publicBase}/${line.id}.mp3`, dur: Math.round(wavDuration(wav) * 1000) / 1000, hash: line.hash, ...(line.cer !== undefined ? { cer: line.cer } : {}) };
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
// word timings (subtitles that appear word by word as they are spoken)
await addWordTimes();
// remove clips of lines that no longer exist
const keep = new Set(spec.lines.map(l => `${l.id}.mp3`));
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.mp3') && !keep.has(f)) fs.rmSync(path.join(outDir, f));
fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
const total = Object.values(manifest.lines).reduce((a, l) => a + l.dur, 0);
console.log(`\n${slug}: bitti · toplam ${Math.floor(total / 60)} dk ${Math.round(total % 60)} sn`);
if (problems.length) {
  console.log(`\nDinleyip kontrol edin (Whisper tam anlayamadı):`);
  for (const p of problems) console.log(`  ${p.id} (%${Math.round(p.cer * 100)} fark)\n    metin:  ${p.say}\n    duyulan: ${p.heard}`);
}

// ---------------------------------------------------------------------------
async function runWorker(w) {
  const py = path.join(LAB, w.env, 'Scripts', 'python.exe');
  if (!fs.existsSync(py)) { console.log(`${w.name} ortamı yok: ${py} (assets/voices/README.md)`); process.exit(1); }
  let ref = null;
  if (refFile) { ref = path.join(tmp, 'ref.wav'); fs.copyFileSync(refFile, ref); }
  const job = path.join(tmp, 'job.json');
  fs.writeFileSync(job, JSON.stringify({
    ref_audio: ref, ref_text: voice.ref_text ? forEngine(voice.ref_text) : null,
    model_dir: voice.model_dir ? path.join(LAB, voice.model_dir) : null,
    voice_name: voice.voice_name || null, model_version: voice.model_version || null, num_step: voice.num_step || null,
    language: 'tr', speed: speed === 1 ? null : speed, tries: 4, max_cer: 0.06,
    lines: todo.map(l => ({ id: l.id, text: forEngine(l.say), check: l.say, out: wavOf(l.id) })),
  }));
  const p = spawn(py, [path.join(ROOT, 'tools', 'tts', w.script), job], {
    cwd: LAB, env: { ...process.env, HF_HOME: path.join(LAB, 'hf'), PYTHONIOENCODING: 'utf-8', HF_HUB_DISABLE_SYMLINKS_WARNING: '1', TTS_LAB: LAB },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  p.stderr.on('data', d => { err = (err + d).slice(-4000); });
  let n = 0;
  const t0 = Date.now();
  for await (const ln of readline.createInterface({ input: p.stdout })) {
    if (!ln.startsWith('{')) continue;
    const r = JSON.parse(ln);
    if (r.ready !== undefined) { console.log(`model hazır (${r.ready} sn)`); continue; }
    const line = todo.find(l => l.id === r.id);
    line.cer = r.cer;
    if (r.cer > 0.06) problems.push({ id: r.id, cer: r.cer, say: line.say, heard: r.heard });
    n++;
    const eta = (Date.now() - t0) / n * (todo.length - n) / 1000;
    console.log(`${String(n).padStart(3)}/${todo.length} ${r.id.padEnd(16)} ${r.dur.toFixed(1)} sn · deneme ${r.tries} · fark %${Math.round(r.cer * 100)}${n < todo.length ? ` · kalan ~${Math.ceil(eta / 60)} dk` : ''}`);
  }
  const code = await new Promise(r => p.on('close', r));
  if (code !== 0) { console.log(`${w.name} hata verdi:\n${err}`); process.exit(1); }
}

function runPiper() {
  const piperDir = [process.env.PIPER_DIR, path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'piper_data'), path.join(os.homedir(), 'Desktop', 'Voxtory', 'tts')]
    .filter(Boolean).find(d => fs.existsSync(path.join(d, 'piper.exe')) && fs.existsSync(path.join(d, PIPER_MODEL)));
  if (!piperDir) { console.log('Piper bulunamadı (PIPER_DIR ya da C:\\ProgramData\\piper_data).'); process.exit(1); }
  const prof = PIPER[voice.profile || 'anlatici'];
  todo.forEach((line, i) => {
    const r = spawnSync(path.join(piperDir, 'piper.exe'), ['--model', PIPER_MODEL, '--espeak_data', 'espeak-ng-data',
      '--length_scale', String(prof.length_scale), '--noise_scale', String(prof.noise_scale), '--noise_w', String(prof.noise_w),
      '--sentence_silence', String(prof.sentence_silence), '--output_file', wavOf(line.id)], { cwd: piperDir, input: line.say, encoding: 'utf8' });
    if (r.status !== 0) { console.log(`✗ ${line.id}: Piper hata verdi\n${r.stderr}`); process.exit(1); }
    console.log(`${String(i + 1).padStart(3)}/${todo.length} ${line.id}`);
  });
}

function wavDuration(file) {
  const b = fs.readFileSync(file);
  let o = 12, bytesPerSec = 0, data = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') bytesPerSec = b.readUInt32LE(o + 16);
    if (id === 'data') { data = Math.min(size, b.length - o - 8); break; }
    o += 8 + size + (size & 1);
  }
  return bytesPerSec ? data / bytesPerSec : 0;
}

// Whisper word timestamps for every clip that has none yet: manifest.lines[id].words = [[start, end, word], …]
async function addWordTimes() {
  const need = Object.entries(manifest.lines).filter(([, l]) => !l.words).map(([id]) => ({ id, file: path.join(outDir, `${id}.mp3`) }));
  if (!need.length) return;
  const py = path.join(LAB, 'omni', 'Scripts', 'python.exe');
  if (!fs.existsSync(py)) { console.log('Kelime zamanları için Whisper ortamı yok; atlandı.'); return; }
  const job = path.join(LAB, `words_${process.pid}.json`);
  fs.writeFileSync(job, JSON.stringify({ clips: need }));
  console.log(`kelime zamanları: ${need.length} kayıt`);
  const p = spawn(py, [path.join(ROOT, 'tools', 'tts', 'word_times.py'), job], {
    cwd: LAB, env: { ...process.env, PYTHONIOENCODING: 'utf-8', TTS_LAB: LAB }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  p.stderr.on('data', d => { err = (err + d).slice(-3000); });
  for await (const ln of readline.createInterface({ input: p.stdout })) {
    if (!ln.startsWith('{')) continue;
    const r = JSON.parse(ln);
    if (r.words && manifest.lines[r.id]) manifest.lines[r.id].words = r.words;
  }
  const code = await new Promise(r => p.on('close', r));
  fs.rmSync(job, { force: true });
  if (code !== 0) console.log(`Kelime zamanları çıkarılamadı:
${err}`);
}
