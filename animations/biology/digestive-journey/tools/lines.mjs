// Writes narration/lines.json (what the narrator says, one paragraph per chapter) from the scene files.
// Then, at the repository root: npm run voice -- digestive-journey [--voice omni-kadin-genc]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(DIR, 'animation.json'), 'utf8'));

// ---- how a subtitle is read aloud (the subtitle itself stays as written)
const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
function numberWords(n) {
  if (n === 0) return 'sıfır';
  const out = [];
  for (const [v, name] of [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']]) {
    if (n >= v) { const q = Math.floor(n / v); n %= v; out.push(q === 1 && v === 1e3 ? name : `${numberWords(q)} ${name}`); }
  }
  if (n >= 100) { const q = Math.floor(n / 100); n %= 100; out.push(q === 1 ? 'yüz' : `${ONES[q]} yüz`); }
  if (n >= 10) { out.push(TENS[Math.floor(n / 10)]); n %= 10; }
  if (n) out.push(ONES[n]);
  return out.join(' ');
}
const RULES = [
  [/1,5–3,5[’']e/g, 'bir buçuk ile üç buçuğa'],
  [/\(SGLT1\)\s*/g, ''],
  [/GLUT2/g, 'glut iki'],
  [/GLUT1/g, 'glut bir'],
  [/\(HCl\),?\s*/g, ', '],
  [/\bATP\b/g, 'a te pe'],
  [/\bpH\b/g, 'pe ha'],
  [/Buna lokma \(bolus\) denir\./g, 'Buna lokma ya da bolus denir.'],
  [/parçalarına \(maltoz\) keser/g, 'parçalarına, yani maltoza, keser'],
  [/keseciklerindeki \(alveol\) oksijen/g, 'keseciklerindeki, yani alveollerdeki, oksijen'],
  [/\s*\(([^)]*)\)/g, ', yani $1,'],            // "kapakçık (triküspit)" → "kapakçık, yani triküspit,"
  [/,\s*,/g, ','], [/,\s*([.;:])/g, '$1'],
  [/%\s*(\d+)(?:[’'](\p{L}+))?/gu, (_, d, s) => `yüzde ${numberWords(+d)}${s || ''}`],
  [/(\d+)\s*[–-]\s*(\d+)/g, (_, a, b) => `${numberWords(+a)} ile ${numberWords(+b)}`],
  [/(\d+)(?:[’'](\p{L}+))?/gu, (_, d, s) => numberWords(+d) + (s || '')],
  [/[→×~]/g, ' '],
  [/[“”"]/g, ''],
];
export function spoken(text) {
  let s = text;
  for (const [re, to] of RULES) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

// ---- cues from the scene files: chapter `id: '…'` followed by `cues: [ [t, '…'], … ]`
const lines = [];
for (const f of cfg.scenes) {
  const src = fs.readFileSync(path.join(DIR, 'src', 'scenes', f), 'utf8');
  const re = /\bid:\s*'([\w-]+)'[\s\S]*?\bcues:\s*\[([\s\S]*?)\n\s*\],/g;
  let m;
  while ((m = re.exec(src))) {
    const [, id, body] = m;
    const cue = /\[\s*[\d.]+\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
    let c;
        const texts = [];
    while ((c = cue.exec(body))) texts.push(c[1].replace(/\'/g, "'"));
    // one recording per chapter: the whole paragraph is read in one go, so sentences flow into each other
    if (texts.length) {
      const says = texts.map(spoken), marks = [];
      let o = 0; for (const x of says) { marks.push(o); o += x.length + 1; }
      lines.push({ id, text: texts.join(' '), say: says.join(' '), marks });
    }
  }
}
const file = path.join(DIR, 'narration', 'lines.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ voice: old.voice || 'omni-kadin-genc', speed: old.speed || 0.92, out: 'narration/voice', url: 'voice', manifest: 'narration/manifest.json', lines: lines.map(({ id, say, marks }) => ({ id, say, marks })) }, null, 1) + '\n');
console.log(`narration/lines.json: ${lines.length} satır`);
if (process.argv.includes('--show')) for (const l of lines) if (l.say !== l.text) console.log(`${l.id}\n  ${l.text}\n  ${l.say}`);
