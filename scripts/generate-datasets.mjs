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
// Sheet A5 (curriculum pilot v1, Appendix A) plus the optional Integrity section from the data-integrity review (section 6).
writeFileSync(join(OUT, 'responsible-data-card-template.md'), `# Responsible Data Card (Sheet A5)

Service or dataset: ________________  Name: ________________  Date: ________

| Question | Notes |
| --- | --- |
| What data is collected? | |
| What is observed rather than typed? | |
| What might be inferred? | |
| Why is it needed? | |
| What could go wrong? | |
| Who might be missing or misrepresented? | |
| What should be removed or minimised? | |
| What needs human review? | |

## Integrity (optional)

| Section | Questions | Notes |
| --- | --- | --- |
| Quality | What is missing? Are there duplicates? Are values valid? Are units/formats consistent? Are labels reliable? Is it current enough? | |
| Provenance | Where did it come from? Who collected it? When? Why? Is it primary or secondary data? Can we trace the original source? | |
| Limitations | What remains uncertain? What conclusions are supported? What conclusions are not supported? | |
`);

// Chapter 3, session "Data Tracking Sherlock": fallback policy extracts. Every service is fictional; no real company is named.
writeFileSync(join(OUT, 'privacy-policy-extracts.txt'), `Sample privacy policy extracts (Chapter 3, Data Detective, session "Data Tracking Sherlock")

Three fictional services. Use one if you have no real privacy policy or app-store listing to hand.
Read each extract at category level: list the categories, mark anything surprising, quote anything vague.
Then sort each category into volunteered (you gave it), observed (recorded while you used it) or inferred (guessed).

=== 1. Loopwave (music streaming app) ===
Data we collect:
- Your name, email address and date of birth, when you create an account.
- Playlist names, likes, follows and the searches you type.
- Listening history: what you play, how long you listen, what you skip and at what time of day.
- Your approximate location, from your device or your network connection.
- Device information: model, operating system, language and unique advertising identifiers.
- Microphone access, when you use voice search.
- Your mood and activity (for example "workout", "focus", "late night"), estimated from your listening.
- Your age range and likely interests, estimated from your activity, for recommendations and advertising.
- Contacts on your device, if you allow it, so we can suggest friends to follow.
- Usage information, to improve our services.

=== 2. Wayline (maps and directions app) ===
Data we collect:
- Places you search for, addresses you save and routes you request.
- Precise location, continuously while the app is open and, if you allow it, in the background.
- Movement data: speed, direction and the mode of transport we detect (walking, cycling, driving, bus).
- Location history: the places you visit and how long you stay, used to build your "timeline".
- Photos and reviews you post about places, and the camera access needed to take them.
- Device identifiers, sensor data (motion, barometer) and network information.
- Contacts, if you allow it, so you can share your live location.
- Home and work locations, which we infer from where your device rests overnight and during the day.
- Likely places you will visit next, predicted from your history.
- Information from partners, for personalisation and to improve our services.

=== 3. Snapnest (photo-sharing app) ===
Data we collect:
- Your username, profile photo, bio and the accounts you follow.
- Photos and videos you upload, including the captions and hashtags you add.
- Image metadata: the time, camera settings and, unless you turn it off, the exact location each photo was taken.
- Faces detected in your photos, to suggest tags and to group photos by person.
- How long you look at each post, what you scroll past and what you tap.
- Messages you send in the app, and who you send them to.
- Your contacts and, if you allow it, other apps installed on your device.
- Interests, age range and life events (for example moving school or a new relationship), estimated from your activity.
- Public posts, which may be used to train and improve our services, including image-recognition features.
- Information from other websites that use our sharing button, so we can show you relevant content.
`);

