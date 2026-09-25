// Builds dist/: the page, its modules, the narration clips and their timings. No bundler needed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url)), out = path.join(dir, 'dist');
// fs.cpSync fails on paths with non-ASCII letters on some Windows setups; copy by hand
const copy = (a, b) => {
  if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) copy(path.join(a, f), path.join(b, f)); }
  else fs.copyFileSync(a, b);
};
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'style.css', 'src']) copy(path.join(dir, f), path.join(out, f));
if (fs.existsSync(path.join(dir, 'public'))) for (const f of fs.readdirSync(path.join(dir, 'public'))) copy(path.join(dir, 'public', f), path.join(out, f));
if (fs.existsSync(path.join(dir, 'poster.jpg'))) copy(path.join(dir, 'poster.jpg'), path.join(out, 'poster.jpg'));
const man = path.join(dir, 'narration', 'manifest.json');
fs.writeFileSync(path.join(out, 'narration.json'), fs.existsSync(man) ? fs.readFileSync(man) : '{"lines":{}}');
console.log('fall-of-constantinople → dist/');
