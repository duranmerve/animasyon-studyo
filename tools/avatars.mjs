// Shared avatar library: assets/avatars/ (catalog.json, models/<id>.glb, thumbs/<id>.jpg, README.md).
//   npm run avatars -- list                         avatars in the library
//   npm run avatars -- add <id...>                  slim raw <id>.glb from the source folder into models/ (+ thumbnail, catalog row)
//   npm run avatars -- thumbs [id...]               (re)render thumbnails (all when no id is given)
//   npm run avatars -- use <id> <slug> [file.glb]   copy a library model into animations/<kategori>/<slug>/assets/
//   npm run avatars -- readme                       rewrite assets/avatars/README.md from catalog.json
// Raw Avaturn GLBs (~14 MB each) stay outside git in catalog.json → "source" (override: AVATAR_SOURCE env).
// Library models keep every face shape (ARKit expressions + visemes for lip sync), drop the 1-frame idle
// animation and compress geometry (meshopt) and textures (WebP): ~14 MB → ~3.5 MB.
// needs: npm install (root dev dependencies)
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { findAnimation } from './lib/animations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'assets', 'avatars');
const CATALOG = path.join(LIB, 'catalog.json');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const readCatalog = () => JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const writeCatalog = c => fs.writeFileSync(CATALOG, JSON.stringify(c, null, 2) + '\n');
const sourceDir = c => process.env.AVATAR_SOURCE || c.source;
const modelPath = id => path.join(LIB, 'models', `${id}.glb`);
const thumbPath = id => path.join(LIB, 'thumbs', `${id}.jpg`);
const mb = f => (fs.statSync(f).size / 1048576).toFixed(1);
function die(msg) { console.error(msg); process.exit(1); }

async function slim(input, output) {
  const { NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { prune, dedup, quantize, meshopt, textureCompress } = await import('@gltf-transform/functions');
  const { MeshoptEncoder } = await import('meshoptimizer');
  const sharp = (await import('sharp')).default;
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.read(input);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(
    prune(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, resize: [1024, 1024] }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await io.write(output, doc);
}

// Renders each avatar in headless Chrome with three.js from node_modules: full body + face close-up.
async function thumbs(ids) {
  const c = readCatalog();
  const files = Object.fromEntries(ids.map(id => {
    const lib = modelPath(id);
    return [id, fs.existsSync(lib) ? lib : die(`kütüphanede yok: ${id}`)];
  }));
  const three = path.join(ROOT, 'node_modules', 'three');
  const page = `<!doctype html><html><body style="margin:0;background:#000">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const W = 640, H = 400;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setScissorTest(true); document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xfff1e6, 2.2); key.position.set(1.5, 2.5, 2.5); scene.add(key);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let current;
window.show = async url => {
  if (current) scene.remove(current);
  const g = await loader.loadAsync(url); current = g.scene; scene.add(current);
  current.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  current.updateMatrixWorld(true);
  const head = new THREE.Vector3(); current.getObjectByName('Head').getWorldPosition(head);
  const face = new THREE.PerspectiveCamera(22, (W * 0.42) / H, 0.05, 20);
  const full = new THREE.PerspectiveCamera(31, (W * 0.58) / H, 0.05, 50);
  full.position.set(0.7, head.y * 0.56, 3.6); full.lookAt(0, head.y * 0.53, 0);
  face.position.set(head.x + 0.12, head.y + 0.1, head.z + 0.75); face.lookAt(head.x, head.y + 0.07, head.z);
  const bg = [new THREE.Color('#2a1a20'), new THREE.Color('#1a1014')];
  renderer.setViewport(0, 0, W * 0.58, H); renderer.setScissor(0, 0, W * 0.58, H); scene.background = bg[0]; renderer.render(scene, full);
  renderer.setViewport(W * 0.58, 0, W * 0.42, H); renderer.setScissor(W * 0.58, 0, W * 0.42, H); scene.background = bg[1]; renderer.render(scene, face);
  return renderer.domElement.toDataURL('image/jpeg', 0.86);
};
window.ready = true;
</script></body></html>`;
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = null;
    if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
    if (u.startsWith('/three/')) f = path.join(three, u.slice(7));
    if (u.startsWith('/glb/')) f = files[u.slice(5)];
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, r));
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
  try {
    const tab = await browser.newPage();
    tab.on('pageerror', e => console.error(e.message));
    await tab.goto(`http://localhost:${server.address().port}/`);
    await tab.waitForFunction('window.ready', { timeout: 30000 });
    fs.mkdirSync(path.join(LIB, 'thumbs'), { recursive: true });
    for (const id of ids) {
      const data = await tab.evaluate(u => window.show(u), `/glb/${id}`);
      fs.writeFileSync(thumbPath(id), Buffer.from(data.split(',')[1], 'base64'));
      console.log('küçük resim', id);
    }
  } finally { await browser.close(); server.close(); }
}

