// Writes narration/lines.json from src/script.js: one line (one recording) per chapter.
import fs from 'fs';
import { CHAPTERS } from '../src/script.js';
const spec = {
  voice: 'omni-erkek-yasli-derin',
  speed: 0.9,
  out: 'public/voice',
  manifest: 'narration/manifest.json',
  lines: CHAPTERS.map(c => ({ id: c.id, say: c.say || c.text })),
};
const file = new URL('../narration/lines.json', import.meta.url);
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
if (old) { spec.voice = old.voice; spec.speed = old.speed; }
fs.writeFileSync(file, JSON.stringify(spec, null, 1) + '\n');
console.log(`${spec.lines.length} satır → narration/lines.json`);
