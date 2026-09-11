// Generates the downloadable lab datasets under public/datasets/. Deterministic: same output every run.
// Pure Node (zlib for PNG), plus the system `zip` binary for archives. Run: node scripts/generate-datasets.mjs
import { deflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/datasets';
const WORK = join(OUT, '.build');
const SIZE = 128;

// ---------- deterministic randomness
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, lo, hi) => lo + r() * (hi - lo);

// ---------- minimal PNG encoder
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(rgb) {
  const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) { raw[y * (SIZE * 3 + 1)] = 0; rgb.copy(raw, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- tiny raster canvas
class Canvas {
  constructor() { this.buf = Buffer.alloc(SIZE * SIZE * 3); }
  set(x, y, c) { if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return; const i = (y * SIZE + x) * 3; this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2]; }
  fill(c) { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) this.set(x, y, c); }
  rect(x, y, w, h, c) { for (let j = Math.floor(y); j < y + h; j++) for (let i = Math.floor(x); i < x + w; i++) this.set(i, j, c); }
  ellipse(cx, cy, rx, ry, c, inner = 0) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1 && d >= inner) this.set(x, y, c); } }
  noise(r, amount) { for (let i = 0; i < this.buf.length; i += 3) { const n = Math.round((r() - 0.5) * amount); for (let k = 0; k < 3; k++) this.buf[i + k] = Math.max(0, Math.min(255, this.buf[i + k] + n)); } }
  stripes(c, gap) { for (let y = 0; y < SIZE; y += gap) this.rect(0, y, SIZE, 2, c); }
}

const DARK_BG = [[28, 32, 40], [40, 30, 48], [24, 44, 40], [50, 40, 30]];
const LIGHT_BG = [[236, 236, 230], [224, 232, 244], [246, 238, 220], [230, 240, 230]];
const CUP = [[204, 60, 60], [60, 110, 200], [230, 170, 40], [120, 170, 70], [190, 120, 200]];
const BOTTLE = [[40, 140, 120], [90, 90, 210], [220, 130, 60], [100, 100, 100], [30, 160, 60]];
const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));

function background(cv, r, kind) { const c = pick(r, kind === 'dark' ? DARK_BG : LIGHT_BG); cv.fill(c); if (r() < 0.4) cv.stripes(shade(c, kind === 'dark' ? 1.25 : 0.92), Math.floor(between(r, 10, 22))); cv.noise(r, 18); }

function drawCup(cv, r) {
  const c = pick(r, CUP), s = between(r, 0.45, 0.85), cx = between(r, 44, 84), cy = between(r, 52, 80);
  const w = 52 * s, h = 46 * s * between(r, 0.85, 1.15);
  cv.rect(cx - w / 2, cy - h / 2, w, h, c);                          // body
  cv.ellipse(cx, cy - h / 2, w / 2, 6 * s, shade(c, 1.25));            // rim
  cv.ellipse(cx, cy + h / 2, w / 2, 5 * s, shade(c, 0.8));             // base
  const side = r() < 0.5 ? 1 : -1;                                     // handle left or right
  cv.ellipse(cx + side * (w / 2 + 6 * s), cy, 14 * s, 15 * s, c, 0.45);
}
function drawBottle(cv, r) {
  const c = pick(r, BOTTLE), s = between(r, 0.45, 0.85), cx = between(r, 44, 84), cy = between(r, 56, 76);
  const bw = 34 * s * between(r, 0.85, 1.15), bh = 60 * s, nw = 14 * s, nh = 26 * s;
  cv.rect(cx - bw / 2, cy - bh / 2 + nh / 2, bw, bh, c);               // body
  cv.ellipse(cx, cy - bh / 2 + nh / 2, bw / 2, 8 * s, c);              // shoulders
  cv.rect(cx - nw / 2, cy - bh / 2 - nh / 2, nw, nh, c);               // neck
  cv.rect(cx - nw / 2 - 2 * s, cy - bh / 2 - nh / 2 - 6 * s, nw + 4 * s, 7 * s, shade(c, 0.6)); // cap
  if (r() < 0.6) cv.rect(cx - bw / 2 + 4 * s, cy + 2 * s, bw - 8 * s, 14 * s, shade(c, 1.35));   // label
}

function image(seed, cls, bgKind) { const r = rng(seed); const cv = new Canvas(); background(cv, r, bgKind); (cls === 'cup' ? drawCup : drawBottle)(cv, r); return png(cv.buf); }

