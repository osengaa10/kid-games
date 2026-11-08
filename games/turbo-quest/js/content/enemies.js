// The Grumblies. Each has a shared base and a block for each mode. Dad Mode adds behaviors
// (spotting you, aiming hops, swooping), never more health. Sizes in tiles, speeds in tiles/s.
// A section can override any number for its Grumblies with params, e.g. params: { w: { speed: 2 } }.

export const ENEMIES = {
  // Patrols back and forth and turns at walls and ledges.
  waddler: {
    move: 'walk',
    w: 0.9,
    h: 0.9,
    hp: 1,
    stompable: true,
    kid: { speed: 1.1, turnAtLedges: true },
    // Spots you in front (a "!" for alertTime), then hurries for a couple of seconds.
    dad: { speed: 1.5, turnAtLedges: true, alertRange: 6, alertTime: 0.45, alertMul: 2.2, alertFor: 2 },
  },
  // Crouches (the warning), then hops.
  hopper: {
    move: 'hop',
    w: 0.9,
    h: 0.8,
    hp: 1,
    stompable: true,
    kid: { interval: 1.4, crouch: 0.7, hops: [2.2], toward: false, drift: 0 },
    dad: { interval: 0.8, crouch: 0.4, hops: [1.6, 3.2], toward: true, drift: 2.4 },
  },
  // Stands still and spits slow seed bubbles (puffing its cheeks first). Dad Mode: aimed bursts.
  spitter: {
    move: 'spit',
    w: 0.9,
    h: 1.0,
    hp: 1,
    stompable: true,
    kid: { interval: 2.6, puff: 0.9, shots: 1, gap: 0, aim: false, speed: 3.2, range: 9 },
    dad: { interval: 1.7, puff: 0.5, shots: 3, gap: 0.22, aim: true, speed: 4.8, range: 10 },
  },
  // Holds a pot-lid shield in front: shots from the front clang off. Beat it from above, from
  // behind, or with Boing Balls (they bounce down onto it). Kid Mode: the lid falls off after 2.
  bonker: {
    move: 'walk',
    w: 0.95,
    h: 1.0,
    hp: 1,
    stompable: true,
    shield: true,
    kid: { speed: 0.9, turnAtLedges: true, shieldHits: 2 },
    dad: { speed: 1.2, turnAtLedges: true, faceYou: 6, shieldHits: 0 },
  },
  // Kid Mode: just walks fast. Dad Mode: paws the ground (the warning), charges, and is dizzy
  // (open to anything) after it runs into a wall.
  charger: {
    move: 'charge',
    w: 1.1,
    h: 0.95,
    hp: 1,
    stompable: true,
    kid: { speed: 1.9, charge: false, turnAtLedges: true },
    dad: { speed: 1.2, charge: true, range: 7, paw: 0.6, chargeSpeed: 8.5, dizzy: 1.6, turnAtLedges: true },
  },
  // Mini-boss: a giant Shield Bonker that slams the ground (jump the shockwaves). Several hits.
  bigbonker: {
    move: 'walk',
    w: 1.6,
    h: 1.7,
    hp: 3,
    stompable: true,
    shield: true,
    boss: 'mini',
    kid: { speed: 0.8, turnAtLedges: true, shieldHits: 3, hp: 2, slam: 5, slamHop: 1.6, waveSpeed: 3.5 },
    dad: { speed: 1.2, turnAtLedges: true, faceYou: 9, shieldHits: 0, hp: 3, slam: 3.4, slamHop: 2.2, waveSpeed: 6 },
  },
  // Bobs in the air. In Dad Mode it wiggles its wings, then swoops at you.
  flapper: {
    move: 'fly',
    w: 0.9,
    h: 0.7,
    hp: 1,
    stompable: true,
    kid: { range: 2.5, speed: 0.6, bob: 0.5, swoop: false },
    dad: { range: 3, speed: 0.8, bob: 0.6, swoop: true, swoopRange: 5, wiggle: 0.55, swoopSpeed: 7.5, cooldown: 2 },
  },
};

// Picture-book colors: every Grumbly is the same purple family so a 4-year-old learns "purple
// blob = Grumbly"; each kind has its own hat.
export const GRUMBLY_COLORS = {
  waddler: { body: '#8d6cf2', dark: '#5236b3', belly: '#b9a6ff' },
  hopper: { body: '#c06ce8', dark: '#7d33a8', belly: '#e3b3ff' },
  flapper: { body: '#6c8cf2', dark: '#3550b3', belly: '#a9bcff' },
  spitter: { body: '#a86cf2', dark: '#6236b3', belly: '#d6b8ff' },
  bonker: { body: '#7f6cf2', dark: '#4436b3', belly: '#b3a8ff' },
  charger: { body: '#9a5ad8', dark: '#5a2a96', belly: '#cfa8ff' },
  bigbonker: { body: '#7462e8', dark: '#3a2ca6', belly: '#aea3ff' },
};

// The order Grumblies appear in the Sticker Book (then the boss).
export const STICKER_KINDS = ['waddler', 'hopper', 'flapper', 'spitter', 'bonker', 'charger', 'bigbonker', 'tiki'];
