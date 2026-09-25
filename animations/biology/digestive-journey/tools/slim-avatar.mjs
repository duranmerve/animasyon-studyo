// Shrinks an Avaturn GLB for the web: keeps only the face shapes the eating scene uses,
// drops the idle animation, compresses geometry (meshopt) and textures (WebP).
// usage: npm run avatar -- <in.glb> assets/avatar.glb
// needs: npm install (dev dependencies in this folder's package.json)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [, , input, output] = process.argv;
const KEEP = new Set([
  'jawOpen', 'mouthOpen', 'mouthClose', 'jawLeft', 'jawRight', 'jawForward', 'cheekPuff',
  'mouthRollLower', 'mouthRollUpper', 'mouthPucker', 'mouthFunnel', 'mouthPressLeft', 'mouthPressRight',
  'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'mouthSmile', 'mouthSmileLeft', 'mouthSmileRight', 'tongueOut',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed', 'eyesLookDown', 'eyeLookDownLeft', 'eyeLookDownRight',
  'browInnerUp', 'eyeSquintLeft', 'eyeSquintRight',
]);

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);

for (const mesh of doc.getRoot().listMeshes()) {
  const names = mesh.getExtras().targetNames || [];
  if (!names.length) continue;
  const keep = names.map((n, i) => (KEEP.has(n) ? i : -1)).filter(i => i >= 0);
  for (const prim of mesh.listPrimitives()) {
    prim.listTargets().forEach((t, i) => { if (!keep.includes(i)) { prim.removeTarget(t); t.dispose(); } });
  }
  const w = mesh.getWeights();
  mesh.setWeights(keep.map(i => w[i] ?? 0));
  mesh.setExtras({ ...mesh.getExtras(), targetNames: keep.map(i => names[i]) });
}
for (const a of doc.getRoot().listAnimations()) a.dispose();

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, resize: [1024, 1024] }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
console.log('wrote', output);
