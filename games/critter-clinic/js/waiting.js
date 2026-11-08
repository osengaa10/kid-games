// The waiting room (the home screen): three sick patients on chairs, sniffling, shivering or
// holding a sore tummy (sickness.js). He taps one, it hops up and tells him what's wrong, and in it
// goes to the exam room. A patient whose check-up was left unfinished sits first, with a little
// clipboard beside its chair, looking as much better as the steps done so far have made it.
import { PATIENTS } from './patients.js';
import { rig, inside, defaultPose } from './rig.js';
import { drawPatient, faceFor } from './patient-art.js';
import { waitingLayout } from './layout.js';
import { bakeWaiting, drawFish } from './room.js';
import { drawHand } from './tool-art.js';
import { rrect } from './style.js';
import { Particles } from './effects.js';
import * as sound from './sound.js';
import { say, NARRATOR } from './speech.js';
import { Symptoms, sickPose, restArm, helloLine, SNEEZE_AT } from './sickness.js';

export class Waiting {
  constructor(stage, cb) {
    this.stage = stage;
    this.cb = cb;
    this.active = false;
    this.fx = new Particles();
    stage.canvas.addEventListener('pointerdown', (e) => this.active && this.down(e));
  }

  // ails: each patient's illness; levels: how sick each one is (1 = not seen yet).
  show(ids, visitId = null, ails = [], levels = []) {
    this.active = true;
    this.ids = ids;
    this.visitId = visitId;
    this.ails = ids.map((_, i) => ails[i] || null);
    this.levels = ids.map((_, i) => levels[i] ?? 1);
    this.symptoms = ids.map((_, i) => new Symptoms(this.ails[i]));
    this.picked = null;
    this.lastAct = performance.now() / 1000;
    this.spoke = 0;
    this.seed = ids.map((_, i) => ({ blink: 1 + i * 1.3, phase: i * 2.1 }));
    this.fx.clear();
    this.resize();
  }

  hide() {
    this.active = false;
  }

  resize() {
    const st = this.stage;
    this.W = waitingLayout(st.w, st.h, st.inset);
    this.bg = bakeWaiting(this.W, st.dpr);
  }

  down(e) {
    const now = performance.now() / 1000;
    this.lastAct = now;
    if (this.picked) return;
    const u = this.W.u;
    for (let i = this.ids.length - 1; i >= 0; i--) {
      const sp = PATIENTS[this.ids[i]];
      const ch = this.W.chairs[i];
      const r = rig(sp, defaultPose());
      if (inside(r, (e.clientX - ch.x) / u, (e.clientY - ch.y) / u)) {
        this.pick(i, now);
        return;
      }
    }
  }

  pick(i, now) {
    const id = this.ids[i];
    const sp = PATIENTS[id];
    this.picked = { i, t0: now };
    sound.pop();
    sound.hop();
    const ch = this.W.chairs[i];
    this.fx.sparkle(ch.x, ch.y - 4 * this.W.u, 16);
    say(id === this.visitId ? sp.back : helloLine(sp, this.ails[i]), { force: true, voice: sp.id, pitch: sp.pitch, rate: 1.0 });
    setTimeout(() => this.active && this.cb.onPick(id, this.ails[i]), id === this.visitId ? 1500 : 2600);
  }

