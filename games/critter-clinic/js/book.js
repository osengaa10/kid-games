// The sticker book: every sticker he has given out, newest first, each beside the face of the
// patient who got it. Plain DOM in a scrolling grid; the newest one bounces in.
import { PATIENTS } from './patients.js';
import { drawPortrait } from './patient-art.js';
import { drawSticker } from './stickers.js';
import * as sound from './sound.js';

const $ = (id) => document.getElementById(id);

export class Book {
  constructor(cb) {
    this.screen = $('book');
    this.list = $('book-list');
    $('book-home').addEventListener('click', () => {
      sound.pop();
      cb.onHome();
    });
  }

  show(book, fresh = false) {
    this.list.innerHTML = '';
    this.screen.classList.toggle('empty', book.length === 0);
    const S = 220;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    book.forEach((b, i) => {
      const sp = PATIENTS[b.p];
      const card = document.createElement('div');
      card.className = `entry${fresh && i === 0 ? ' new' : ''}`;
      const c = document.createElement('canvas');
      c.width = c.height = Math.round(S * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      drawSticker(g, b.e, S * 0.5, S * 0.44, S * 0.72, (((i * 37) % 9) - 4) * 0.04);
      if (sp) {
        // the patient's face in a little round photo, bottom right
        g.save();
        g.beginPath();
        g.arc(S * 0.8, S * 0.8, S * 0.17, 0, Math.PI * 2);
        g.fillStyle = '#e8f7f2';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#ffffff';
        g.stroke();
        g.clip();
        drawPortrait(g, sp, S * 0.8, S * 0.82, S * 0.3);
        g.restore();
      }
      card.append(c);
      card.setAttribute('aria-label', sp ? `${sp.name}'s sticker` : 'Sticker');
      this.list.append(card);
    });
    this.list.scrollTop = 0;
  }
}
