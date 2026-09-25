// Builds this animation into ./dist (a single self-contained page).
//   node build.mjs      → dist/index.html (open directly) + dist/artifact.html (claude.ai artifact body)
// Engine: src/engine (shell.html, core.js, engine.js) · scenes: src/scenes (order in animation.json)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const THREE_VERSION = '0.170.0';
const read = (...p) => fs.readFileSync(path.join(DIR, ...p), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HEADER = `import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
`;

// {{key.path}} → escaped text, {{{key.path}}} → raw HTML
function fill(tpl, data) {
  const get = k => k.split('.').reduce((o, p) => (o == null ? o : o[p]), data);
  return tpl
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k) => get(k) ?? '')
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => esc(get(k) ?? ''));
}

// recorded narration (one recording per chapter) + where each subtitle's sentence starts in it
function narration() {
  const mf = path.join(DIR, 'narration', 'manifest.json'), lf = path.join(DIR, 'narration', 'lines.json');
  if (!fs.existsSync(mf)) return null;
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const lines = fs.existsSync(lf) ? JSON.parse(fs.readFileSync(lf, 'utf8')).lines : [];
  for (const l of lines) if (m.lines[l.id]) { m.lines[l.id].marks = l.marks; m.lines[l.id].len = l.say.length; }
  return m;
}

export function build() {
  const cfg = JSON.parse(read('animation.json'));
  const missing = cfg.scenes.filter(f => !fs.existsSync(path.join(DIR, 'src', 'scenes', f)));
  if (missing.length) throw new Error(`missing scene files: ${missing.join(', ')}`);
  const embeds = Object.entries(cfg.embed || {}).map(([name, file]) => `const ${name} = "${fs.readFileSync(path.join(DIR, file)).toString('base64')}";`);
  const js = [
    HEADER,
    `const PAGE = ${JSON.stringify(cfg.page || {})};`,
    `const NARRATION = ${JSON.stringify(narration())};`,
    ...embeds,
    ...['core.js', 'engine.js'].map(f => `// ---- src/engine/${f}\n` + read('src', 'engine', f)),
    ...cfg.scenes.map(f => `// ---- src/scenes/${f}\n` + read('src', 'scenes', f)),
  ].join('\n');
  const body = fill(read('src', 'engine', 'shell.html'), { title: cfg.title, ...cfg.page })
    .replaceAll('@0.170.0/', `@${THREE_VERSION}/`)
    .replace('/*SCRIPT*/', () => js);
  const out = path.join(DIR, 'dist');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'artifact.html'), body);
  const cut = body.indexOf('</style>') + '</style>'.length;
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="${cfg.lang || 'tr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${esc(cfg.description || '')}">
${body.slice(0, cut)}
</head>
<body>
${body.slice(cut).trim()}
</body>
</html>
`);
  // recorded narration (npm run voice -- digestive-journey at the repository root)
  const vsrc = path.join(DIR, 'narration', 'voice');
  if (fs.existsSync(vsrc)) {
    fs.rmSync(path.join(out, 'voice'), { recursive: true, force: true });
    fs.mkdirSync(path.join(out, 'voice'), { recursive: true });
    for (const f of fs.readdirSync(vsrc)) if (f.endsWith('.mp3')) fs.copyFileSync(path.join(vsrc, f), path.join(out, 'voice', f));
  }
  if (fs.existsSync(path.join(DIR, 'poster.jpg'))) fs.copyFileSync(path.join(DIR, 'poster.jpg'), path.join(out, 'poster.jpg'));
  console.log(`built ${cfg.slug} → dist/index.html (${(fs.statSync(path.join(out, 'index.html')).size / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
