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
};
