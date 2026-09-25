// Builds dist/: the page, its modules, the narration clips and their timings. No bundler needed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'dist');
const copy = (a, b) => {
  if (!fs.existsSync(a)) return;
  if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a)) copy(path.join(a, e), path.join(b, e)); }
  else { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
};
fs.rmSync(OUT, { recursive: true, force: true });
copy(path.join(DIR, 'index.html'), path.join(OUT, 'index.html'));
copy(path.join(DIR, 'src'), path.join(OUT, 'src'));
copy(path.join(DIR, 'public'), OUT);
copy(path.join(DIR, 'narration', 'manifest.json'), path.join(OUT, 'manifest.json'));
if (fs.existsSync(path.join(DIR, 'poster.jpg'))) copy(path.join(DIR, 'poster.jpg'), path.join(OUT, 'poster.jpg'));
console.log('git-version-control → dist/');
