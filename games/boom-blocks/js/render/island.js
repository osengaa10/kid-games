// The playground: a square grassy island like a toy board, with blocky dirt cliffs, a sparkling
// sea around it, flowers, and far-off little islands for depth. None of it breaks.
import * as THREE from '../../vendor/three.module.min.js';
import { ISLAND, RIM } from '../physics/world.js';

const GRASS = [0x6fd35b, 0x63c853];
const DIRT = [0xb98552, 0xa5733f, 0x8d6236];
const SEA_Y = -3;

const WATER_VERT = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uEdge;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  float d = max(abs(p.x), abs(p.y)) - uEdge;
  vec3 deep = vec3(0.08, 0.5, 0.86);
  vec3 shallow = vec3(0.25, 0.82, 0.95);
  vec3 col = mix(shallow, deep, smoothstep(0.0, 40.0, d));
  // Sparkles: two moving wave patterns, bright where they peak together.
  float w = sin(p.x * 0.35 + uTime * 1.3) * sin(p.y * 0.31 - uTime * 1.1) + sin((p.x + p.y) * 0.21 + uTime * 0.8);
  col += vec3(0.9) * smoothstep(1.55, 1.9, w) * 0.5;
  // White foam hugging the cliffs.
  float foam = smoothstep(4.0, 0.5, d) * (0.6 + 0.4 * sin(d * 2.5 - uTime * 3.0));
  col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createIsland(scene) {
  const group = new THREE.Group();
  const H = ISLAND;
  const TILE = 4;

  // Grass top: checkerboard tiles, as one mesh with vertex colors.
  {
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    for (let x = -H; x < H; x += TILE)
      for (let z = -H; z < H; z += TILE) {
        c.setHex(GRASS[(Math.floor(x / TILE) + Math.floor(z / TILE)) & 1]);
        const shade = 0.96 + Math.random() * 0.08;
        pos.push(x, 0, z, x, 0, z + TILE, x + TILE, 0, z + TILE, x, 0, z, x + TILE, 0, z + TILE, x + TILE, 0, z);
        for (let k = 0; k < 6; k++) col.push(c.r * shade, c.g * shade, c.b * shade);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    m.receiveShadow = true;
    group.add(m);
  }

  // Cliffs: layered dirt bands down the four sides, with blocky bumps.
  {
    const mat = new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true });
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    const band = 2.5;
    for (let side = 0; side < 4; side++)
      for (let u = -H; u < H; u += 2)
        for (let b = 0; b < 4; b++) {
          const y0 = -band * (b + 1);
          const y1 = -band * b;
          const bump = b === 0 ? 0 : (Math.sin(u * 1.7 + side * 3 + b) > 0.3 ? 0.5 : 0);
          const o = H + bump;
          const quad = [
            [u, y0],
            [u + 2, y0],
            [u + 2, y1],
            [u, y1],
          ].map(([a, y]) => (side === 0 ? [a, y, o] : side === 1 ? [o, y, -a] : side === 2 ? [-a, y, -o] : [-o, y, a]));
          const [p0, p1, p2, p3] = quad;
          pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
          c.setHex(b === 0 ? 0x58b84a : DIRT[(b + Math.floor(u / 2)) % 3]);
          for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
        }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    group.add(m);
  }

  // The rim: chunky rainbow bumper segments all the way round the edge.
  {
    const colors = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0x5b6cff, 0xb15cff];
    const seg = 4;
    const boxes = [];
    for (let u = -H; u < H; u += seg) {
      const k = Math.floor((u + H) / seg);
      boxes.push([u + seg / 2, H - RIM.width / 2, seg, RIM.width, k]);
      boxes.push([u + seg / 2, -H + RIM.width / 2, seg, RIM.width, k + 3]);
      boxes.push([H - RIM.width / 2, u + seg / 2, RIM.width, seg, k + 1]);
      boxes.push([-H + RIM.width / 2, u + seg / 2, RIM.width, seg, k + 5]);
    }
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.45 }), boxes.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    boxes.forEach(([x, z, sx, sz, k], i) => {
      m.makeScale(sx - 0.08, RIM.height, sz - 0.08).setPosition(x, RIM.height / 2, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(colors[k % colors.length]));
    });
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // The sea.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uEdge: { value: H } }]),
      fog: true,
    }),
  );
  water.position.y = SEA_Y;
  group.add(water);

  // Flowers and pebbles dotted about the edges of the grass (instanced, no shadows).
  {
    const spots = [];
    for (let i = 0; i < 160; i++) {
      const edge = Math.random() < 0.5;
      let x = (Math.random() * 2 - 1) * (H - 2);
      let z = (Math.random() * 2 - 1) * (H - 2);
      if (edge) {
        if (Math.random() < 0.5) x = Math.sign(x || 1) * (H - 1 - Math.random() * 8);
        else z = Math.sign(z || 1) * (H - 1 - Math.random() * 8);
      } else if (Math.hypot(x, z) < 30) continue;
      spots.push([x, z]);
    }
    const colors = [0xff5fa2, 0xffd23f, 0xffffff, 0xb15cff, 0xff7b4f];
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), spots.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach(([x, z], i) => {
      m.makeTranslation(x, 0.3, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(colors[i % colors.length]));
    });
    group.add(mesh);
  }

  // Far-off little islands with blocky hills.
  {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    const boxes = [];
    const isles = [
      [-150, -120, 22],
      [170, -90, 18],
      [-90, -210, 26],
      [120, -200, 20],
      [230, 40, 16],
      [-230, 30, 18],
    ];
    for (const [x, z, s] of isles) {
      boxes.push([x, SEA_Y + 1, z, s * 2, 3, s * 2, 0x63c853]);
      for (let k = 0; k < 5; k++) {
        const h = 4 + Math.random() * s * 0.8;
        const w = s * (0.4 + Math.random() * 0.5);
        boxes.push([x + (Math.random() - 0.5) * s, SEA_Y + 2 + h / 2, z + (Math.random() - 0.5) * s, w, h, w, k % 2 ? 0x55b649 : 0x7ad866]);
      }
    }
    const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    boxes.forEach(([x, y, z, sx, sy, sz, color], i) => {
      m.makeScale(sx, sy, sz).setPosition(x, y, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(color));
    });
    group.add(mesh);
  }

  scene.add(group);
  return {
    group,
    update(t) {
      water.material.uniforms.uTime.value = t;
    },
  };
}

export { SEA_Y };
