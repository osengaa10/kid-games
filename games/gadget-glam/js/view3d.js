// Turning a case around in 3D, as plain math (no DOM).
//
// A case is a flat slab. Seen straight on (no perspective), a flat plane turned by any angle is
// just stretched and slanted on screen: a 2D transform the canvas can draw directly. So the slab
// is drawn as its back face, its edge (a stack of slices), then its front face, each plane with
// its own transform.
//
// Axes: x right, y down, z toward the viewer. yaw turns around the up-down axis (spinning on a
// turntable), pitch tilts the top away. The front face sits at z = +depth/2.

// The transform for the plane at depth z: a point (x, y) on it (relative to the slab's middle)
// lands at (a x + c y + e, b x + d y + f), ready for canvas transform(a, b, c, d, e, f).
export function faceMatrix(yaw, pitch, z) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [cy, 0, sy * sp, cp, sy * cp * z, -sp * z];
}

// How much the front faces the viewer: 1 straight on, 0 edge on, below 0 when showing its back.
export const facing = (yaw, pitch) => Math.cos(yaw) * Math.cos(pitch);

// Which way (on screen, per unit of depth) the slab's thickness runs: the edge is drawn along it.
export const depthDir = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch)];

// The point on a plane that lands at screen (X, Y): for tapping a turned case. Null when the
// plane is edge on.
export function unproject([a, b, c, d, e, f], X, Y) {
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-6) return null;
  const x = X - e;
  const y = Y - f;
  return [(d * x - c * y) / det, (a * y - b * x) / det];
}
