// Builds narration/lines.json from src/script.js (one clip per section) and checks the cues:
// every cue phrase must appear exactly once in its section's text.
//   node dev/make-lines.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SECTIONS, SAY } = await import(pathToFileURL(path.join(dir, 'src', 'script.js')).href);

let bad = 0;
for (const s of SECTIONS) {
  for (const [k, p] of Object.entries(s.cues || {})) {
    const n = s.text.split(p).length - 1;
    if (n !== 1) { console.log(`✗ ${s.id}.${k}: "${p}" ${n} kez geçiyor`); bad++; }
  }
}
const say = t => SAY.reduce((a, [from, to]) => a.split(from).join(to), t);
const lines = SECTIONS.map(s => ({ id: s.id, say: say(s.text) }));
for (const l of lines) if (/[0-9()%]/.test(l.say)) { console.log(`✗ ${l.id}: söylenecek metinde rakam/sembol var`); bad++; }

const file = path.join(dir, 'narration', 'lines.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ voice: old.voice || 'windows-tolga', speed: old.speed || 0.92, out: 'public/voice', manifest: 'narration/manifest.json', lines }, null, 1) + '\n');
const words = lines.reduce((a, l) => a + l.say.split(/\s+/).length, 0);
console.log(`${lines.length} satır, ${words} kelime → narration/lines.json${bad ? ` · ${bad} sorun` : ''}`);
process.exit(bad ? 1 : 0);
