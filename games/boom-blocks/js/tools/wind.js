// Steering loose physics pieces round, in and up: what the tornado and the UFO's beam do to the
// chunks they catch. (Loose single blocks get the same from BlockSpray.vortex.) Nearest first,
// at most `max` of them, since the physics pays for every one that moves; rubble lying still near
// the middle is woken, a few a frame; big heavy sections hardly budge.
//   axisAt(y) → [x, z]: where the middle is at that height (a tornado leans)
//   want(r, y, ux, uz) → { x, y, z }: the speed to steer a piece toward, given its distance r
//     from the middle and the direction (ux, uz) out from it
//   rate: how quickly (per second) a piece right at the middle reaches that speed
// Returns the pieces it steered.
export function steerPieces(game, axisAt, reach, { top, max = 36, rate = 5, want, dt, wake = 5 }) {
  const { pieces } = game;
  const near = [];
  for (const p of pieces.list) {
    if (p.dead) continue;
    const t = p.body.translation();
    if (t.y > top + 6) continue;
    const [ax, az] = axisAt(t.y);
    const r = Math.hypot(t.x - ax, t.z - az);
    if (r < reach) near.push([r, p, t, ax, az]);
  }
  near.sort((a, b) => a[0] - b[0]);
  let thawed = 0;
  const caught = [];
  for (const [r, p, t, ax, az] of near.slice(0, max)) {
    if (p.frozen) {
      if (r > wake || thawed >= 6) continue;
      pieces.thaw(p);
      thawed++;
    }
    const ux = (t.x - ax) / (r || 1);
    const uz = (t.z - az) / (r || 1);
    const w = want(r, t.y, ux, uz);
    const a = Math.min(1, dt * rate * (1 - r / reach) * Math.min(1, 30 / p.mass));
    if (a < 0.002) continue;
    const v = p.body.linvel();
    p.body.setLinvel({ x: v.x + (w.x - v.x) * a, y: v.y + (w.y - v.y) * a, z: v.z + (w.z - v.z) * a }, true);
    if (Math.random() < 0.08) {
      const s = p.body.angvel();
      p.body.setAngvel({ x: s.x + (Math.random() - 0.5) * 6, y: s.y + (Math.random() - 0.5) * 6, z: s.z + (Math.random() - 0.5) * 6 }, true);
    }
    caught.push(p);
  }
  return caught;
}
