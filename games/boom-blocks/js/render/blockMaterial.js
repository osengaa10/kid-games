// The toy-block look, done in the shader so the blocks stay plain flat squares and cubes:
//   bevel     edges darken a touch and their normals bend outward, so each block catches light
//             like a chunky plastic toy
//   build     (standing blocks) each block drops in from above with a bounce when a scene builds
//   wobble    (standing blocks) blocks jiggle as a shockwave ring rolls past them
//   heat      (standing blocks) a laser-scorched block glows orange and cools down by itself
// Standing blocks are drawn as their visible sides only (BB_FACES): one instanced square per side,
// which the shader turns to face its direction and moves to its block's cell. Loose blocks are
// cubes that can rotate (BB_MASK): sides pressed against another block of the same piece are
// squashed to nothing, so the bevel works from each instance's own axes.
import * as THREE from '../../vendor/three.module.min.js';
import { BLOCK, OX, OZ } from '../core/grid.js';

// The offsets below are in world units; blocks are BLOCK across, so they're divided by it.
const INV = (1 / BLOCK).toFixed(3);
const f = (v) => v.toFixed(4);

export const WAVES = 4;

// Uniforms shared by every block material, updated once a frame.
export const blockUniforms = {
  uTime: { value: 0 },
  uBuildT: { value: 1e6 },
  uWaves: { value: Array.from({ length: WAVES }, () => new THREE.Vector4(0, 0, -100, 0)) },
};

// Declarations for both the colour and the shadow (depth) shaders.
const VERT_DECL = /* glsl */ `
uniform float uTime;
#ifdef BB_STATIC
  attribute vec4 aFace;
  attribute float aBuild;
  uniform float uBuildT;
  uniform vec4 uWaves[${WAVES}];
  // A side's direction (0-5: +x, -x, +y, -y, +z, -z) as its normal n and two edge directions with
  // t1 × t2 = n, so the square stays counter-clockwise seen from outside.
  void bbBasis(float d, out vec3 n, out vec3 t1, out vec3 t2) {
    if (d < 0.5) { n = vec3(1.0, 0.0, 0.0); t1 = vec3(0.0, 0.0, -1.0); t2 = vec3(0.0, 1.0, 0.0); }
    else if (d < 1.5) { n = vec3(-1.0, 0.0, 0.0); t1 = vec3(0.0, 0.0, 1.0); t2 = vec3(0.0, 1.0, 0.0); }
    else if (d < 2.5) { n = vec3(0.0, 1.0, 0.0); t1 = vec3(1.0, 0.0, 0.0); t2 = vec3(0.0, 0.0, -1.0); }
    else if (d < 3.5) { n = vec3(0.0, -1.0, 0.0); t1 = vec3(1.0, 0.0, 0.0); t2 = vec3(0.0, 0.0, 1.0); }
    else if (d < 4.5) { n = vec3(0.0, 0.0, 1.0); t1 = vec3(1.0, 0.0, 0.0); t2 = vec3(0.0, 1.0, 0.0); }
    else { n = vec3(0.0, 0.0, -1.0); t1 = vec3(-1.0, 0.0, 0.0); t2 = vec3(0.0, 1.0, 0.0); }
  }
  // Where the side sits on a unit cube centred on 0.
  vec3 bbCorner(vec3 n, vec3 t1, vec3 t2) {
    return n * 0.5 + t1 * position.x + t2 * position.y;
  }
#endif
#ifdef BB_MASK
  attribute float aMask;
#endif
`;

// Colour shader only: what the fragment shader needs for the bevel and the glow.
const VERT_PARS = /* glsl */ `
${VERT_DECL}
varying vec3 bbLocal;
varying vec3 bbNormal;
#ifdef BB_STATIC
  attribute float aHeat;
  varying float bbHeat;
#else
  varying vec3 bbAx;
  varying vec3 bbAy;
  varying vec3 bbAz;
#endif
`;

