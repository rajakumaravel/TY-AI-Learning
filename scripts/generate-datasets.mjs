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


// ---------- Chapter 3: club sign-ups, flawed on purpose (every flaw is documented in the README, which is the teacher key)
const FIRST = { Female: ['Aoife', 'Saoirse', 'Niamh', 'Roisin', 'Clodagh', 'Eimear', 'Grainne', 'Sinead', 'Orla', 'Maeve', 'Ciara', 'Aisling', 'Blathnaid', 'Meabh', 'Laoise', 'Fiadh', 'Caoimhe', 'Ailbhe', 'Sadhbh', 'Una'], Male: ['Cian', 'Oisin', 'Tadhg', 'Fionn', 'Darragh', 'Cathal', 'Ruairi', 'Eoghan', 'Padraig', 'Lorcan', 'Senan', 'Donal', 'Killian', 'Cormac', 'Diarmuid', 'Odhran', 'Naoise', 'Rian', 'Tiernan', 'Conall'] };
const SURNAME = ['Sampleton', 'Testerson', 'Mockwell', 'Fakeham', 'Dummyford', 'Exampleby', 'Stubbington', 'Placeholder', 'Specimen', 'Fixture', 'Draftly', 'Proofer'];
const CLUBS = ['Football', 'Drama', 'Art', 'Chess', 'Debating', 'Music', 'Basketball'];
const TY_SPELLINGS = ['TY', 'Transition Year', '4', 'ty'];
const OTHER_YEARS = [['1st Year', 6], ['2nd Year', 8], ['3rd Year', 8], ['5th Year', 5], ['6th Year', 3]];
const BIRTH_YEAR = { '1st Year': 2013, '2nd Year': 2012, '3rd Year': 2011, TY: 2010, '5th Year': 2009, '6th Year': 2008 };
const INTERESTS = ['football', 'gaming', 'art', 'music', 'reading', 'coding', 'drama', 'hurling', 'camogie', 'swimming', 'baking', 'photography', 'chess', 'running', 'animation'];
const NOTES = ['bit lazy needs pushing', 'very bright', 'parents difficult to deal with', 'always late', 'not club material', 'troublemaker in first year', 'quiet and odd', 'teacher favourite', 'sibling was a problem', 'too many activities already', 'likely to drop out', 'attention seeking', 'promising if pushed', 'do not put with Cian S'];
const INCOME = ['Low', 'Medium', 'Medium', 'High'];
const COLUMNS = ['student_id', 'first_name', 'surname', 'date_of_birth', 'year_group', 'gender', 'home_eircode', 'interests', 'club_choice', 'signup_date', 'attendance_pct', 'parent_phone', 'inferred_income_band', 'notes'];
const SENSITIVE = ['home_eircode', 'parent_phone', 'date_of_birth', 'inferred_income_band', 'notes'];
const BASE_ROWS = 120 - 6; // plus 4 exact and 2 near duplicates
const CODING_ROWS = 25, CODING_MALE = 22; // 88% one value

function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pad2 = n => String(n).padStart(2, '0');
const letter = r => String.fromCharCode(65 + Math.floor(r() * 26));
const dateFormats = [(d) => `2026-09-${pad2(d)}`, (d) => `${pad2(d)}/09/2026`, (d) => `${d} Sept 2026`];
const csvField = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const csv = rows => [COLUMNS.join(','), ...rows.map(row => COLUMNS.map(c => csvField(String(row[c]))).join(','))].join('\n') + '\n';