// Chapter 3, session "Cookies, scraping and the fairness challenge": the three scenarios from the Student Book p.16.
writeFileSync(join(OUT, 'fairness-scenario-cards.txt'), `Fairness scenario cards (Chapter 3, Data Detective, session "Cookies, scraping and the fairness challenge")

Your group gets a scenario: an AI system for school club recommendations, job shortlisting or transport planning.
Decide what data you'd collect. Then ask the hard question: who is missing?
Students who joined mid-year? People without smartphones? Those who work nights?

=== Card 1: school club recommendations ===
The system: recommends after-school clubs to every student, using last year's club sign-up data (club-signups-flawed.csv).
Decide what data you'd collect: which fields, from whom, and how (a form, the timetable system, observation?).
Who is missing?
- Students who joined mid-year and never filled in a sign-up form.
- Students who wanted a club that did not run, so there is no row for what they actually wanted.
- Year groups or genders that are thin or absent in a club, so the system never recommends it to them.
- Students whose club_choice or year_group was left blank: is that an accident, or a pattern?

=== Card 2: job shortlisting ===
The system: ranks applicants for a part-time job from their application forms and past employee records.
Decide what data you'd collect: what actually predicts doing the job well, and what is only a proxy for who was hired before?
Who is missing?
- People who never applied because the advert only reached one group.
- Those who work nights or care for someone, whose availability looks "worse" on a form.
- Applicants with gaps, different qualifications or an address in the "wrong" area.
- Everyone the old records rejected: the data only shows who was hired, never who would have been good.

=== Card 3: transport planning ===
The system: decides where to add bus routes and stops, using journey data from a transport app.
Decide what data you'd collect: app data, ticket sales, a survey, counts at stops?
Who is missing?
- People without smartphones, or without the app, whose journeys are never recorded.
- Those who work nights, when fewer journeys are logged and fewer surveys are answered.
- People who stopped travelling because the current service does not work for them.
- Wheelchair users, older people and rural passengers, if the app mostly logs city-centre commuters.

For each card, write your before and after: fields removed, a representation check added, how long data is kept,
and the decisions that must have a human reviewing them before anything happens to a person.
`);

// ---------- Chapter 4: Generative AI & Prompting. The sample outputs are built from tagged sentences so the teacher key
// is derived from the same data and marks every claim. No real AI tool produced them.
const WEAK_QUESTION = 'Tell me about the River Shannon.';
writeFileSync(join(OUT, 'genai-weak-question-card.txt'), `Weak question card (Chapter 4, Generative AI & Prompting, session "Same task, different prompts")

Ask this, exactly as written, with nothing added:

    ${WEAK_QUESTION}

Why it is weak:
- No context. The model does not know who is asking, what it is for, or what you already know, so it guesses the
  most average reader and the most average purpose.
- No task. "Tell me about" is not one clear verb. List? Compare? Explain? Summarise for a talk? The model picks.
- No constraints. No length, no level, nothing to avoid, and no "say unsure if you are not certain", so every figure
  arrives in the same confident tone whether it was checked or invented.
- No format. Paragraphs, bullets, a table? Whatever comes back is whatever shape the pattern produced.

Ask it once. Then ask it again, or in a second model. Compare: what varied, what was missing, and what sounded
confident with nothing behind it? Keep both answers. They are the "before" for Prompt Lab 1.
`);

