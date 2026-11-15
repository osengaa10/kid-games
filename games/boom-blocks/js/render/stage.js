// The renderer, camera, lights and sky. Bright toy-shop lighting: a soft sky light, one warm sun
// with shadows fitted to the island, and a dim studio environment so the plastic blocks get a
// little sheen.
import * as THREE from '../../vendor/three.module.min.js';
import { RoomEnvironment } from '../../vendor/RoomEnvironment.js';

const SKY_TOP = new THREE.Color(0x3fa9ff);
const SKY_HORIZON = new THREE.Color(0xcdeeff);
export const FOG = 0xbfe6ff;
// Sky light; with reflections off, a brighter sky light and an even fill make up what the
// reflections added (measured to match the castle's brightness and colour).
const HEMI = 1.45;
const HEMI_PLAIN = 2.2;
const FILL_PLAIN = 0.9;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
varying vec3 vDir;
#include <common>
void main() {
  float h = max(vDir.y, 0.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
  float sun = max(dot(vDir, uSun), 0.0);
  col += vec3(1.0, 0.92, 0.7) * (pow(sun, 64.0) * 0.8 + pow(sun, 6.0) * 0.12);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createStage(canvas) {
  // Edge smoothing (multisampling) is off: on an iPad it cost about as much as all the rest of the
  // drawing put together (an A16 iPad on High: 49 ms a frame with it, 27 without), and at the
  // pixel ratios the tiers use, block edges look fine without it. ?aa=1 turns it on to compare;
  // it can only be chosen when the renderer is made.
  const aa = new URLSearchParams(location.search).get('aa') === '1';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: aa, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 140, 420);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);

  const hemi = new THREE.HemisphereLight(0xe3f3ff, 0x8fcf6a, HEMI);
  scene.add(hemi);
  const fill = new THREE.AmbientLight(0xffffff, 0);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
  sun.position.set(38, 70, 26);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -52;
  sc.right = 52;
  sc.top = 52;
  sc.bottom = -52;
  sc.near = 10;
  sc.far = 220;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);

  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.32;
  pm.dispose();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uTop: { value: SKY_TOP }, uHorizon: { value: SKY_HORIZON }, uSun: { value: sun.position.clone().normalize() } },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const clouds = makeClouds();
  scene.add(clouds);

  function applyQuality(q, width, height) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    renderer.setSize(width, height, false);
    const size = q.shadows;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    // Reflections (the studio sheen) cost a lot of drawing on an iPad; without them the lights
    // make up the brightness they added. Changing this rebuilds the block shaders.
    const want = q.reflections ? env : null;
    if (scene.environment !== want) {
      scene.environment = want;
      hemi.intensity = want ? HEMI : HEMI_PLAIN;
      fill.intensity = want ? 0 : FILL_PLAIN;
    }
    const type = q.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (renderer.shadowMap.type !== type) {
      renderer.shadowMap.type = type;
      scene.traverse((o) => {
        if (o.material) o.material.needsUpdate = true;
      });
    }
  }

  function update(t) {
    clouds.position.x = ((t * 1.2 + 200) % 400) - 200;
  }

  return { renderer, scene, camera, sun, applyQuality, update };
}

// Puffy block clouds drifting high over the island: one instanced mesh, no shadows.
function makeClouds() {
  const boxes = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  for (let c = 0; c < 14; c++) {
    const cx = rand(-260, 260);
    const cz = rand(-260, 200);
    const cy = rand(70, 110);
    const n = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const s = rand(6, 13);
      boxes.push([cx + rand(-14, 14), cy + rand(-2, 4), cz + rand(-7, 7), s]);
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xdfefff, emissiveIntensity: 0.55 }), boxes.length);
  const m = new THREE.Matrix4();
  boxes.forEach(([x, y, z, s], i) => {
    m.makeScale(s, s * 0.6, s * 0.8).setPosition(x, y, z);
    mesh.setMatrixAt(i, m);
  });
  mesh.frustumCulled = false;
  return mesh;
}
