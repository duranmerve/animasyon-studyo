// Writes narration/lines.json from src/story.js (one line per chapter, spoken spelling).
//   node tools/lines.mjs [--print]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHAPTERS, parse } from '../src/story.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(DIR, 'narration', 'lines.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const lines = CHAPTERS.map(c => ({ id: c.id, say: parse(c.text).said }));
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({
  voice: old.voice || 'omni-kadin-genc',
  speed: old.speed || 0.92,
  out: 'public/voice',
  manifest: 'narration/manifest.json',
  lines,
}, null, 1) + '\n');
const words = lines.reduce((n, l) => n + l.say.split(/\s+/).length, 0);
console.log(`narration/lines.json: ${lines.length} bölüm, ${words} kelime (~${(words / 140).toFixed(1)} dk)`);
if (process.argv.includes('--print')) for (const l of lines) console.log(`\n[${l.id}] ${l.say}`);