// [sentence, verdict, how to check]; null = paragraph break. Verdicts: supported / uncertain / wrong.
const SAMPLE_A = [
  ['The River Shannon is the longest river in Ireland.', 'supported', 'Any atlas; Tailte Éireann, formerly Ordnance Survey Ireland (tailte.ie); Wikipedia "River Shannon" and the sources it cites.'],
  ['It rises at the Shannon Pot on the slopes of Cuilcagh Mountain in County Cavan.', 'supported', 'Geological Survey Ireland (gsi.ie) on the Shannon Pot; Cuilcagh Lakelands Geopark; Tailte Éireann map.'],
  ['From there it flows south for nearly 500 km before reaching the Atlantic.', 'wrong', 'Every reference gives about 360 km (360.5 km on Wikipedia and Tailte Éireann; some older sources 386 km including the estuary). No source gives 500 km.'],
  ['On its way it widens into three large lakes: Lough Allen, Lough Ree and Lough Derg.', 'supported', 'Tailte Éireann map; Waterways Ireland Shannon Navigation guide.'],
  null,
  ['The river passes through or borders eleven counties, dividing the west of Ireland from the east.', 'uncertain', 'Sources count differently depending on whether estuary counties and county borders are included; check the list against an Tailte Éireann map rather than trusting the number.'],
  ['The city of Limerick sits at the head of the Shannon Estuary.', 'supported', 'Tailte Éireann map; Limerick City and County Council.'],
  ['In 1925 the new Irish state began building the Ardnacrusha hydroelectric scheme, which was completed in 1929.', 'supported', 'ESB Archives (esbarchives.ie) Shannon Scheme pages: construction 1925–1929, official opening July 1929.'],
  ['The scheme was run by the Electricity Supply Board, set up in 1927.', 'supported', 'ESB Archives; Electricity (Supply) Act 1927 on irishstatutebook.ie.'],
  ['For its first decade Ardnacrusha supplied about 80% of Ireland\'s electricity.', 'uncertain', 'Widely repeated, but the share fell every year as demand grew, so any percentage needs a year attached. Check the ESB Archives (esbarchives.ie) Shannon Scheme pages for dated figures.'],
  null,
  ['The Shannon Bridge Act of 1873 required every crossing of the river to be approved by Parliament.', 'wrong', 'No such Act exists. The nearest real Acts on legislation.gov.uk are the Shannon Navigation Acts (1839 onward) and the Shannon Act 1874, which deal with navigation and drainage works and say nothing about Parliament approving crossings. That is the tell: a plausible name, a nearby year, an invented provision.'],
  ['The river is named after Sionann, a figure from Irish mythology.', 'supported', 'Placenames Database of Ireland (logainm.ie) entry for the Shannon; any dictionary of Irish mythology.'],
  ['For a fuller history see Ó Braonáin, T. (2011), The Shannon from Pot to Sea, Athlone Riverside Press, p. 42.', 'wrong', 'Fabricated citation. No such author, title or publisher in the National Library of Ireland catalogue, WorldCat or any bookshop search.']
];
const SAMPLE_B = [
  ['The Shannon is the longest river on the island of Ireland at about 360 km.', 'supported', 'OSI; Wikipedia "River Shannon" (360.5 km).'],
  ['Some references give 386 km, a figure that includes the estuary.', 'uncertain', 'Older references do give 386 km; whether that includes the estuary depends on the reference. The point is that "the length" depends on where you say the river ends.'],
  ['Its source, the Shannon Pot, is a small pool in County Cavan fed by underground streams from Cuilcagh Mountain.', 'supported', 'Geological Survey Ireland; Cuilcagh Lakelands Geopark.'],
  ['The river drains roughly one fifth of the island.', 'uncertain', 'The Shannon catchment is often given as about a fifth of the island; the exact share depends on how the catchment is defined. Check the EPA catchment data (catchments.ie).'],
  ['Major towns along it include Carrick-on-Shannon, Athlone and Limerick.', 'supported', 'Tailte Éireann map.'],
  null,
  ['The Ardnacrusha power station, built by the German firm Siemens-Schuckert, opened in 1937.', 'wrong', 'The firm is right; the year is wrong. ESB Archives: construction 1925–1929, official opening July 1929.'],
  ['At the time it was one of the largest hydroelectric schemes in the world.', 'uncertain', 'Often described that way, but "largest" claims need a stated comparison and date. Check the ESB Archives Shannon Scheme pages for what they actually say.'],
  ['The Shannon–Erne Waterway, which links the river to Lough Erne, was reopened in 1994.', 'supported', 'Waterways Ireland; the restored canal opened in 1994.'],
  ['The river also gives its name to Shannon Airport, where the world\'s first airport duty-free shop opened in 1947.', 'supported', 'Shannon Airport history pages; widely documented, opened 1947.'],
  null,
  ['Because the Shannon is so slow and flat, it has never flooded seriously.', 'wrong', 'Major floods in November 2009 and winter 2015–16 are documented by the Office of Public Works (floodinfo.ie) and in national news archives.'],
  ['Salmon still migrate up the river, though numbers are lower than in the past.', 'uncertain', 'Inland Fisheries Ireland publishes counts; "lower than in the past" needs a date range and a figure before it can be used.']
];
const prose = s => s.map(x => x === null ? '\n' : x[0]).join(' ').replace(/ \n /g, '\n\n');
const keyRows = s => s.filter(Boolean).map((x, i) => `${i + 1}. [${x[1].toUpperCase()}] ${x[0]}\n   Check: ${x[2]}`).join('\n');
const verdictCount = s => ['supported', 'uncertain', 'wrong'].map(v => `${s.filter(x => x && x[1] === v).length} ${v}`).join(', ');
writeFileSync(join(OUT, 'genai-sample-outputs.txt'), `Sample AI outputs (Chapter 4, Generative AI & Prompting, sessions "Same task, different prompts" and "Verification challenge")

SYNTHETIC SAMPLES. These two answers were written for this course in the style of a chatbot. No real AI tool produced
them. Each contains claims that are supported, claims that are uncertain and claims that are wrong, mixed together and
deliberately not marked. Read them the way you would read a real output: which sentences would you need to check
before repeating them?

The question, both times: ${WEAK_QUESTION}

=== Answer 1 (first run) ===
Certainly! Here is an overview of the River Shannon.

${prose(SAMPLE_A)}

Let me know if you would like more detail on any of these points!

=== Answer 2 (second run, different model) ===
Sure. The River Shannon is one of Ireland's best-known natural features. Here are the key facts.

${prose(SAMPLE_B)}

I hope this helps. Feel free to ask if you want me to expand on the history or the geography!

Compare the two answers. What varied? What was missing from both? What sounded confident with nothing behind it?
For the verification challenge: pick three claims, find a reliable source for each, and label them supported,
uncertain or wrong on Sheet A2.
`);