function clubSignups() {
  const r = rng(5000);
  // club and gender: Coding is skewed, everything else alternates
  const plan = [];
  for (let i = 0; i < CODING_ROWS; i++) plan.push({ club: 'Coding', gender: i < CODING_MALE ? 'Male' : 'Female', ty: true });
  for (let i = 0; plan.length < BASE_ROWS; i++) plan.push({ club: CLUBS[i % CLUBS.length], gender: i % 9 === 8 ? 'Prefer not to say' : i % 2 ? 'Female' : 'Male', ty: false });
  // year groups: every Coding row is TY; the rest share the remaining TY spellings and the other years
  const tyCount = BASE_ROWS - OTHER_YEARS.reduce((n, [, c]) => n + c, 0);
  const tyPool = shuffle(r, Array.from({ length: tyCount }, (_, i) => TY_SPELLINGS[i < 50 ? 0 : i < 64 ? 1 : i < 76 ? 2 : 3]));
  const otherPool = shuffle(r, [...OTHER_YEARS.flatMap(([y, c]) => Array(c).fill(y)), ...tyPool.slice(CODING_ROWS)]);
  let ty = 0, other = 0;
  const rows = shuffle(r, plan).map((p, i) => {
    const year = p.ty ? tyPool[ty++] : otherPool[other++];
    const by = BIRTH_YEAR[TY_SPELLINGS.includes(year) ? 'TY' : year];
    const nInterests = 1 + Math.floor(r() * 3);
    return {
      student_id: `S${1001 + i}`, first_name: pick(r, FIRST[p.gender] || (r() < 0.5 ? FIRST.Female : FIRST.Male)), surname: pick(r, SURNAME),
      date_of_birth: `${by}-${pad2(1 + Math.floor(r() * 12))}-${pad2(1 + Math.floor(r() * 28))}`,
      year_group: year, gender: p.gender,
      home_eircode: `Z${Math.floor(r() * 90) + 10} ${letter(r)}${letter(r)}${Math.floor(r() * 90) + 10}`,
      interests: shuffle(r, INTERESTS).slice(0, nInterests).join('; '),
      club_choice: p.club, signup_date: dateFormats[i % 3](1 + Math.floor(r() * 12)),
      attendance_pct: String(55 + Math.floor(r() * 46)),
      parent_phone: `080 ${Math.floor(r() * 900) + 100} ${Math.floor(r() * 9000) + 1000}`,
      inferred_income_band: pick(r, INCOME), notes: r() < 0.24 ? pick(r, NOTES) : '',
    };
  });
  // blanks and impossible values, on non-Coding rows so the Coding skew stays exact
  const nonCoding = shuffle(r, rows.filter(x => x.club_choice !== 'Coding'));
  let k = 0;
  for (let i = 0; i < 9; i++) nonCoding[k++].club_choice = '';
  for (let i = 0; i < 6; i++) nonCoding[k++].year_group = '';
  for (let i = 0; i < 3; i++) nonCoding[k++].interests = '';
  for (const v of ['104', '-5', 'n/a']) nonCoding[k++].attendance_pct = v;
  // duplicates: copies of otherwise clean rows, inserted a few rows after the original
  const clean = nonCoding.slice(k).filter(x => x.notes === '');
  const exact = clean.slice(0, 4), near = clean.slice(4, 6);
  const out = rows.slice();
  const insert = (row, copy) => out.splice(out.indexOf(row) + 3 + Math.floor(r() * 10), 0, copy);
  for (const row of exact) insert(row, { ...row });
  near.forEach((row, i) => insert(row, { ...row, student_id: `S${1001 + BASE_ROWS + i}`, first_name: row.first_name.toUpperCase(), surname: row.surname.toLowerCase() }));
  return { rows: out, exact, near };
}