function readme() {
  const c = readCatalog();
  const gender = { female: 'Kadın', male: 'Erkek' };
  const row = a => `| <img src="thumbs/${a.id}.jpg" width="240"> | \`${a.id}\` | ${gender[a.gender]}${a.age ? ', ' + a.age : ''} | ${a.look} |`;
  fs.writeFileSync(path.join(LIB, 'README.md'), `# Avatar kütüphanesi

Bir animasyonda gerçekçi bir insan karakteri gerekirse kullanılabilecek hazır modeller. Kullanmak zorunlu değil; animasyon karakter gerektirmiyorsa ya da başka bir yaklaşım daha uygunsa hiç kullanılmaz. Hepsi Avaturn ile üretildi (glTF 2.0, tek iskelet, 54 kemik: \`Hips\`, \`Spine…\`, \`Neck\`, \`Head\`, \`Left/RightArm\`, parmaklar, bacaklar, gözler). Aynı iskeleti paylaştıkları için bir karakter için yazılan poz, ters kinematik ve yüz ifadesi kodu diğerlerinde de çalışır.

Bu dosya \`npm run avatars -- readme\` ile \`catalog.json\`'dan üretilir; elle düzenlemeyin.

## Nasıl kullanılır

\`\`\`
npm install                                          # kökte, bir kez (araçların bağımlılıkları)
npm run avatars -- list                              # kütüphanedeki karakterler
npm run avatars -- use set-01-f02 heartbeat          # → animations/biology/heartbeat/assets/avatar-set-01-f02.glb
npm run avatars -- use set-01-f02 heartbeat teacher.glb
npm run avatars -- add set-02-f03                    # ham <kimlik>.glb dosyasını küçültüp ekler (+ küçük resim)
npm run avatars -- thumbs                            # küçük resimleri yeniden çizer
\`\`\`

Animasyonlar bağımsız kalsın diye model, kullanıldığı animasyonun \`assets/\` klasörüne **kopyalanır**; animasyon onu nasıl yükleyeceğine kendisi karar verir.

## Model içeriği

- **Yüz şekilleri (morph target):** 52 ARKit ifadesi (\`jawOpen\`, \`eyeBlinkLeft\`, \`mouthSmile\`, \`browInnerUp\`…) ve 15 konuşma şekli (\`viseme_aa\`, \`viseme_O\`, \`viseme_PP\`…): anlatımla dudak senkronu yapılabilir.
- **Parçalar:** Body, Head, Eye, EyeAO, Eyelash, Teeth, Tongue, saç, ayakkabı ve kıyafet.
- **Sıkıştırma:** geometri \`EXT_meshopt_compression\`, dokular WebP. Yükleyicide meshopt çözücüsü gerekir (three.js: \`GLTFLoader.setMeshoptDecoder\`, Babylon.js: \`MeshoptCompression\`).
- **Boyut:** ham ~14 MB → kütüphanede ~3,5 MB; ham modeldeki tek karelik bekleme animasyonu atıldı. Model T-pozunda gelir.
- **Ham modeller** git'te değil: \`${c.source}\` (başka bir yer için \`AVATAR_SOURCE\` ortam değişkeni).

## Karakterler (${c.avatars.length})

| Görünüm | Kimlik | Kişi | Saç ve kıyafet |
|---|---|---|---|
${c.avatars.map(row).join('\n')}

Yeni bir avatar eklemek için ham dosyayı (\`<kimlik>.glb\`) kaynak klasöre koyup \`npm run avatars -- add <kimlik>\` çalıştırın. Ardından \`catalog.json\` içinde yaşı ve açıklamayı doldurup \`npm run avatars -- readme\` ile bu dosyayı yenileyin.
`);
  console.log('assets/avatars/README.md yazıldı');
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'list') {
  const c = readCatalog();
  for (const a of c.avatars) console.log(`${a.id}  ${a.gender === 'female' ? 'K' : 'E'} ${String(a.age ?? '').padStart(2)}  ${a.look}`);
} else if (cmd === 'add') {
  if (!args.length) die('usage: npm run avatars -- add <id...>');
  const c = readCatalog();
  for (const id of args) {
    const raw = path.join(sourceDir(c), `${id}.glb`);
    if (!fs.existsSync(raw)) die(`ham model yok: ${raw}`);
    await slim(raw, modelPath(id));
    if (!c.avatars.some(a => a.id === id)) c.avatars.push({ id, gender: /-f\d/.test(id) ? 'female' : 'male', age: null, look: '' });
    c.avatars.sort((x, y) => x.id.localeCompare(y.id)); writeCatalog(c);
    console.log(`${id}: ${mb(raw)} MB → ${mb(modelPath(id))} MB`);
  }
  await thumbs(args);
  readme();
} else if (cmd === 'thumbs') {
  const c = readCatalog();
  await thumbs(args.length ? args : c.avatars.map(a => a.id));
} else if (cmd === 'use') {
  const [id, slug, name] = args;
  if (!id || !slug) die('usage: npm run avatars -- use <id> <slug> [file.glb]');
  const src = modelPath(id), dir = findAnimation(slug).dir;
  if (!fs.existsSync(src)) die(`${id} kütüphanede yok; önce: npm run avatars -- add ${id}`);
  if (!fs.existsSync(dir)) die(`animasyon yok: ${slug}`);
  const dst = path.join(dir, 'assets', name || `avatar-${id}.glb`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`${id} → ${path.relative(ROOT, dst)}\n  animation.json → "embed": { "AVATAR_GLB_B64": "${path.relative(dir, dst).replaceAll('\\', '/')}" }`);
} else if (cmd === 'readme') {
  readme();
} else {
  die('usage: npm run avatars -- list | add <id...> | thumbs [id...] | use <id> <slug> [file.glb] | readme');
}
