// Thousands of particles for almost no processor time: each particle is written once when it's
// born (where, when, how fast, what color) and the vertex shader works out where it is now from
// closed-form motion (gravity, air drag, up to three bounces on the ground). The processor never
// touches a live particle again; a dead one just collapses off-screen.
//
// One ParticleField is one draw call of one look:
//   solid    lit little cubes (crumbs, gems, splinters, shards)
//   spark    additive streaks stretched along their motion
//   glow     additive soft dots (embers, fairy dust)
//   soft     alpha-blended puffs that grow and fade (dust, smoke)
//   confetti flat fluttering paper bits
import * as THREE from '../../vendor/three.module.min.js';

// Fill in P (reset it with particle()), then call field.emit(). One shared object, so emitting allocates nothing.
export const P = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 1,
  r: 1,
  g: 1,
  b: 1,
  size: 0.3,
  gravity: 30,
  drag: 0,
  bounce: 0,
  ground: 0,
  spin: 6,
  sx: 1,
  sy: 1,
  delay: 0,
};

// Resets P to defaults and returns it.
export function particle() {
  P.vx = P.vy = P.vz = 0;
  P.life = 1;
  P.r = P.g = P.b = 1;
  P.size = 0.3;
  P.gravity = 30;
  P.drag = 0;
  P.bounce = 0;
  P.ground = 0;
  P.spin = 6;
  P.sx = P.sy = 1;
  P.delay = 0;
  return P;
}

const COMMON = /* glsl */ `
uniform float uTime;
attribute vec4 aA; // x y z t0
attribute vec4 aB; // vx vy vz life
attribute vec4 aC; // r g b size
attribute vec4 aD; // gravity drag bounce ground
attribute vec4 aE; // seed spin sx sy
varying vec3 vColor;
varying vec2 vUv;
varying float vAge;
varying float vSeed;

// Where the particle is at age t. Writes its velocity too, and whether it has come to rest.
vec3 motion(float t, out vec3 vel, out float rested) {
  vec3 p = aA.xyz;
  vec3 v = aB.xyz;
  float g = aD.x;
  float k = aD.y;
  float e = aD.z;
  float gy = aD.w;
  rested = 0.0;
  if (e > 0.0) {
    for (int i = 0; i < 3; i++) {
      float h = p.y - gy;
      float disc = v.y * v.y + 2.0 * g * h;
      float th = (v.y + sqrt(max(disc, 0.0))) / max(g, 0.001);
      if (t < th) break;
      p += v * th;
      p.y -= 0.5 * g * th * th;
      v.y = -(v.y - g * th) * e;
      v.xz *= 0.55;
      t -= th;
      if (v.y < 2.0) {
        rested = 1.0;
        break;
      }
    }
    if (rested > 0.5) {
      vel = vec3(0.0);
      return vec3(p.x, gy, p.z);
    }
    vel = v + vec3(0.0, -g * t, 0.0);
    vec3 q = p + v * t + vec3(0.0, -0.5 * g * t * t, 0.0);
    q.y = max(q.y, gy);
    return q;
  }
  if (k > 0.0) {
    vec3 gv = vec3(0.0, -g, 0.0);
    float ek = exp(-k * t);
    vel = gv / k + (v - gv / k) * ek;
    return p + gv / k * t + (v - gv / k) * (1.0 - ek) / k;
  }
  vel = v + vec3(0.0, -g * t, 0.0);
  return p + v * t + vec3(0.0, -0.5 * g * t * t, 0.0);
}

vec3 rotateAxis(vec3 p, vec3 axis, float a) {
  float c = cos(a);
  float s = sin(a);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}
`;

