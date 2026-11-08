// ?lineup: every patient side by side in a few poses and moods, for checking the art (and ?spots
// adds the tool spots and the hit-test outline). Not part of the game.
import { PATIENTS, ORDER } from './patients.js';
import { defaultPose, rig, hotspots, inside } from './rig.js';
import { drawPatient, faceFor } from './patient-art.js';
import { sickPose, restArm, AILMENT_IDS } from './sickness.js';

const ROWS = [
  { label: 'idle', pose: {}, mood: 'idle' },
  { label: 'happy, waving', pose: { arm: [0, 2.0], tilt: 0.12 }, mood: 'happy' },
  { label: 'nervous', pose: {}, mood: 'nervous' },
  { label: 'ahh, ears lifted, trunk up', pose: { earLift: [1, 1], trunk: 1 }, mood: 'ahh' },
  { label: 'ouch, mega kick', pose: { kick: [0.6, 2.2] }, mood: 'ouch' },
  { label: 'standing, squished', pose: { stand: 1, squish: 1 }, mood: 'surprised' },
  { label: 'just arrived, sick: cold / fever / tummy', pose: {}, mood: 'idle', sick: 1 },
  { label: 'half better', pose: {}, mood: 'idle', sick: 0.43 },
];

export function lineup(params) {
  document.body.innerHTML = '';
  const W = window.innerWidth;
  const H = window.innerHeight;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;background:#dff5ef`;
  document.body.append(c);
  const g = c.getContext('2d');
  const ids = params.get('only') ? params.get('only').split(',') : ORDER;
  const rows = params.has('row') ? [ROWS[Number(params.get('row'))]] : ROWS;
  const cw = W / ids.length;
  const ch = H / rows.length;
  const u = Math.min(cw / 8, ch / 11.5);
  const spots = params.has('spots');
  const draw = (t) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#dff5ef';
    g.fillRect(0, 0, W, H);
    rows.forEach((row, j) => {
      ids.forEach((id, i) => {
        const sp = PATIENTS[id];
        const pose = { ...defaultPose(), ...row.pose };
        const sick = row.sick ? { level: row.sick, ail: AILMENT_IDS[i % 3] } : null;
        if (sick) {
          sickPose(pose, sick.level);
          if (!pose.arm[0]) pose.arm = [restArm(sick.level, sick.ail), pose.arm[1]];
        }
        const x = cw * (i + 0.5);
        const y = ch * j + ch * (pose.stand ? 0.72 : 0.72);
        g.fillStyle = '#b5dccf';
        g.fillRect(x - 3.3 * u, y, 6.6 * u, 0.3 * u);
        drawPatient(g, sp, pose, x, y, u, t, { face: faceFor(row.mood), sick, bandage: j === 1 ? 'stars' : null, sticker: j === 1 ? { e: '⭐', x: -0.6 * sp.size, y: -1.2 * sp.size } : null });
        if (spots) {
          const r = rig(sp, pose);
          const hs = hotspots(sp, r);
          g.save();
          g.translate(x, y);
          g.scale(u, u);
          g.fillStyle = 'rgba(255,0,80,0.25)';
          for (let yy = -9; yy < 3; yy += 0.12) for (let xx = -4; xx < 4; xx += 0.12) if (inside(r, xx, yy)) g.fillRect(xx, yy, 0.05, 0.05);
          for (const [k, h] of Object.entries(hs)) {
            if (k === 'headTop') continue;
            g.beginPath();
            if (k === 'forehead') {
              g.moveTo(h.x0, h.y);
              g.lineTo(h.x1, h.y);
              g.lineWidth = 0.08;
              g.strokeStyle = '#0066ff';
              g.stroke();
            } else {
              g.arc(h.x, h.y, h.r, 0, Math.PI * 2);
              g.lineWidth = 0.06;
              g.strokeStyle = '#0066ff';
              g.stroke();
            }
          }
          g.restore();
        }
      });
      g.fillStyle = '#2a5a50';
      g.font = '14px system-ui';
      g.fillText(row.label, 8, ch * j + 18);
    });
  };
  const loop = (ms) => {
    draw(ms / 1000);
    if (!params.has('still')) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.body.dataset.ready = '1';
}
