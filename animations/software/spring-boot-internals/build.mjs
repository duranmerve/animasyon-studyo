// Build: copies the page (src/), the narration clips (public/voice) and the manifest into dist/.
// No bundler: the page is plain ES modules.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'dist');
fs.rmSync(out, { recursive: true, force: true });
const copy = (a, b) => {
  if (!fs.existsSync(a)) return;
  if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) copy(path.join(a, f), path.join(b, f)); }
  else fs.copyFileSync(a, b);
};
copy(path.join(dir, 'src'), out);
copy(path.join(dir, 'public'), out);
const man = path.join(dir, 'narration', 'manifest.json');
fs.writeFileSync(path.join(out, 'manifest.json'), fs.existsSync(man) ? fs.readFileSync(man) : '{"lines":{}}');
copy(path.join(dir, 'poster.jpg'), path.join(out, 'poster.jpg'));
console.log('spring-boot-internals → dist/');