// ---------- sets
function writeSet(name, spec, readme) {
  const dir = join(WORK, name); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const labels = ['filename,label'];
  let seed = spec.seed;
  for (const { cls, bg, count, folder } of spec.groups) {
    const sub = folder ? join(dir, folder) : dir; mkdirSync(sub, { recursive: true });
    for (let i = 0; i < count; i++) { const file = `${cls}-${String(i + 1).padStart(2, '0')}.png`; writeFileSync(join(sub, file), image(seed++, cls, bg === 'mixed' ? (i % 2 ? 'dark' : 'light') : bg)); labels.push(`${folder ? folder + '/' : ''}${file},${cls}`); }
  }
  if (spec.labels) writeFileSync(join(dir, 'labels.csv'), labels.join('\n') + '\n');
  writeFileSync(join(dir, 'README.txt'), readme.trim() + '\n');
  const zip = join(OUT, `${name}.zip`); rmSync(zip, { force: true });
  execFileSync('zip', ['-r', '-X', '-q', '-o', `../../${name}.zip`, '.'], { cwd: dir });
  return zip;
}

const COMMON = `These are drawn shapes, not photographs. They exist so the lab works without a camera and so the
shortcut experiment behaves the same for every student. If you have a camera and safe objects, use real
examples as well: real photos are harder and teach more.

Do not upload photos of people. See the safety notice in the portal.`;

mkdirSync(OUT, { recursive: true });
rmSync(WORK, { recursive: true, force: true });

writeSet('cup-bottle-training-v1', { seed: 1000, groups: [
  { cls: 'cup', bg: 'mixed', count: 20, folder: 'cup' }, { cls: 'bottle', bg: 'mixed', count: 20, folder: 'bottle' }] },
`Cup vs Bottle, training set v1 (Chapter 2, session "Build model v1")
20 cups and 20 bottles. Colour, size, position, handle side and background all vary.
In Teachable Machine: create class CUP, upload the cup folder; create class BOTTLE, upload the bottle folder; train.
${COMMON}`);

writeSet('cup-bottle-unseen-test', { seed: 2000, labels: true, groups: [
  { cls: 'cup', bg: 'mixed', count: 5 }, { cls: 'bottle', bg: 'mixed', count: 5 }] },
`Cup vs Bottle, unseen test set (Chapter 2, session "Break it and log the evidence")
10 images your model has never seen. labels.csv says what each one really is.
Test each image, record the prediction in your test log, then compare with labels.csv.
${COMMON}`);

writeSet('cup-bottle-shortcut-trap', { seed: 3000, labels: true, groups: [
  { cls: 'cup', bg: 'dark', count: 20, folder: 'train/cup' }, { cls: 'bottle', bg: 'light', count: 20, folder: 'train/bottle' },
  { cls: 'cup', bg: 'light', count: 5, folder: 'test' }, { cls: 'bottle', bg: 'dark', count: 5, folder: 'test' }] },
`Cup vs Bottle, shortcut trap (Chapter 2, session "The shortcut experiment")
train/: every cup is on a DARK background and every bottle on a LIGHT one. Train a model on this.
test/: cups on light backgrounds and bottles on dark ones. labels.csv has the truth.
If the model learned the background instead of the object, it will get most of test/ wrong. That is the point.
${COMMON}`);

writeSet('cup-bottle-training-v2', { seed: 4000, groups: [
  { cls: 'cup', bg: 'mixed', count: 20, folder: 'cup' }, { cls: 'bottle', bg: 'mixed', count: 20, folder: 'bottle' }] },
`Cup vs Bottle, training set v2 (Chapter 2, session "Improve model v2")
Same two classes, but each class now appears on both dark and light backgrounds, so the background no longer
predicts the answer. Train v2 on this, then re-run the shortcut trap test/ folder and compare with v1.
${COMMON}`);

writeFileSync(join(OUT, 'test-log-template.csv'), `test,actual_class,prediction,correct,observation\n${Array.from({ length: 10 }, (_, i) => `${i + 1},,,,`).join('\n')}\n`);
writeFileSync(join(OUT, 'confusion-matrix-template.csv'), `,predicted_cup,predicted_bottle\nactual_cup,,\nactual_bottle,,\n\naccuracy = (actual_cup->predicted_cup + actual_bottle->predicted_bottle) / all tests\n`);
writeFileSync(join(OUT, 'chapter1-draw-cards.csv'), `round,object,seconds\n1,bicycle,20\n1,cat,20\n1,house,20\n1,umbrella,20\n1,clock,20\n1,banana,20\n2,bridge,20\n2,fish,20\n2,tree,20\n2,glasses,20\n2,camera,20\n2,spoon,20\n`);
writeFileSync(join(OUT, 'chapter1-draw-cards.txt'), `Chapter 1 fallback: draw for the "AI" (no internet needed)

One person is the AI. They may only guess from the lines on the page so far, no questions.
The other person draws one object at a time, 20 seconds each, from the list below.
Record: guessed correctly? how many seconds? what did the "AI" say instead?
Then redraw one failed object a different way and see whether the guess changes.

Round 1: bicycle, cat, house, umbrella, clock, banana
Round 2: bridge, fish, tree, glasses, camera, spoon
`);

rmSync(WORK, { recursive: true, force: true });
const manifest = Object.fromEntries(readdirSync(OUT).filter(f => !f.startsWith('.')).sort().map(f => [f, statSync(join(OUT, f)).size]));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
