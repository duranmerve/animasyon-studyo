// Light, sky, image-based lighting and the "macro lens" look: shallow depth of field, bloom on
// dew highlights, gentle grain, vignette and a warm morning grade. Scene units are millimetres.
import {
  Scene, Color3, Color4, Vector3, DirectionalLight, HemisphericLight, UniversalCamera,
  RawCubeTexture, Constants, HDRFiltering, HDRCubeTexture, DefaultRenderingPipeline, ImageProcessingConfiguration,
  ShadowGenerator, ShaderMaterial, Effect, MeshBuilder, DepthOfFieldEffectBlurLevel,
  SSAO2RenderingPipeline, ColorCurves,
} from '@babylonjs/core';

// analytic sky + surroundings as seen from the ground at ant height: warm low sun, blue zenith,
// green grass wall at the horizon, brown soil below
export function skyColor(d, sun) {
  const y = d.y;
  const hor = [0.95, 0.78, 0.55], zen = [0.32, 0.5, 0.78], grass = [0.2, 0.3, 0.08], soil = [0.12, 0.08, 0.05];
  let c;
  if (y > 0.18) { const t = Math.min(1, (y - 0.18) / 0.8); c = hor.map((v, i) => v + (zen[i] - v) * Math.pow(t, 0.6)); }
  else if (y > -0.05) { const t = (y + 0.05) / 0.23; c = grass.map((v, i) => v + (hor[i] - v) * Math.pow(t, 1.5)); }
  else { const t = Math.min(1, (-y - 0.05) / 0.4); c = grass.map((v, i) => v + (soil[i] - v) * t); }
  const cosS = Math.max(0, d.x * sun.x + d.y * sun.y + d.z * sun.z);
  const glow = Math.pow(cosS, 8) * 1.4 + Math.pow(cosS, 400) * 30;
  return [c[0] + glow * 1.0, c[1] + glow * 0.82, c[2] + glow * 0.55];
}

export function createEnvironment(scene, sunDir) {
  // a real sunny meadow (Poly Haven "meadow_2", CC0) lights and reflects the scene;
  // the procedural cube below stays as a fallback
  return new Promise(resolve => {
    const hdr = new HDRCubeTexture('./env/meadow_2_1k.hdr', scene, 256, false, true, false, true,
      () => { hdr.rotationY = 2.35; hdr.level = 1.15; scene.environmentTexture = hdr; resolve(hdr); },
      () => resolve(createProceduralEnvironment(scene, sunDir)));
  });
}

function createProceduralEnvironment(scene, sunDir) {
  const size = 64;
  const faces = [];
  // Babylon cube face order: +x, -x, +y, -y, +z, -z
  const dirs = [
    (u, v) => [1, -v, -u], (u, v) => [-1, -v, u], (u, v) => [u, 1, v],
    (u, v) => [u, -1, -v], (u, v) => [u, -v, 1], (u, v) => [-u, -v, -1],
  ];
  for (let f = 0; f < 6; f++) {
    const data = new Float32Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
      const d = dirs[f](u, v); const l = Math.hypot(...d);
      const c = skyColor({ x: d[0] / l, y: d[1] / l, z: d[2] / l }, sunDir);
      const i = (y * size + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 1;
    }
    faces.push(data);
  }
  const cube = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_FLOAT, true, false, Constants.TEXTURE_TRILINEAR_SAMPLINGMODE);
  cube.gammaSpace = false;
  const filtering = new HDRFiltering(scene.getEngine(), { hdrScale: 1 });
  return filtering.prefilter(cube).then(() => { scene.environmentTexture = cube; return cube; }).catch(() => { scene.environmentTexture = cube; return cube; });
}

