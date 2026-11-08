// ?icon=512 draws the app icon (for icons/ when added to an iPad's home screen from Safari):
// Biscuit's face on clinic teal with a stethoscope badge. Screenshot it, then scale with sips.
// (The Kid Games home screen uses an in-game screenshot instead; see the root README.)
import { PATIENTS } from './patients.js';
import { drawPortrait } from './patient-art.js';
import { ICONS } from './icons.js';

export function icon(S) {
  document.body.innerHTML = '';
  document.body.style.background = '#2bb3a3';
  const c = document.createElement('canvas');
  c.width = c.height = S;
  c.style.cssText = `width:${S}px;height:${S}px;display:block`;
  document.body.append(c);
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(S * 0.4, S * 0.35, S * 0.1, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, '#5fd8c9');
  bg.addColorStop(1, '#1f9c8e');
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  // soft plus signs in the background
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (const [x, y, s] of [[0.14, 0.16, 0.06], [0.86, 0.2, 0.05], [0.1, 0.82, 0.05]]) {
    g.fillRect(S * (x - s), S * (y - s * 0.33), S * s * 2, S * s * 0.66);
    g.fillRect(S * (x - s * 0.33), S * (y - s), S * s * 0.66, S * s * 2);
  }
  drawPortrait(g, PATIENTS.puppy, S * 0.47, S * 0.5, S * 0.88, 0, 'happy');
  // the stethoscope badge
  const bx = S * 0.78;
  const by = S * 0.78;
  const br = S * 0.17;
  g.beginPath();
  g.arc(bx, by, br, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = S * 0.018;
  g.strokeStyle = '#ffd1dc';
  g.stroke();
  const img = new Image();
  img.onload = () => {
    g.drawImage(img, bx - br * 0.72, by - br * 0.72, br * 1.44, br * 1.44);
    document.body.dataset.ready = '1';
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ICONS.heart.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" '))}`;
}