writeFileSync(join(OUT, 'genai-verification-topics.txt'), `Verification topic cards (Chapter 4, Generative AI & Prompting, session "Verification challenge")

Pick one topic. Ask the AI about it in your own words. Then choose three claims it made, find a reliable source
for each (name it and say where you found it), and label each claim supported, uncertain or wrong on Sheet A2.
The five facts under each topic are checkable. No answers are given here: that is the point.

=== Topic 1: the River Shannon ===
1. How long is the river, and does the figure change depending on where the "end" is measured?
2. Where is its source: which pool, on which mountain, in which county?
3. Which three large lakes does it widen into on its way south?
4. In which year did the Ardnacrusha power station open, and which company built it?
5. Which city sits at the head of the Shannon Estuary?
Good sources: Tailte Éireann (formerly Ordnance Survey Ireland), Geological Survey Ireland, ESB Archives, Waterways Ireland.

=== Topic 2: Transition Year in Ireland ===
1. In which year was Transition Year first introduced as a pilot, and in how many schools?
2. In which year was it made widely available to schools across the country?
3. Is it compulsory in every school, optional, or does that depend on the school?
4. Which two stages of second-level education does it sit between?
5. Roughly how many students, or what share of schools, take part each year?
Good sources: the Department of Education (gov.ie), the NCCA, the Transition Year programme guidelines.

=== Topic 3: the Apollo 11 landing ===
1. On what date did the lunar module land on the Moon?
2. Who were the three astronauts, and which one stayed in orbit around the Moon?
3. What was the landing site called?
4. How long did the astronauts spend outside the module on the surface?
5. Where did the crew splash down, and on what date?
Good sources: NASA history pages (history.nasa.gov), the Smithsonian National Air and Space Museum.

A reliable source is one where you can say who made it, why, and how it can be checked. A page that repeats the
chatbot's wording is not an independent source.
`);

// Each prompt carries one planted ambiguity, one missing constraint and one claim that would need checking.
const RED_TEAM = [
  { prompt: 'Write a short piece for the school newsletter about the history of our town, and include the year it was founded and its population.', ambiguity: '"our town": the model does not know which town, so it will pick a likely one or invent a generic history. "Short" is undefined.', missing: 'No audience or level, no word limit, and no "say if unsure", so the model fills every gap with its most average guess.', claim: 'The founding year and the population figure. The model will supply both confidently whether or not any record exists.' },
  { prompt: 'Explain why electric cars are better for the environment, with some statistics to back it up.', ambiguity: '"Better" than what: petrol cars, buses, bicycles? And where: emissions depend on how a country generates its electricity.', missing: 'No country, no year, no requirement to name the source of each statistic, and no length.', claim: 'Every statistic. The framing is also leading ("why is X better"), so expect a one-sided answer with no drawbacks.' },
  { prompt: 'Make me a two-week revision plan for my exams with the best memory techniques, backed by research.', ambiguity: 'Which subjects, how many exams, and how many hours a day are available? The plan will be for an imaginary student.', missing: 'No format (a table by day?), no level, and nothing about what to avoid (for example, no all-night sessions).', claim: '"Backed by research": any named study, author or percentage the model attaches to a technique needs checking. Citations here are often invented.' }
];
writeFileSync(join(OUT, 'genai-red-team-prompts.txt'), `Red-team prompt cards (Chapter 4, Generative AI & Prompting, session "Red-team a prompt")

Use one of these if you have no partner's prompt to red-team. For the prompt you pick, find one ambiguity, one
missing constraint and one claim in its likely answer that would need checking. Run it in the tool if you can;
you can also red-team it on paper by asking what the most likely continuation would be.

${RED_TEAM.map((x, i) => `=== Prompt ${i + 1} ===\n${x.prompt}`).join('\n\n')}

Then apply the same three checks to your own reusable prompt template.
`);