const VERTEX = /* glsl */ `
${COMMON}
#include <fog_pars_vertex>
varying vec3 vNormalW;
varying vec3 vLocal;
void main() {
  float age = uTime - aA.w;
  float life = aB.w;
  vAge = age / life;
  vSeed = aE.x;
  vColor = aC.rgb;
  vUv = position.xy;
  if (age < 0.0 || age > life) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 vel;
  float rested;
  vec3 p = motion(age, vel, rested);
  float size = aC.w;
  vec4 mv;
#if defined(KIND_SOLID) || defined(KIND_CONFETTI)
  float s = size * smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(life * 0.72, life, age));
  vec3 axis = normalize(vec3(sin(aE.x * 91.7), cos(aE.x * 47.3), sin(aE.x * 13.1 + 1.0)));
  float spinT = rested > 0.5 ? min(age, 0.6) : age;
  float ang = aE.y * spinT + aE.x * 6.28;
  vec3 local = position * vec3(aE.z, aE.w, aE.z);
  #ifdef KIND_CONFETTI
    p.x += sin(age * 5.0 + aE.x * 20.0) * 0.5 * min(1.0, age);
    p.z += cos(age * 4.0 + aE.x * 13.0) * 0.5 * min(1.0, age);
  #endif
  vLocal = position;
  vec3 world = p + rotateAxis(local * s, axis, ang);
  vNormalW = rotateAxis(normal, axis, ang);
  mv = viewMatrix * vec4(world, 1.0);
#elif defined(KIND_SPARK)
  float s = size * (1.0 - smoothstep(life * 0.5, life, age));
  mv = viewMatrix * vec4(p, 1.0);
  vec3 dv = (viewMatrix * vec4(vel, 0.0)).xyz;
  float speed = length(dv.xy);
  vec2 along = speed > 0.001 ? dv.xy / speed : vec2(1.0, 0.0);
  vec2 side = vec2(-along.y, along.x);
  float len = s + speed * 0.035 * aE.z;
  mv.xy += along * position.x * len + side * position.y * s;
#elif defined(KIND_SOFT)
  float grow = 0.55 + 1.1 * sqrt(age / life);
  float s = size * grow * aE.z;
  mv = viewMatrix * vec4(p, 1.0);
  float rot = aE.x * 6.28 + age * aE.y * 0.2;
  vec2 q = vec2(position.x * cos(rot) - position.y * sin(rot), position.x * sin(rot) + position.y * cos(rot));
  mv.xy += q * s;
#else
  float s = size * (1.0 - smoothstep(life * 0.6, life, age)) * smoothstep(0.0, 0.04, age);
  mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * s;
#endif
  vec4 mvPosition = mv;
  gl_Position = projectionMatrix * mv;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uSun;
uniform float uOpacity;
varying vec3 vColor;
varying vec2 vUv;
varying float vAge;
varying float vSeed;
varying vec3 vNormalW;
varying vec3 vLocal;
#include <common>
#include <fog_pars_fragment>
void main() {
#if defined(KIND_SOLID) || defined(KIND_CONFETTI)
  vec3 n = normalize(vNormalW);
  #ifdef KIND_CONFETTI
    n = gl_FrontFacing ? n : -n;
  #endif
  float sun = max(dot(n, uSun), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 col = vColor * (0.42 + 0.3 * sky + 0.55 * sun);
  #ifdef KIND_SOLID
    vec3 a = abs(vLocal);
    float m2 = a.x + a.y + a.z - max(a.x, max(a.y, a.z)) - min(a.x, min(a.y, a.z));
    col *= 1.0 - 0.22 * smoothstep(0.36, 0.5, m2);
  #endif
  gl_FragColor = vec4(col, 1.0);
#elif defined(KIND_SPARK)
  float r = length(vUv * vec2(1.0, 2.0));
  float a = pow(max(0.0, 1.0 - r), 1.5);
  gl_FragColor = vec4(vColor * a * 1.6 * uOpacity, 1.0);
#elif defined(KIND_SOFT)
  vec2 q = vUv * 2.0;
  float ang = atan(q.y, q.x);
  float r = length(q) * (1.0 + 0.13 * sin(ang * 5.0 + vSeed * 40.0) + 0.07 * sin(ang * 9.0 - vSeed * 17.0));
  float a = smoothstep(1.0, 0.55, r) * (1.0 - smoothstep(0.45, 1.0, vAge)) * smoothstep(0.0, 0.06, vAge) * uOpacity;
  if (a < 0.01) discard;
  float lit = 0.82 + 0.25 * q.y;
  gl_FragColor = vec4(vColor * lit, a);
#else
  float r = length(vUv * 2.0);
  float flick = 0.75 + 0.25 * sin(uTime * 30.0 + vSeed * 50.0);
  float a = pow(max(0.0, 1.0 - r), 2.0) * flick;
  gl_FragColor = vec4(vColor * a * 1.5 * uOpacity, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function quad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

export class ParticleField {
  constructor(scene, { kind, capacity, sun, opacity = 1 }) {
    this.capacity = capacity;
    this.cursor = 0;
    this.live = 0;
    this.time = 0;
    this.lastBirth = -Infinity;
    this.longestLife = 0;
    const base = kind === 'solid' ? new THREE.BoxGeometry(1, 1, 1) : quad();
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('normal', base.getAttribute('normal'));
    this.attrs = {};
    for (const name of ['aA', 'aB', 'aC', 'aD', 'aE']) {
      const arr = new Float32Array(capacity * 4);
      const attr = new THREE.InstancedBufferAttribute(arr, 4);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, attr);
      this.attrs[name] = attr;
    }
    // Everything starts long dead.
    const a = this.attrs.aA.array;
    for (let i = 0; i < capacity; i++) a[i * 4 + 3] = -1e6;
    const b = this.attrs.aB.array;
    for (let i = 0; i < capacity; i++) b[i * 4 + 3] = 0.001;
    geo.instanceCount = capacity;
    const additive = kind === 'spark' || kind === 'glow';
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: { [`KIND_${kind.toUpperCase()}`]: '' },
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uSun: { value: sun || new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, uOpacity: { value: opacity } }]),
      fog: true,
      transparent: kind !== 'solid' && kind !== 'confetti',
      depthWrite: kind === 'solid' || kind === 'confetti',
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: kind === 'confetti' ? THREE.DoubleSide : THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = kind === 'soft' ? 2 : additive ? 3 : 0;
    scene.add(this.mesh);
    this.pending = 0;
    this.pendingFrom = 0;
  }

  // Births one particle from P, overwriting the oldest when the field is full.
  emit() {
    const i = this.cursor;
    if (P.bounce > 0 && P.y < P.ground + 0.05) P.y = P.ground + 0.05;
    const t0 = this.time + P.delay;
    const o = i * 4;
    const A = this.attrs.aA.array;
    const B = this.attrs.aB.array;
    const C = this.attrs.aC.array;
    const D = this.attrs.aD.array;
    const E = this.attrs.aE.array;
    A[o] = P.x;
    A[o + 1] = P.y;
    A[o + 2] = P.z;
    A[o + 3] = t0;
    B[o] = P.vx;
    B[o + 1] = P.vy;
    B[o + 2] = P.vz;
    B[o + 3] = P.life;
    C[o] = P.r;
    C[o + 1] = P.g;
    C[o + 2] = P.b;
    C[o + 3] = P.size;
    D[o] = P.gravity;
    D[o + 1] = P.drag;
    D[o + 2] = P.bounce;
    D[o + 3] = P.ground;
    E[o] = Math.random();
    E[o + 1] = P.spin;
    E[o + 2] = P.sx;
    E[o + 3] = P.sy;
    if (this.pending === 0) this.pendingFrom = i;
    this.pending++;
    this.cursor = (i + 1) % this.capacity;
    this.lastBirth = Math.max(this.lastBirth, t0);
    this.longestLife = Math.max(this.longestLife, P.life);
    return true;
  }

  // Advances the field's clock and uploads only what was written this frame.
  update(time) {
    this.time = time;
    this.material.uniforms.uTime.value = time;
    // Nothing alive: skip drawing entirely.
    this.mesh.visible = time - this.lastBirth < this.longestLife + 0.1;
    if (!this.pending) return;
    const cap = this.capacity;
    const from = this.pendingFrom;
    const n = Math.min(this.pending, cap);
    for (const attr of Object.values(this.attrs)) {
      attr.clearUpdateRanges();
      if (n >= cap) attr.addUpdateRange(0, cap * 4);
      else if (from + n <= cap) attr.addUpdateRange(from * 4, n * 4);
      else {
        attr.addUpdateRange(from * 4, (cap - from) * 4);
        attr.addUpdateRange(0, (from + n - cap) * 4);
      }
      attr.needsUpdate = true;
    }
    this.pending = 0;
  }

  // Kills every particle (rebuild).
  clear() {
    const a = this.attrs.aA.array;
    for (let i = 0; i < this.capacity; i++) a[i * 4 + 3] = -1e6;
    this.attrs.aA.clearUpdateRanges();
    this.attrs.aA.needsUpdate = true;
    this.pending = 0;
    this.lastBirth = -Infinity;
  }
}
