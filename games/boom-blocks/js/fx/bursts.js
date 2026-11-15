// One-off effect meshes, pooled: shockwave rings that roll across the ground, cartoon "POW" star
// flashes, scorch marks, and puffy fireballs. Only the ones playing are drawn.
import * as THREE from '../../vendor/three.module.min.js';

const RING_VERT = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv * 2.0 - 1.0;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const RING_FRAG = /* glsl */ `
uniform float uProg;
uniform vec3 uColor;
uniform float uWidth;
uniform float uAlpha;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
void main() {
  float r = length(vUv);
  float band = smoothstep(1.0 - uWidth, 1.0 - uWidth * 0.35, r) * (1.0 - smoothstep(0.97, 1.0, r));
  float a = band * (1.0 - uProg) * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// A cartoon impact star: spiky outline, white-hot middle, colored rim.
const STAR_FRAG = /* glsl */ `
uniform float uProg;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uSeed;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float ang = atan(vUv.y, vUv.x) + uSeed;
  float spikes = 0.62 + 0.38 * pow(abs(cos(ang * 4.0)), 6.0) + 0.12 * cos(ang * 7.0);
  float edge = r / spikes;
  if (edge > 1.0) discard;
  vec3 col = mix(vec3(1.0, 1.0, 0.92), uColor, smoothstep(0.25, 0.85, edge));
  float a = (1.0 - uProg * uProg) * uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

const SCORCH_FRAG = /* glsl */ `
uniform float uProg;
uniform float uSeed;
varying vec2 vUv;
#include <common>
void main() {
  float ang = atan(vUv.y, vUv.x);
  float r = length(vUv) * (1.0 + 0.15 * sin(ang * 6.0 + uSeed * 9.0));
  float a = smoothstep(1.0, 0.35, r) * 0.42 * (1.0 - smoothstep(0.55, 1.0, uProg));
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.12, 0.09, 0.1), a);
}`;

const FIRE_VERT = /* glsl */ `
uniform float uProg;
uniform float uSeed;
varying vec3 vN;
varying vec3 vView;
varying float vNoise;
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
  float n = sin(p.x * 3.1 + uSeed * 7.0) * sin(p.y * 2.7 + uSeed * 3.0) * sin(p.z * 3.3 + uSeed);
  vNoise = n;
  p *= 1.0 + 0.18 * n;
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vView = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FIRE_FRAG = /* glsl */ `
uniform float uProg;
uniform vec3 uHot;
uniform vec3 uCool;
varying vec3 vN;
varying vec3 vView;
varying float vNoise;
#include <common>
#include <fog_pars_fragment>
void main() {
  float facing = max(dot(normalize(vN), vView), 0.0);
  // Burns away from the edges as it ages.
  if (vNoise * 0.5 + 0.5 < uProg * 1.15 - 0.15 + (1.0 - facing) * 0.35) discard;
  vec3 smoke = vec3(0.55, 0.5, 0.58);
  vec3 col = mix(uCool, uHot, pow(facing, 1.5));
  col = mix(col, smoke, smoothstep(0.35, 0.9, uProg));
  float light = 0.8 + 0.4 * max(vN.y, 0.0);
  gl_FragColor = vec4(col * light * (1.0 + (1.0 - uProg) * 1.2), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

class Pool {
  constructor(make, n) {
    this.items = Array.from({ length: n }, make);
    this.next = 0;
  }
  take() {
    // Prefer an idle one; otherwise reuse the oldest.
    for (let k = 0; k < this.items.length; k++) {
      const it = this.items[(this.next + k) % this.items.length];
      if (!it.active) {
        this.next = (this.next + k + 1) % this.items.length;
        return it;
      }
    }
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    return it;
  }
}

function shaderMat(vertex, fragment, uniforms, opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uniforms]),
    fog: true,
    transparent: true,
    depthWrite: false,
    ...opts,
  });
}