mkdirSync('docs/teacher', { recursive: true });
writeFileSync(join('docs/teacher', 'genai-sample-outputs.KEY.txt'), `Sample AI outputs (Chapter 4, Generative AI & Prompting). TEACHER KEY: every claim in genai-sample-outputs.txt
marked supported / uncertain / wrong, with the source to check it against, plus the planted issues in
genai-red-team-prompts.txt. This key lives in docs/teacher and is never deployed with the site.

Both answers are synthetic. They were written for this course in the style of a chatbot; no AI tool produced them.
The question both times: ${WEAK_QUESTION}

=== Answer 1 (first run): ${verdictCount(SAMPLE_A)} ===
${keyRows(SAMPLE_A)}

=== Answer 2 (second run, different model): ${verdictCount(SAMPLE_B)} ===
${keyRows(SAMPLE_B)}

Points worth drawing out in discussion:
- The two answers disagree on the length (nearly 500 km vs about 360 km) and on the Ardnacrusha year (1929 vs 1937)
  in the same confident tone. Neither answer flags the disagreement; only checking finds it.
- The fabricated citation in Answer 1 (Ó Braonáin, 2011) looks exactly like a real one. A library catalogue search
  finds nothing. That is the myth-buster "If it gives a citation, the source exists" in one line.
- The uncertain claims are not wrong so much as unfinished: "about 80%", "one fifth", "eleven counties" all need a
  year, a definition or a list before they can be used. "Uncertain" is the right verdict, and the change to make is
  a hedge or a question mark, not deletion.

=== Red-team prompt cards: planted issues ===
${RED_TEAM.map((x, i) => `Prompt ${i + 1}: ${x.prompt}\n- Ambiguity: ${x.ambiguity}\n- Missing constraint: ${x.missing}\n- Claim to check: ${x.claim}`).join('\n\n')}
`);

// Sheets A4 and A2 (curriculum pilot v1, Appendix A) as headers with empty rows.
writeFileSync(join(OUT, 'prompt-experiment-sheet-A4.csv'), 'Version,Prompt,Prompt change,What changed in output,Was it better? Why?\nV1 - baseline,,,,\nV2,,,,\nV3,,,,\n');
writeFileSync(join(OUT, 'verification-log-A2.csv'), 'Claim,Source checked,Supported / uncertain / wrong,What I changed\n,,,\n,,,\n,,,\n');
writeFileSync(join(OUT, 'reusable-prompt-template.md'), `# Reusable prompt template (C-T-C-F)

Task this template is for: ________________

Replace every [placeholder] each time you use it. Keep the constraints and format the same between runs so the
outputs stay comparable.

## Context
I am [who you are, without personal details, e.g. "a Transition Year student"]. This is for [what it is for].
I already know [what you already know, so the model does not repeat it].

## Task
[One verb.] [The one clear thing you want it to do.]

## Constraints
- Length: [e.g. under 150 words / no more than 5 items]
- Level: [e.g. plain language for 15-year-olds]
- Avoid: [what to leave out]
- Must include: [what has to be there]
- Mark any figure, date, name or source you are not certain of with [unsure].

## Format
[Table / bullets / numbered list / three options / ask me questions first, then answer]

## Before you rely on the output
- Which claims will you check by hand, and where?
- What did this template get wrong last time, and what did you change?
`);

rmSync(WORK, { recursive: true, force: true });
const manifest =Object.fromEntries(readdirSync(OUT).filter(f => !f.startsWith('.')).sort().map(f => [f, statSync(join(OUT, f)).size]));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
