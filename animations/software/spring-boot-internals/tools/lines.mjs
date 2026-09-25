// Writes narration/lines.json (what the voice tool reads) from src/narration.js: one line per section.
//   node tools/lines.mjs [--print]
import fs from 'fs';
import { SECTIONS, parseSection } from '../src/narration.js';

const file = new URL('../narration/lines.json', import.meta.url);
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const lines = SECTIONS.map(s => ({ id: s.id, say: parseSection(s).say }));
fs.writeFileSync(file, JSON.stringify({
  voice: prev.voice || 'omni-erkek-derin',
  speed: prev.speed || 0.95,
  out: 'public/voice',
  manifest: 'narration/manifest.json',
  lines,
}, null, 1) + '\n');
const words = lines.reduce((a, l) => a + l.say.split(/\s+/).length, 0);
console.log(`${lines.length} bölüm · ${words} kelime · ~${(words / 140).toFixed(1)} dk`);
if (process.argv.includes('--print')) for (const l of lines) console.log(`\n[${l.id}]\n${l.say}`);
