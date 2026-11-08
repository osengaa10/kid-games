// Music as data, all original. Each song is bars of 16 steps (sixteenth notes). A bar gives the
// lead melody (semitones from C5, null = rest), the chord (root in semitones from C3, and
// whether it's minor), and an optional drum pattern name. `order` lists the sections to loop.
// Instruments and drum patterns are in engine/music.js.

const _ = null;

const JUNGLE_A = [
  { chord: [0, 0], lead: [4, _, 7, _, 9, _, 7, _, 4, _, 0, _, 2, _, 4, _] },
  { chord: [-3, 1], lead: [0, _, _, -3, _, 0, _, 4, _, _, 2, _, 0, _, _, _] },
  { chord: [5, 0], lead: [9, _, 9, _, 7, _, 9, _, 12, _, 9, _, 7, _, 4, _] },
  { chord: [7, 0], lead: [2, _, 4, _, 2, _, -5, _, -3, _, 2, _, _, _, _, _] },
  { chord: [0, 0], lead: [4, _, 7, _, 12, _, _, _, 9, _, 7, _, 4, _, 7, _] },
  { chord: [-3, 1], lead: [9, _, _, 7, _, 4, _, 0, _, _, 2, _, 4, _, _, _] },
  { chord: [5, 0], lead: [9, _, 12, _, 9, _, 7, _, 4, _, 7, _, 9, _, _, _] },
  { chord: [7, 0], lead: [7, _, 4, _, 2, _, _, _, 0, _, _, _, _, _, _, _], drums: 'fill' },
];

const JUNGLE_B = [
  { chord: [5, 0], lead: [12, _, 12, _, 9, _, 12, _, 14, _, 12, _, 9, _, _, _] },
  { chord: [7, 0], lead: [14, _, 14, _, 12, _, 9, _, 7, _, _, _, 9, _, 7, _] },
  { chord: [4, 1], lead: [4, _, 7, _, 4, _, 7, _, 9, _, 7, _, 4, _, 2, _] },
  { chord: [-3, 1], lead: [0, _, _, _, -3, _, _, _, 0, _, 2, _, 4, _, 7, _] },
  { chord: [5, 0], lead: [9, _, 12, _, 14, _, 12, _, 9, _, 7, _, 9, _, 12, _] },
  { chord: [7, 0], lead: [14, _, _, _, 12, _, _, _, 9, _, _, _, 7, _, _, _] },
  { chord: [0, 0], lead: [16, _, 14, _, 12, _, 9, _, 7, _, 9, _, 12, _, _, _] },
  { chord: [0, 0], lead: [12, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], drums: 'fill' },
];

// The boss: the same tune's minor cousin, faster, with a driving fill.
const BOSS = [
  { chord: [-3, 1], lead: [9, _, 12, _, 9, _, 7, _, 9, _, _, _, 4, _, 7, _] },
  { chord: [-3, 1], lead: [9, _, 12, _, 14, _, 12, _, 9, _, _, _, _, _, _, _], drums: 'fill' },
  { chord: [5, 0], lead: [12, _, 14, _, 12, _, 9, _, 12, _, _, _, 9, _, 5, _] },
  { chord: [7, 0], lead: [11, _, 14, _, 11, _, 7, _, 11, _, _, _, 14, _, 11, _], drums: 'fill' },
];

export const SONGS = {
  boss: { bpm: 138, sections: { A: BOSS }, order: ['A'], lead: 'marimba', drums: 'calypso' },
  // World 1: a bouncy calypso with a marimba lead.
  jungle: { bpm: 112, sections: { A: JUNGLE_A, B: JUNGLE_B }, order: ['A', 'B', 'A', 'B'], lead: 'marimba', drums: 'calypso' },
  // The title and menus: the same tune, slower and softer, no kick drum.
  title: { bpm: 92, sections: { A: JUNGLE_A }, order: ['A'], lead: 'marimba', drums: 'soft', leadVol: 0.7 },
};
