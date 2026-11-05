// Turning the plain shape data in items.js into canvas paths.

export function partPath(p) {
  const path = new Path2D();
  if (p.rr) {
    const [x, y, w, h, r0] = p.rr;
    const r = Math.min(r0, w / 2, h / 2);
    path.moveTo(x + r, y);
    path.arcTo(x + w, y, x + w, y + h, r);
    path.arcTo(x + w, y + h, x, y + h, r);
    path.arcTo(x, y + h, x, y, r);
    path.arcTo(x, y, x + w, y, r);
    path.closePath();
  } else if (p.el) {
    const [cx, cy, rx, ry, rot = 0] = p.el;
    path.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  } else if (p.poly) {
    p.poly.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
  }
  return path;
}

// Several parts as one path. Every part winds the same way, so filling or clipping with it covers
// all of them, overlaps included.
export function unionPath(parts) {
  const path = new Path2D();
  for (const p of parts) path.addPath(partPath(p));
  return path;
}
