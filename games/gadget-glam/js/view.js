// Pinch to zoom and pan, as plain math (no DOM). A view is { scale, ox, oy }: screen px per item
// unit, and where item (0, 0) lands on screen. `fit` is the view that shows the whole case; zoom
// goes from 1× (fit) to MAX_ZOOM×, and the case can't be pushed off screen.

export const MAX_ZOOM = 4;

// Keep the case findable: its middle stays on screen. At 1× it snaps back to exactly the fit.
export function clampView(v, fit, rect, frame, maxZoom = MAX_ZOOM) {
  const scale = Math.min(fit.scale * maxZoom, Math.max(fit.scale, v.scale));
  if (scale <= fit.scale * 1.001) return { ...fit };
  const cx = v.ox + (frame.x + frame.w / 2) * scale;
  const cy = v.oy + (frame.y + frame.h / 2) * scale;
  const ncx = Math.min(rect.x + rect.w, Math.max(rect.x, cx));
  const ncy = Math.min(rect.y + rect.h, Math.max(rect.y, cy));
  return { scale, ox: v.ox + (ncx - cx), oy: v.oy + (ncy - cy) };
}

// Two fingers: `start` is the view when they came down, (m0, d0) their midpoint and spread then,
// (m1, d1) now. Whatever was under the fingers' midpoint stays under it.
export function pinchView(start, m0, d0, m1, d1, fit, rect, frame) {
  const want = start.scale * (d1 / Math.max(1, d0));
  const scale = Math.min(fit.scale * MAX_ZOOM, Math.max(fit.scale, want));
  const k = scale / start.scale;
  const v = { scale, ox: m1[0] - (m0[0] - start.ox) * k, oy: m1[1] - (m0[1] - start.oy) * k };
  return clampView(v, fit, rect, frame);
}

// Zoom by a factor about a point (the mouse wheel, a trackpad pinch).
export function zoomAt(v, p, factor, fit, rect, frame) {
  return pinchView(v, p, 1, p, factor, fit, rect, frame);
}

export const zoomOf = (v, fit) => v.scale / fit.scale;
