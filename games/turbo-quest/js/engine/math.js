// Small math helpers shared by the game and the renderer. No DOM.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

// Moves v toward target by at most step.
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

// Frame-rate independent easing toward a target: rate is "how many times per second" it closes the gap.
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

// Smooth noise in -1..1 for camera shake (a sum of sines, so it needs no state).
export const wobble = (t, seed = 0) => (Math.sin(t * 1.0 + seed) * 0.5 + Math.sin(t * 2.3 + seed * 1.7) * 0.3 + Math.sin(t * 4.1 + seed * 2.9) * 0.2);