  frame(now, dt) {
    if (!this.active) return;
    const st = this.stage;
    const g = st.ctx;
    const W = this.W;
    const u = W.u;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    drawFish(g, W, now);
    this.ids.forEach((id, i) => {
      const sp = PATIENTS[id];
      const ch = W.chairs[i];
      const sd = this.seed[i];
      const pose = defaultPose();
      const level = this.levels[i];
      const ail = this.ails[i];
      pose.breathe = Math.sin(now * 1.7 + sd.phase);
      pose.tilt = Math.sin(now * 0.7 + sd.phase) * 0.06;
      // swinging legs while they wait (less when they feel poorly)
      const swing = 0.25 * (1 - 0.7 * level);
      pose.kick = [Math.max(0, Math.sin(now * 2.2 + sd.phase)) * swing, Math.max(0, Math.sin(now * 2.2 + sd.phase + Math.PI)) * swing];
      sickPose(pose, level);
      pose.arm = [restArm(level, ail), 0];
      let y = ch.y;
      let mood = 'idle';
      const picked = this.picked?.i === i;
      if (picked) {
        const k = now - this.picked.t0;
        y -= Math.abs(Math.sin(k * 7)) * 0.8 * u * Math.max(0, 1 - k / 1.5);
        pose.arm = [pose.arm[0], 1.95 + Math.sin(k * 11) * 0.3];
      } else if (!this.picked) {
        // a sneeze, a shiver or a sore tummy now and then
        const ev = this.symptoms[i].update(now, level);
        if (ev === 'sneeze') {
          sound.sneeze();
          setTimeout(() => this.active && this.fx.poof(ch.x, ch.y - 3.6 * sp.size * u, 0.5 * u), SNEEZE_AT * 1000);
        } else if (ev === 'shiver') sound.shiver();
        else if (ev === 'tummy') sound.gurgle();
      }
      const sym = this.symptoms[i].anim(now);
      pose.dx += sym.dx;
      pose.headDy += sym.headDy;
      if (sym.mood && !picked) mood = sym.mood;
      const face = faceFor(mood);
      face.look = { x: Math.sin(now * 0.5 + sd.phase) * 0.6, y: 0.1 };
      if (now > sd.blink) sd.blink = now + 2.5 + Math.random() * 3;
      if (mood === 'idle' && sd.blink - now > 2.4 && sd.blink - now < 2.55) face.eyes = 'closed';
      if (id === this.visitId) this.clipboard(g, ch.x + 2.2 * u, W.floorY, u, now);
      drawPatient(g, sp, pose, ch.x, y, u, now, { face, sick: { level, ail } });
    });
    this.fx.update(dt);
    this.fx.draw(g);
    // nobody picked for a while: point at the first patient
    const idle = now - this.lastAct;
    if (!this.picked && idle > 7) {
      const ch = W.chairs[0];
      const k = (idle % 1.6) / 1.6;
      drawHand(g, ch.x + 0.3 * u, ch.y - 3.6 * u + Math.sin(k * Math.PI * 2) * 0.3 * u, 1.2 * u, k < 0.2 ? Math.sin((k / 0.2) * Math.PI) : 0);
      if (now - this.spoke > 15) {
        this.spoke = now;
        say("Who's next? Tap a patient!", { ...NARRATOR, force: true });
      }
    }
  }

  // A little clipboard leaning on the chair: "this one's check-up isn't finished".
  clipboard(g, x, floorY, u, now) {
    const w = 1.1 * u;
    const h = 1.45 * u;
    const y = floorY - h - 0.05 * u + Math.sin(now * 3) * 0.05 * u;
    g.save();
    g.translate(x, y);
    g.rotate(0.12);
    rrect(g, 0, 0, w, h, 0.12 * u);
    g.fillStyle = '#c98b4f';
    g.fill();
    rrect(g, 0.1 * u, 0.2 * u, w - 0.2 * u, h - 0.3 * u, 0.06 * u);
    g.fillStyle = '#ffffff';
    g.fill();
    rrect(g, w * 0.3, -0.05 * u, w * 0.4, 0.22 * u, 0.06 * u);
    g.fillStyle = '#9fb0bc';
    g.fill();
    g.strokeStyle = '#2fc75a';
    g.lineWidth = 0.08 * u;
    for (let i = 0; i < 3; i++) {
      const yy = 0.45 * u + i * 0.32 * u;
      g.beginPath();
      g.moveTo(0.22 * u, yy);
      g.lineTo(0.3 * u, yy + 0.08 * u);
      g.lineTo(0.45 * u, yy - 0.08 * u);
      g.stroke();
      g.fillStyle = '#d5e0e6';
      g.fillRect(0.55 * u, yy - 0.03 * u, w - 0.75 * u, 0.06 * u);
    }
    g.restore();
  }
}