// Builds `transformed` (the vertex): for standing blocks, the side's corner on the unit cube, moved
// by the build drop-in and the shockwave wobble, then placed at its cell in the world (the mesh
// itself sits at the origin); for loose blocks, hidden sides are squashed to the block's centre.
const VERT_MOVE = /* glsl */ `
#ifdef BB_STATIC
{
  vec3 bn, bt1, bt2;
  bbBasis(aFace.w, bn, bt1, bt2);
  transformed = bbCorner(bn, bt1, bt2);
  vec3 org = vec3(${f(OX)} + (aFace.x + 0.5) * ${f(BLOCK)}, (aFace.y + 0.5) * ${f(BLOCK)}, ${f(OZ)} + (aFace.z + 0.5) * ${f(BLOCK)});
  float p = clamp((uBuildT - aBuild) / 0.42, 0.0, 1.0);
  if (p < 1.0) {
    float h = fract(sin(dot(org, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    // Back-out easing: overshoots a little and settles, like a block plonked into place.
    float q = p - 1.0;
    float e = 1.0 + 2.2 * q * q * q + 1.2 * q * q;
    float a = (1.0 - p) * (2.5 + h * 3.0);
    float c = cos(a);
    float s = sin(a);
    transformed = vec3(transformed.x * c - transformed.z * s, transformed.y, transformed.x * s + transformed.z * c);
    transformed *= mix(0.15, 1.0, clamp(e, 0.0, 1.2));
    transformed.y += (1.0 - e) * (18.0 + h * 14.0) * ${INV};
    if (p <= 0.0) transformed *= 0.0;
  }
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 w = uWaves[i];
    float age = uTime - w.z;
    if (age < 0.0 || age > 1.6) continue;
    vec2 d2 = org.xz - w.xy;
    float d = length(d2);
    float front = age * 30.0;
    float k = exp(-pow((d - front) / 3.0, 2.0)) * w.w * exp(-age * 2.2) * (1.0 + org.y * 0.03);
    transformed.y += k * 0.55 * ${INV};
    if (d > 0.01) transformed.xz += d2 / d * k * 0.25 * ${INV};
    transformed *= 1.0 + k * 0.1;
  }
  transformed = org + transformed * ${f(BLOCK)};
}
#endif
#ifdef BB_MASK
{
  float bit = abs(normal.x) > 0.5 ? (normal.x > 0.0 ? 1.0 : 2.0) : abs(normal.y) > 0.5 ? (normal.y > 0.0 ? 4.0 : 8.0) : (normal.z > 0.0 ? 16.0 : 32.0);
  // aMask is a whole number and bit a power of two, so the division is exact.
  if (mod(floor(aMask / bit), 2.0) > 0.5) transformed = vec3(0.0);
}
#endif
`;

// Normals and the bevel's inputs (runs before VERT_MOVE in three's vertex shader).
const VERT_MAIN = /* glsl */ `
#ifdef BB_STATIC
{
  vec3 bn, bt1, bt2;
  bbBasis(aFace.w, bn, bt1, bt2);
  objectNormal = bn;
  bbNormal = bn;
  bbLocal = bbCorner(bn, bt1, bt2);
}
bbHeat = aHeat > 0.0 ? exp(-max(uTime - aHeat, 0.0) * 1.1) : 0.0;
#else
bbLocal = position;
bbNormal = normal;
{
  mat3 bm = normalMatrix * mat3(instanceMatrix);
  bbAx = normalize(bm[0]);
  bbAy = normalize(bm[1]);
  bbAz = normalize(bm[2]);
}
#endif
`;

const FRAG_PARS = /* glsl */ `
varying vec3 bbLocal;
varying vec3 bbNormal;
#ifdef BB_STATIC
  varying float bbHeat;
#else
  varying vec3 bbAx;
  varying vec3 bbAy;
  varying vec3 bbAz;
#endif
`;

function defines(shader, isStatic) {
  shader.defines = { ...(shader.defines || {}), [isStatic ? 'BB_STATIC' : 'BB_MASK']: '' };
}

function patch(shader, { isStatic }) {
  Object.assign(shader.uniforms, blockUniforms);
  defines(shader, isStatic);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_MOVE}`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${VERT_MAIN}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      vec3 bbA = abs(bbLocal);
      vec3 bbPush = sign(bbLocal) * smoothstep(vec3(0.5 - 0.11), vec3(0.5), bbA) * (1.0 - abs(bbNormal));
      float bbEdge = length(bbPush);
      diffuseColor.rgb *= 1.0 - 0.2 * bbEdge;
      diffuseColor.rgb += 0.06 * bbEdge * step(0.5, bbNormal.y + bbPush.y);
      #ifdef BB_STATIC
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.55, 0.2), bbHeat * 0.6);
      #endif`,
    )
    .replace(
      '#include <normal_fragment_begin>',
      /* glsl */ `#include <normal_fragment_begin>
      {
        vec3 nl = normalize(bbNormal + bbPush * 0.85);
        #ifdef BB_STATIC
          // Standing blocks are never turned, so their axes are the world's.
          normal = normalize(mat3(viewMatrix) * nl);
        #else
          normal = normalize(bbAx * nl.x + bbAy * nl.y + bbAz * nl.z);
        #endif
      }`,
    )
    .replace(
      '#include <emissivemap_fragment>',
      /* glsl */ `#include <emissivemap_fragment>
      #ifdef BB_STATIC
        totalEmissiveRadiance += vec3(1.0, 0.38, 0.08) * bbHeat * 1.6;
      #endif`,
    );
}

// The shared toy-plastic material. isStatic: standing blocks (sides, build, wobble, heat); colors
// come per side as a vertex color. Loose blocks take theirs from the instance color.
export function blockMaterial({ isStatic }) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, envMapIntensity: 0.9, vertexColors: isStatic });
  m.onBeforeCompile = (shader) => patch(shader, { isStatic });
  m.customProgramCacheKey = () => (isStatic ? 'bb-static' : 'bb-debris');
  return m;
}

// Shadows: the same squares in the same places (standing blocks follow the build drop-in and the
// wobble too), and loose blocks' hidden sides squashed the same way.
export function blockDepthMaterial({ isStatic }) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, blockUniforms);
    defines(shader, isStatic);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_MOVE}`);
  };
  m.customProgramCacheKey = () => (isStatic ? 'bb-depth-static' : 'bb-depth-debris');
  return m;
}
