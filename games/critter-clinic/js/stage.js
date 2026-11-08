// One full-screen canvas shared by the waiting room and the exam room. Sharp on the iPad's screen
// (device pixels, capped at 2×), and it knows the safe-area insets so nothing hides under the
// rounded corners or the home bar.
export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.probe = document.createElement('div');
    this.probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.append(this.probe);
    this.resize();
  }

  resize() {
    const dpr = (this.dpr = Math.min(2, window.devicePixelRatio || 1));
    const w = (this.w = window.innerWidth);
    const h = (this.h = window.innerHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const cs = getComputedStyle(this.probe);
    this.inset = {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0,
    };
  }
}
