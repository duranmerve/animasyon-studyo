// Writes narration/lines.json (what the narrator says, one paragraph per chapter) from the story script.
// Then, at the repository root: npm run voice -- laser-printer [--voice omni-kadin-genc]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHAPTERS } from '../src/story/script.js';
import { spoken } from '../src/story/spoken.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(DIR, 'narration', 'lines.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const lines = [];
// one recording per chapter: the whole paragraph is read in one go, so sentences flow into each other
for (const c of CHAPTERS) lines.push({ id: c.id, say: c.cues.map(q => spoken(q)).join(' ') });
fs.mkdirSync(path.join(DIR, 'narration'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'narration', 'lines.json'), JSON.stringify({ voice: old.voice || 'omni-erkek-derin', speed: old.speed || 0.88, out: 'public/voice', manifest: 'narration/manifest.json', lines }, null, 1) + '\n');
console.log(`narration/lines.json: ${lines.length} satır`);
