// Writes the launch-screen image: the same sky gradient as the launcher, so
// opening the app goes smoothly from splash to game list. No dependencies.
// Usage: node scripts/make-splash.mjs <out.png>
import fs from 'node:fs';
import zlib from 'node:zlib';

const SIZE = 2732;
const TOP = [0x3a, 0xa6, 0xf5];
const BOTTOM = [0xc9, 0xec, 0xff];

const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const k = Math.min(1, y / (SIZE * 0.75));
  const c = TOP.map((a, i) => Math.round(a + (BOTTOM[i] - a) * k));
  const row = y * (SIZE * 3 + 1);
  for (let x = 0; x < SIZE; x++) raw.set(c, row + 1 + x * 3);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
fs.writeFileSync(process.argv[2], Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]));
