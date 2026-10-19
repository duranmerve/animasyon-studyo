// Builds dist/index.html: one self-contained page (scripts and the voice manifest inlined) + dist/voice/*.mp3.
//   node build.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'dist');
const ORDER = ['script.js', 'core.js', 'gl.js', 'draw.js', 'props.js', 'scenes.js', 'scenes2.js', 'scenes3.js', 'audio.js', 'player.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'voice'), { recursive: true });
for (const f of fs.readdirSync(path.join(dir, 'public', 'voice'))) fs.copyFileSync(path.join(dir, 'public', 'voice', f), path.join(out, 'voice', f));
if (fs.existsSync(path.join(dir, 'poster.jpg'))) fs.copyFileSync(path.join(dir, 'poster.jpg'), path.join(out, 'poster.jpg'));

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'narration', 'manifest.json'), 'utf8'));
const code = ORDER.map(f => `// ---- ${f}\n` + fs.readFileSync(path.join(dir, 'src', f), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export (const|function|let|class|async function) /gm, '$1 ')).join('\n');
const bundle = `(() => {\n'use strict';\nconst MANIFEST = ${JSON.stringify(manifest)};\n${code}\n})();`;
const html = fs.readFileSync(path.join(dir, 'src', 'index.html'), 'utf8').replace('/*BUNDLE*/', () => bundle);
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