Effect.ShadersStore.skyVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main(){ vDir = position; gl_Position = worldViewProjection * vec4(position,1.0); gl_Position.z = gl_Position.w*0.99999; }`;
Effect.ShadersStore.skyFragmentShader = `
precision highp float;
varying vec3 vDir;
uniform vec3 sunDir;
uniform float night;
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 hor = vec3(0.95,0.78,0.55), zen = vec3(0.32,0.5,0.78), grass = vec3(0.16,0.24,0.06), soil = vec3(0.1,0.07,0.04);
  vec3 c;
  if (y > 0.18) c = mix(hor, zen, pow(min(1.0,(y-0.18)/0.8),0.6));
  else if (y > -0.05) c = mix(grass, hor, pow((y+0.05)/0.23,1.5));
  else c = mix(grass, soil, min(1.0,(-y-0.05)/0.4));
  float cs = max(0.0, dot(d, normalize(sunDir)));
  c += vec3(1.0,0.82,0.55) * (pow(cs,8.0)*1.4 + pow(cs,400.0)*30.0);
  c = mix(c, vec3(0.02,0.012,0.01), night);
  gl_FragColor = vec4(c,1.0);
}`;

export function createSky(scene, sunDir) {
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 20000, segments: 24, sideOrientation: 1 }, scene);
  const mat = new ShaderMaterial('skym', scene, 'sky', { attributes: ['position'], uniforms: ['worldViewProjection', 'sunDir', 'night'] });
  mat.setVector3('sunDir', sunDir);
  mat.setFloat('night', 0);
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  sky.material = mat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.applyFog = false;
  sky.renderingGroupId = 0;
  return sky;
}

export function createCinema(engine, canvas, { quality = 'high' } = {}) {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.015, 0.01, 1);
  scene.ambientColor = new Color3(0, 0, 0);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;

  const camera = new UniversalCamera('cam', new Vector3(0, 3, -10), scene);
  camera.minZ = 0.05; camera.maxZ = 30000;
  camera.fov = 0.7;
  camera.inputs.clear();

  // morning sun, low and behind-left, so grass blades and hairs are rim-lit
  const sunDir = new Vector3(-0.55, 0.38, 0.72).normalize();
  const sun = new DirectionalLight('sun', sunDir.scale(-1), scene);
  sun.intensity = 4.2;
  sun.diffuse = new Color3(1.0, 0.86, 0.66);
  sun.specular = new Color3(1.0, 0.9, 0.75);
  const fill = new HemisphericLight('fill', new Vector3(0, 1, 0), scene);
  fill.intensity = 0.12; fill.diffuse = new Color3(0.6, 0.72, 0.95); fill.groundColor = new Color3(0.2, 0.14, 0.08);
  fill.specular = new Color3(0, 0, 0);

  // one shadow map fitted around whatever the camera looks at (cascaded shadows crash some GPUs)
  const shadows = new ShadowGenerator(quality === 'low' ? 1024 : 2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = quality === 'low' ? ShadowGenerator.QUALITY_LOW : ShadowGenerator.QUALITY_MEDIUM;
  // soft penumbra that hardens where things touch (feet on soil), like a large soft macro light
  if (quality !== 'low') { shadows.useContactHardeningShadow = true; shadows.contactHardeningLightSizeUVRatio = 0.035; }
  shadows.bias = 0.0015; shadows.normalBias = 0.01;
  shadows.darkness = 0.1;
  sun.autoUpdateExtends = false; sun.autoCalcShadowZBounds = false;
  const fitShadow = (center, radius) => {
    sun.position = center.add(sunDir.scale(radius * 4));
    sun.orthoLeft = -radius; sun.orthoRight = radius; sun.orthoTop = radius; sun.orthoBottom = -radius;
    sun.shadowMinZ = 0.01; sun.shadowMaxZ = radius * 8;
  };
  fitShadow(Vector3.Zero(), 20);

  const pipe = new DefaultRenderingPipeline('cinema', true, scene, [camera]);
  pipe.samples = quality === 'low' ? 1 : 4;
  pipe.fxaaEnabled = quality === 'low';
  pipe.imageProcessingEnabled = true;
  const ip = pipe.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 0.9; ip.contrast = 1.25;
  ip.vignetteEnabled = true; ip.vignetteWeight = 1.5; ip.vignetteStretch = 0.4; ip.vignetteColor = new Color4(0.05, 0.03, 0.01, 0);
  ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
  ip.colorCurvesEnabled = true;
  const cc = new ColorCurves();
  cc.globalSaturation = 12; cc.shadowsHue = 200; cc.shadowsDensity = 18; cc.shadowsSaturation = 30;
  cc.highlightsHue = 40; cc.highlightsDensity = 25; cc.highlightsSaturation = 40;
  ip.colorCurves = cc;
  pipe.bloomEnabled = true; pipe.bloomThreshold = 1.0; pipe.bloomWeight = 0.3; pipe.bloomKernel = 96; pipe.bloomScale = 0.5;
  pipe.depthOfFieldEnabled = quality !== 'low';
  pipe.depthOfFieldBlurLevel = quality === 'high' ? DepthOfFieldEffectBlurLevel.High : DepthOfFieldEffectBlurLevel.Medium;
  pipe.grainEnabled = true; pipe.grain.intensity = 5; pipe.grain.animated = true;
  pipe.chromaticAberrationEnabled = true; pipe.chromaticAberration.aberrationAmount = 6; pipe.chromaticAberration.radialIntensity = 1.2;
  pipe.sharpenEnabled = false;

  let ssao = null;
  if (quality === 'high') {
    ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
    ssao.radius = 0.35; ssao.totalStrength = 1.0; ssao.base = 0.1; ssao.samples = 16; ssao.maxZ = 400; ssao.minZAspect = 0.2;
    ssao.expensiveBlur = true;
  }

  // Quality tiers, switchable at run time. The page measures the machine at start and picks the
  // highest tier that keeps a frame under budget; during playback it drops a tier if frames get slow.
  const TIERS = {
    ultra: { px: 2.6e6, msaa: 4, fxaa: false, dof: 2, ssao: true, pcss: true, pcf: 1, lens: true, bloomK: 96 },
    high: { px: 1.8e6, msaa: 2, fxaa: false, dof: 1, ssao: false, pcss: false, pcf: 1, lens: true, bloomK: 64 },
    mid: { px: 1.2e6, msaa: 1, fxaa: true, dof: 0, ssao: false, pcss: false, pcf: 0, lens: false, bloomK: 48 },
    low: { px: 0.8e6, msaa: 1, fxaa: true, dof: 0, ssao: false, pcss: false, pcf: -1, lens: false, bloomK: 32 },
    min: { px: 0.5e6, msaa: 1, fxaa: true, dof: -1, ssao: false, pcss: false, pcf: -1, lens: false, bloomK: 32, noShadow: true, noGrain: true },
  };
  let tier = null, lensPP = null;
  const setLens = pp => { lensPP = pp; };
  const setTier = name => {
    const T = TIERS[name]; if (!T || name === tier) return tier;
    tier = name;
    pipe.samples = T.msaa; pipe.fxaaEnabled = T.fxaa;
    pipe.depthOfFieldEnabled = T.dof >= 0;
    if (T.dof >= 0) pipe.depthOfFieldBlurLevel = [DepthOfFieldEffectBlurLevel.Low, DepthOfFieldEffectBlurLevel.Medium, DepthOfFieldEffectBlurLevel.High][T.dof];
    pipe.bloomKernel = T.bloomK;
    sun.shadowEnabled = !T.noShadow; pipe.grainEnabled = !T.noGrain; pipe.chromaticAberrationEnabled = !T.noGrain;
    if (ssao) { const m = scene.postProcessRenderPipelineManager; if (T.ssao) m.attachCamerasToRenderPipeline('ssao', camera); else m.detachCamerasFromRenderPipeline('ssao', camera); }
    shadows.usePercentageCloserFiltering = T.pcf >= 0;
    if (T.pcf >= 0) shadows.filteringQuality = T.pcf ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_LOW;
    shadows.useContactHardeningShadow = T.pcss;
    if (lensPP) { const on = camera._postProcesses.includes(lensPP); if (T.lens && !on) camera.attachPostProcess(lensPP); else if (!T.lens && on) camera.detachPostProcess(lensPP); }
    // low tiers skip the ground litter (grains, crumbs) in the shadow pass; the terrain still shadows
    const rl = shadows.getShadowMap().renderList;
    if (!shadows._fullList) shadows._fullList = rl.slice();
    rl.length = 0; for (const m of shadows._fullList) if (T.pcf >= 1 || !m.metadata?.cheapShadow) rl.push(m);
    return tier;
  };
  const tierPixels = name => TIERS[name].px;

  // focus: distance in mm, macro: blur strength (CoC = macro·|F−P|/P)
  const setFocus = (dist, macro = 3) => {
    if (!pipe.depthOfFieldEnabled) return;
    const F = Math.max(0.1, dist) * 1000;
    pipe.depthOfField.focusDistance = F;
    pipe.depthOfField.focalLength = F / 2;
    pipe.depthOfField.fStop = 1;
    pipe.depthOfField.lensSize = macro;
  };

  return { scene, camera, sun, sunDir, fill, shadows, fitShadow, pipe, ssao, setFocus, setTier, tierPixels, setLens, TIERS, get tier() { return tier; } };
}