const { rows: signups, exact: exactDups, near: nearDups } = clubSignups();
const count = (col, test) => signups.filter(x => test(x[col])).length;
const coding = signups.filter(x => x.club_choice === 'Coding');
const codingMale = coding.filter(x => x.gender === 'Male').length;
const tyRows = count('year_group', v => TY_SPELLINGS.includes(v));
writeFileSync(join(OUT, 'club-signups-flawed.csv'), csv(signups));
const otherYearCounts = Object.values(signups.filter(x => x.year_group && !TY_SPELLINGS.includes(x.year_group)).reduce((m, x) => ({ ...m, [x.year_group]: (m[x.year_group] || 0) + 1 }), {}));
mkdirSync('docs/teacher', { recursive: true });
writeFileSync(join('docs/teacher', 'club-signups-flawed.KEY.txt'), `Club sign-ups, flawed on purpose (Chapter 3, Data Detective). TEACHER KEY: this file lists every planted flaw.
${signups.length} rows, ${COLUMNS.length} columns: ${COLUMNS.join(', ')}.
Purpose the school states for the data: assign students to after-school clubs.

Everything here is synthetic. First names are common Irish names; surnames come from a fixed list of obviously
fictional ones (${SURNAME.join(', ')}). Eircodes use the routing key Z + two digits, which is not a real routing
key. Phone numbers use the prefix 080, which is not allocated to any Irish operator. Notes are invented.

Planted flaws and where to find them:
- Missing values: ${count('club_choice', v => v === '')} rows with no club_choice, ${count('year_group', v => v === '')} rows with no year_group, ${count('interests', v => v === '')} rows with blank interests.
- Inconsistent formats: signup_date in three styles (${dateFormats.map((f, i) => `${f(3)}: ${count('signup_date', v => [/^\d{4}-/, /^\d{2}\//, / Sept /][i].test(v))} rows`).join('; ')}).
  year_group spelt four ways for the same year: ${TY_SPELLINGS.map(s => `${s} (${count('year_group', v => v === s)})`).join(', ')}.
- Duplicates: ${exactDups.length} exact duplicate rows (${exactDups.map(x => x.student_id).join(', ')}) and ${nearDups.length} near-duplicates that differ only in letter case and carry a new student_id, so only a name plus date_of_birth match finds them (${nearDups.map(x => x.student_id).join(', ')}).
- Suspicious values: attendance_pct contains 104, -5 and n/a (one row each); every other value is 55-100.
- Imbalance: club_choice = Coding has ${coding.length} rows and ${Math.round(100 * codingMale / coding.length)}% of them are Male (${codingMale} of ${coding.length}). Every Coding row is Transition Year.
  Overall ${tyRows} of ${signups.length} rows (${Math.round(100 * tyRows / signups.length)}%) are Transition Year; the other year groups have between ${Math.min(...otherYearCounts)} and ${Math.max(...otherYearCounts)} rows each.
- Sensitive or unnecessary for the stated purpose: ${SENSITIVE.join(', ')}. inferred_income_band was never collected from anyone; it is a guess. notes holds free-text judgements about students (${count('notes', v => v !== '')} rows).

club-signups-cleaned-template.csv has the same header minus ${SENSITIVE.join(', ')}, with empty rows, for students who prefer a spreadsheet.
This key lives in docs/teacher and is never deployed with the site.
`);
writeFileSync(join(OUT, 'club-signups-cleaned-template.csv'), `${COLUMNS.filter(c => !SENSITIVE.includes(c)).join(',')}\n${Array.from({ length: signups.length }, () => ','.repeat(COLUMNS.length - SENSITIVE.length - 1)).join('\n')}\n`);
writeFileSync(join(OUT, 'responsible-data-card-template.md'), `# Responsible Data Card

Dataset: club-signups (cleaned by: ________  date: ________)

## 1. Purpose
What this dataset is for. One or two sentences.

## 2. What is collected
The columns kept, each in plain words.

## 3. Volunteered, observed or inferred
For each kept column: did the person give it, was it observed, or was it guessed?

## 4. Who could be harmed
Who is affected if the data is wrong, leaked, or used for something else, and how.

## 5. What was removed or fixed
Columns removed, values fixed and the exact rule used, rows flagged and left alone.

## 6. What the data must not be used for
Purposes this data would be unfair or unreliable for.
`);
rmSync(WORK, { recursive: true, force: true });
const manifest = Object.fromEntries(readdirSync(OUT).filter(f => !f.startsWith('.')).sort().map(f => [f, statSync(join(OUT, f)).size]));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
