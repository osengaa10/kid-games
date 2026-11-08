// Raw fingers (and the mouse, for testing on a computer) → handler.down/move/up(id, x, y).
// Touches are tracked by identifier for real multitouch. iOS zooming, long-press menus and
// double-tap are blocked. Anything inside a `.dom-ui` element (the tuning panel) is left alone.

export function attachPointers(handler) {
  const opts = { passive: false };
  const skip = (e) => e.target && e.target.closest && e.target.closest('.dom-ui');

  window.addEventListener('touchstart', (e) => {
    if (skip(e)) return;
    e.preventDefault();
    for (const t of e.changedTouches) handler.down(t.identifier, t.clientX, t.clientY);
  }, opts);
  window.addEventListener('touchmove', (e) => {
    if (skip(e)) return;
    e.preventDefault();
    for (const t of e.changedTouches) handler.move(t.identifier, t.clientX, t.clientY);
  }, opts);
  const end = (e) => {
    if (skip(e)) return;
    e.preventDefault();
    for (const t of e.changedTouches) handler.up(t.identifier, t.clientX, t.clientY);
  };
  window.addEventListener('touchend', end, opts);
  window.addEventListener('touchcancel', end, opts);

  let mouseDown = false;
  window.addEventListener('mousedown', (e) => {
    if (skip(e)) return;
    mouseDown = true;
    handler.down('mouse', e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', (e) => {
    if (mouseDown) handler.move('mouse', e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', (e) => {
    if (!mouseDown) return;
    mouseDown = false;
    handler.up('mouse', e.clientX, e.clientY);
  });

  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dblclick']) {
    document.addEventListener(type, (e) => {
      if (!skip(e)) e.preventDefault();
    }, opts);
  }
  // Losing focus (a notification, the app switcher) lets go of everything: no stuck buttons.
  window.addEventListener('blur', () => {
    mouseDown = false;
    handler.cancelAll();
  });
}