export class Bursts {
  constructor(scene, camera) {
    this.camera = camera;
    this.time = 0;
    const flat = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    const face = new THREE.PlaneGeometry(2, 2);
    this.rings = new Pool(() => {
      const m = new THREE.Mesh(flat, shaderMat(RING_VERT, RING_FRAG, { uProg: { value: 0 }, uColor: { value: new THREE.Color() }, uWidth: { value: 0.25 }, uAlpha: { value: 1 } }, { blending: THREE.AdditiveBlending }));
      m.visible = false;
      m.renderOrder = 4;
      scene.add(m);
      return { mesh: m, active: false };
    }, 10);
    this.stars = new Pool(() => {
      const m = new THREE.Mesh(face, shaderMat(RING_VERT, STAR_FRAG, { uProg: { value: 0 }, uColor: { value: new THREE.Color() }, uAlpha: { value: 1 }, uSeed: { value: 0 } }, { depthTest: false, fog: false, blending: THREE.AdditiveBlending }));
      m.visible = false;
      m.renderOrder = 6;
      scene.add(m);
      return { mesh: m, active: false };
    }, 6);
    this.scorches = new Pool(() => {
      const m = new THREE.Mesh(flat, shaderMat(RING_VERT, SCORCH_FRAG, { uProg: { value: 0 }, uSeed: { value: 0 } }, { fog: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.visible = false;
      m.renderOrder = 1;
      scene.add(m);
      return { mesh: m, active: false };
    }, 10);
    const ball = new THREE.IcosahedronGeometry(1, 3);
    this.fires = new Pool(() => {
      const m = new THREE.Mesh(ball, shaderMat(FIRE_VERT, FIRE_FRAG, { uProg: { value: 0 }, uSeed: { value: 0 }, uHot: { value: new THREE.Color(0xfff3a0) }, uCool: { value: new THREE.Color(0xff7a2f) } }, { transparent: false, depthWrite: true }));
      m.visible = false;
      scene.add(m);
      return { mesh: m, active: false };
    }, 16);
    this.flashBudget = [];
  }

  start(item, life, extra) {
    Object.assign(item, { active: true, t0: this.time, life, ...extra });
    item.mesh.visible = true;
    item.mesh.material.uniforms.uProg.value = 0;
    return item;
  }

  // A ring rolling out across the ground (or flat at height y).
  ring(x, y, z, radius, { color = 0xffffff, life = 0.6, width = 0.22, alpha = 1, from = 0.5 } = {}) {
    const it = this.start(this.rings.take(), life, { radius, from });
    it.mesh.position.set(x, y + 0.08, z);
    it.mesh.scale.setScalar(from);
    const u = it.mesh.material.uniforms;
    u.uColor.value.setHex(color);
    u.uWidth.value = width;
    u.uAlpha.value = alpha;
  }

  // A brief cartoon impact star. Kept small and soft, and never more than three a second.
  star(x, y, z, size, color = 0xffd23f, { calm = false } = {}) {
    this.flashBudget = this.flashBudget.filter((t) => this.time - t < 1);
    if (this.flashBudget.length >= 3) return;
    this.flashBudget.push(this.time);
    const it = this.start(this.stars.take(), 0.16, { size });
    it.mesh.position.set(x, y, z);
    const u = it.mesh.material.uniforms;
    u.uColor.value.setHex(color);
    u.uAlpha.value = calm ? 0.25 : 0.5;
    u.uSeed.value = Math.random() * 6.28;
  }

  scorch(x, z, radius) {
    const it = this.start(this.scorches.take(), 7, {});
    it.mesh.position.set(x, 0.03, z);
    it.mesh.scale.setScalar(radius);
    it.mesh.material.uniforms.uSeed.value = Math.random() * 10;
  }

  // A puffy fireball that swells, burns away from the edges and turns to smoke.
  fire(x, y, z, size, { delay = 0, life = 0.7, rise = 3, hot = 0xfff3a0, cool = 0xff7a2f } = {}) {
    const it = this.start(this.fires.take(), life, { size, rise, delay, y0: y });
    it.t0 += delay;
    it.mesh.position.set(x, y, z);
    it.mesh.scale.setScalar(0.01);
    it.mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    const u = it.mesh.material.uniforms;
    u.uSeed.value = Math.random() * 10;
    u.uHot.value.setHex(hot);
    u.uCool.value.setHex(cool);
  }

  update(time) {
    this.time = time;
    for (const it of this.rings.items) {
      if (!it.active) continue;
      const p = (time - it.t0) / it.life;
      if (p >= 1) {
        it.active = it.mesh.visible = false;
        continue;
      }
      const e = 1 - Math.pow(1 - p, 3);
      it.mesh.scale.setScalar(it.from + (it.radius - it.from) * e);
      it.mesh.material.uniforms.uProg.value = p;
    }
    for (const it of this.stars.items) {
      if (!it.active) continue;
      const p = (time - it.t0) / it.life;
      if (p >= 1) {
        it.active = it.mesh.visible = false;
        continue;
      }
      it.mesh.quaternion.copy(this.camera.quaternion);
      it.mesh.scale.setScalar(it.size * (0.6 + 0.6 * Math.sqrt(p)));
      it.mesh.material.uniforms.uProg.value = p;
    }
    for (const it of this.scorches.items) {
      if (!it.active) continue;
      const p = (time - it.t0) / it.life;
      if (p >= 1) {
        it.active = it.mesh.visible = false;
        continue;
      }
      it.mesh.material.uniforms.uProg.value = p;
    }
    for (const it of this.fires.items) {
      if (!it.active) continue;
      const p = (time - it.t0) / it.life;
      if (p >= 1) {
        it.active = it.mesh.visible = false;
        continue;
      }
      if (p < 0) {
        it.mesh.scale.setScalar(0.001);
        continue;
      }
      const grow = 1 - Math.pow(1 - Math.min(1, p * 2.2), 3);
      it.mesh.scale.setScalar(it.size * (0.25 + 0.95 * grow));
      it.mesh.position.y = it.y0 + it.rise * p * p;
      it.mesh.material.uniforms.uProg.value = p;
    }
  }

  clear() {
    for (const pool of [this.rings, this.stars, this.scorches, this.fires])
      for (const it of pool.items) {
        it.active = false;
        it.mesh.visible = false;
      }
  }
}
