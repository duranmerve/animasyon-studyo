// Writes narration/lines.json from src/story.js: one line (one recording) per chapter, spoken text only.
//   node tools/lines.mjs   then, from the repo root:   npm run voice -- fall-of-constantinople
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHAPTERS } from '../src/story.js';
import { compile } from '../src/text.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(dir, 'narration', 'lines.json');
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const lines = CHAPTERS.map(ch => {
  const c = compile(ch.text);
  if (/[{}@|]|\d/.test(c.said)) throw new Error(`${ch.id}: söylenecek metinde işaret ya da rakam kaldı → ${c.said}`);
  return { id: ch.id, say: c.said };
});
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({
  voice: prev.voice || 'omni-erkek-yasli-derin',
  speed: prev.speed || 0.9,
  out: 'public/voice',
  manifest: 'narration/manifest.json',
  lines,
}, null, 1) + '\n');
const words = lines.reduce((a, l) => a + l.say.split(/\s+/).length, 0);
console.log(`${lines.length} satır, ${words} kelime → narration/lines.json`);
