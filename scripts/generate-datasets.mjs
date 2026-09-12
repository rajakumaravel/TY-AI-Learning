// Generates the downloadable lab datasets under public/datasets/. Deterministic: same output every run.
// Pure Node (zlib for PNG), plus the system `zip` binary for archives. Run: node scripts/generate-datasets.mjs
import { deflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync } from 'node:fs';
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

// ---------- Chapter 5: Trust, Bias & Misinformation. The article is built from tagged sentences so the teacher key marks
// every sentence from the same data. Every sentence ends with a full stop and contains no other full stop, so the
// portal's annotate renderer can split the article on ". " and number the sentences the same way the key does.
const CLAIM_CARDS = [
  ['Transition Year was introduced in Irish schools in 1974.', 'TRUE', 'Department of Education (gov.ie) and NCCA Transition Year pages: piloted in 1974 in three schools, made widely available in 1994.'],
  ['The River Shannon is the longest river in Europe.', 'FALSE', 'The Shannon is the longest river in Ireland (about 360 km). The Volga, at over 3,500 km, is the longest in Europe; any atlas or Tailte Éireann.'],
  ['Most Irish teenagers would rather learn from an AI tutor than from a teacher.', 'CANNOT BE VERIFIED', 'No national survey asks this question; "most" and "would rather" are undefined, and any figure a search turns up will be one small poll with its own wording. Neither true nor false can be shown.']
];
writeFileSync(join(OUT, 'claim-cards.txt'), `Claim cards (Chapter 5, Trust, Bias & Misinformation, session "The confidence trap")

Three confident statements. One is true, one is false, one cannot be verified either way. They are not labelled.

Before you check anything, rank how confident you are in each one, from 1 (no idea) to 5 (certain). Write the number
down. Then open a new tab and check each statement against an independent, reliable source. Notice which one fooled
you, and why.

${CLAIM_CARDS.map((c, i) => `=== Card ${i + 1} ===\n${c[0]}`).join('\n\n')}

A statement can be written just as confidently whether it is true, false, or something nobody has ever measured.
`);

// [sentence, mark types, verdict or null, how to check or note]. Verdicts (factual claims only): supported / uncertain / wrong.
const ARTICLE = [
  ['Every secondary classroom in Ireland will have an AI tutor by 2028 under a plan that is already being rolled out.', ['Factual claim', 'Unsupported certainty'], 'wrong', 'No such plan has been announced. Department of Education press releases and policy pages on gov.ie; the Oireachtas debates database. "Already being rolled out" is certainty with nothing behind it.'],
  ['The tutors will arrive first in Transition Year, the optional year that sits between the Junior Cycle and the senior cycle.', ['Factual claim'], 'supported', 'The description of Transition Year is right: optional, between the Junior Cycle and the senior cycle (Department of Education, NCCA). "Will arrive first" rests on the plan in sentence 1, which does not exist.'],
  ['Transition Year was founded in 1986 and has never been changed since.', ['Factual claim'], 'wrong', 'Transition Year was piloted in 1974 in three schools and made widely available in 1994 (Department of Education, NCCA); the programme guidelines have been revised since. Both halves of the sentence are wrong.'],
  ['The Department of Education runs the country\'s school system, and it is the body that would have to sign off on any such plan.', ['Factual claim'], 'supported', 'gov.ie: the department responsible for primary and post-primary education. Note: it was renamed the Department of Education and Youth in May 2025, so search gov.ie under the current name; the article\'s older title is itself a checkable, dated detail.'],
  ['The tutors will be judged on results in the Leaving Certificate, the final exam at the end of secondary school.', ['Factual claim'], 'supported', 'The Leaving Certificate is the final examination of second-level education (State Examinations Commission, examinations.ie). How the tutors "will be judged" is not something anyone has said.'],
  ['The National AI Tutoring Act 2025 makes the rollout a legal requirement for every school in the country.', ['Factual claim', 'Missing source'], 'wrong', 'No such Act exists. Search the Irish Statute Book (irishstatutebook.ie) by title and the Oireachtas bills database: nothing. A plausible name, a recent year, an invented law.'],
  ['A recent survey found that 78% of parents want an AI tutor in their child\'s classroom.', ['Factual claim', 'Missing source'], 'uncertain', 'No survey is named, dated or linked, so the figure cannot be checked. "A recent survey" with no source is uncertain, not wrong: the right change is a label, not deletion.'],
  ['Experts agree that AI tutors raise grades in every subject.', ['Unsupported certainty', 'Missing source'], null, 'No expert is named. Evidence on AI tutoring is mixed and subject-specific; "every subject" is a claim no study supports.'],
  ['It is beyond doubt that students who refuse to use them will be left behind.', ['Unsupported certainty', 'Emotional framing'], null, '"Beyond doubt" backed by nothing; "refuse" and "left behind" are chosen to worry the reader. There is no checkable claim in the sentence.'],
  ['Parents who have seen the plan describe it as a lifeline for children drowning in an outdated system.', ['Emotional framing', 'Missing source'], null, 'No parent is named or quoted; "lifeline" and "drowning" do the work a fact would do.'],
  ['Critics are clinging to the past while a generation\'s future slips away.', ['Emotional framing'], null, 'Pure framing: it tells the reader what to feel about anyone who disagrees, and says nothing that could be checked.'],
  ['The full figures are set out in the Department\'s 2025 report, Classrooms of Tomorrow, published in March.', ['Factual claim', 'Missing source'], 'wrong', 'Fabricated citation. No report of that title in the Department of Education publications on gov.ie or in the National Library of Ireland catalogue. A named report that cannot be found is a wrong claim, not a missing one.']
];
writeFileSync(join(OUT, 'news-detective-article.txt'), `SYNTHETIC ARTICLE (Chapter 5, Trust, Bias & Misinformation, session "AI News Detective"). This article was written for this course in the style of AI-generated news. No real AI tool produced it, and no real plan, law, survey or report is described. Mark it up the way you would mark up a real one.

Headline: AI tutors in every Irish secondary classroom by 2028.

${ARTICLE.map(x => x[0]).join(' ')}
`);
writeFileSync(join(OUT, 'annotation-sheet.csv'), 'sentence,mark_type,note\n' + ',,\n'.repeat(8));

const STATIONS = [
  ['Hiring data', 'A company trains a model to shortlist job applicants from the last ten years of its own hiring records. The records show who was called to interview and who was hired, but not who would have done the job well. Most of the people hired in those years came from two colleges and one part of the city. The model is now used on every application before a person reads it.', 'Data: historical and selection bias in the past decisions; a proxy through college and address. Use: automation bias when recruiters stop reading what the model rejects. Affected: applicants who look unlike past hires.'],
  ['Image generation and stereotypes', 'An image generator is trained on pictures collected from the internet, with the captions people wrote for them. Ask it for "a nurse", "an engineer" or "a person from a city in Africa" and it produces the same kind of picture every time. A training centre uses it to make posters for a careers week. Nobody checks who appears in the pictures before they go up.', 'Data: representation bias in what the internet photographs and how it captions it. Design: the model returns the most typical image, so the stereotype is amplified. Use: nobody reviews the output. Affected: everyone who does not look like the "typical" picture, and the students who see the posters.'],
  ['Discipline analytics', 'A chain of training centres buys a system that predicts which learners are "likely to cause trouble" from attendance, past write-ups and the area they live in. The write-ups were made by different staff over several years, and some staff wrote up far more than others. The flag is shown to tutors at the start of each course. Flagged learners are watched more closely, and so are written up more often.', 'Data: label bias in the write-ups, a proxy through home area. Deployment: a prediction used to decide who gets watched. Use: automation bias in the tutors, and a feedback loop that makes the next model worse. Affected: the flagged learners, who did nothing yet.'],
  ['Recommendation feeds', 'A video app learns from what each person watches and shows them more of it. The design goal is time spent in the app. Nothing in the design measures whether what it recommends is true, varied or good for the person watching. A learner opens it to look up one thing and comes back an hour later.', 'Design: the objective is time spent, so the feed optimises for whatever keeps a person watching, often the most emotional content. Framing: what the feed surfaces shapes what the person believes is normal or true. Use: the person trusts the feed as a picture of the world. Affected: the person watching, and anyone the feed teaches them to distrust.']
];
const LIFECYCLE = [
  ['World before data', 'Historical bias', 'Past decisions were unequal, so historical outcomes encode inequality.'],
  ['Collection', 'Selection / sampling bias', 'Only people using an app enter the dataset.'],
  ['Measurement', 'Measurement bias', "One group's behaviour is measured less accurately."],
  ['Labelling', 'Label bias', 'Human raters apply an ambiguous label differently across groups.'],
  ['Feature choice', 'Proxy bias', 'Postcode indirectly reveals socioeconomic status.'],
  ['Training', 'Model / algorithmic bias', 'Patterns favour the majority group.'],
  ['Evaluation', 'Evaluation bias', 'Test data under-represent difficult cases.'],
  ['Deployment', 'Deployment bias', 'A model is used for a purpose it was not evaluated for.'],
  ['Human response', 'Automation bias', 'A person trusts the model too much because it appears objective.']
];
writeFileSync(join(OUT, 'bias-station-cards.txt'), `Bias station cards (Chapter 5, Trust, Bias & Misinformation, session "Bias stations")

Four short scenarios, four stations. At each one, ask: where could bias enter (the data? the design? how people use
it?) and who would be affected? Then name the kind of bias: selection, representation, framing, automation or proxy.

${STATIONS.map((s, i) => `=== Station ${i + 1}: ${s[0]} ===\n${s[1]}`).join('\n\n')}

=== Where bias can enter: the lifecycle map ===
${LIFECYCLE.map(l => `- ${l[0]} → ${l[1]}: ${l[2]}`).join('\n')}

Removing one field fixes one stage. Most systems have bias at more than one.
`);
writeFileSync(join(OUT, 'bias-simulator-worksheet.csv'), 'run,shareB,proxy,removed,groupA,groupB,overall,note\n' + ',,,,,,,\n'.repeat(4));
writeFileSync(join(OUT, 'corrected-version-template.md'), `# Corrected version

Original: the synthetic article "AI tutors in every Irish secondary classroom by 2028".

## Verified claims (with sources)
- Claim: ________________  Source (name and where): ________________
- Claim: ________________  Source (name and where): ________________

## Uncertain claims (labelled as uncertain)
- [UNCERTAIN] Claim: ________________  Why it is uncertain: ________________

## Sources
- ________________

## What was removed, and why
- Wrong claims: ________________
- Loaded framing: ________________
- Unsupported certainty: ________________
- Missing sources: ________________

Less exciting, more trustworthy. That is the point.
`);
writeFileSync(join(OUT, 'synthetic-media-checklist.txt'), `Synthetic media checklist (Chapter 5, Trust, Bias & Misinformation, session "Synthetic media")

AI-generated audio, image or video that looks real is now cheap to make. "Seeing is believing" was never fully true,
and now it is weaker. Before believing a clip, especially one that made you angry:

1. Stop. Notice the feeling. Anger and outrage are what a clip made to be shared is designed to produce.
2. Provenance. Who posted it, when was the account made, and where did the clip come from before that?
3. Other coverage. Open new tabs. Has anyone independent reported the same event, or does every copy point back to
   one account?
4. Who gains? Ask who benefits if you share it, and whether the clip is asking you to do something.
5. Look for the original. A re-upload, a crop or a clip with the sound replaced is not the original. Find the first
   version, or note that you cannot.
6. Wait. A real event has more than one witness and more than one source. If it is true, it will still be true
   tomorrow, with better evidence.

If you cannot answer 2 and 3, you cannot share it as true, whatever it looks like.
`);

mkdirSync('docs/teacher', { recursive: true });
const markCount = t => ARTICLE.filter(x => x[1].includes(t)).length;
writeFileSync(join('docs/teacher', 'news-detective-article.KEY.txt'), `AI News Detective (Chapter 5, Trust, Bias & Misinformation). TEACHER KEY: every sentence of news-detective-article.txt
numbered and marked with its intended mark types; factual claims marked supported / uncertain / wrong with the source to
check; the confidence-trap answers; the intended bias mechanisms per station. This key lives in docs/teacher and is never
deployed with the site.

The article is synthetic. It was written for this course in the style of AI-generated news; no AI tool produced it, and
no real plan, Act, survey or report is described. Sentences are numbered from the first sentence of the article body,
after the synthetic label and the headline.

=== Article: ${ARTICLE.length} sentences; ${['Factual claim', 'Emotional framing', 'Missing source', 'Unsupported certainty'].map(t => `${markCount(t)} ${t.toLowerCase()}`).join(', ')} ===
${ARTICLE.map((x, i) => `${i + 1}. [${x[1].map(t => t.toUpperCase()).join(' + ')}]${x[2] ? ` [${x[2].toUpperCase()}]` : ''} ${x[0]}\n   ${x[2] ? 'Check: ' : 'Note: '}${x[3]}`).join('\n')}

Points worth drawing out in discussion:
- Sentences 2, 4 and 5 are supported and still carry the article: a true description of Transition Year, the Department
  and the Leaving Certificate lends credibility to the invented plan around them. Accurate and still misleading.
- The invented Act (6) and the fabricated report (12) look exactly like real citations. A title search on the Irish
  Statute Book and gov.ie finds nothing. That is the myth-buster "Lots of websites say it" in reverse: one source, none.
- The survey (7) is uncertain, not wrong. The correct change in the corrected version is a label, not deletion.
- Sentences 8 to 11 contain no checkable claim at all. Students who mark them as factual claims are reading the tone,
  not the content; that is the confidence trap again.

=== Confidence trap: claim cards ===
${CLAIM_CARDS.map((c, i) => `Card ${i + 1}: ${c[0]}\n- ${c[1]}. ${c[2]}`).join('\n')}

=== Bias stations: intended mechanisms ===
${STATIONS.map((s, i) => `Station ${i + 1}, ${s[0]}: ${s[2]}`).join('\n')}

=== Bias simulator: expected values ===
Group A is always 18/20 (90%). Group B = clamp(round(6 + 12 × shareB/50) − penalty, 0, 20), where the penalty is 6 with
the sensitive field kept and round(6 × proxy/100) with it removed.
- shareB 10%, proxy 80%, field kept: Group B 2/20 (10%), overall 20/40 (50%).
- shareB 50%, proxy 80%, field removed: Group B 13/20 (65%), overall 31/40 (77.5%).
- shareB 50%, proxy 0%, field removed: Group B 18/20 (90%), overall 36/40 (90%).
The review's 8.1 table (Group A 18/20, Group B 11/20, overall 72.5%) is the discussion anchor: is 72.5% enough?
`);

// ---------- Chapter 6: AI for Learning & Work. One fixed raw fixture; answers only in docs/teacher.
const WORK_BUDGET = [
  ['E01','Venue','Hall','1','80'],
  ['E02','materials ','Paper packs','4','5'],
  ['E03','Catering','Juice cartons','6','3'],
  ['E04','Materials','Poster sheets','10','€1.50'],
  ['E05','transport','Minibus','1','60'],
  ['E06','Catering','Sandwich trays','3','12'],
  ['E07','Materials','Marker packs','2','4'],
  ['E08','Vneue','Display stand','1','20'],
  ['E09','Catering','Fruit boxes','','10'],
  ['E10','Transport','Taxi','-1','15'],
  ['E03','Catering','Juice cartons','6','3'],
  ['E07','Materials','Marker packs','20','4']
];
const workCsv = (rows) => rows.map(row => row.map(v => /[,"\n]/.test(String(v)) ? `"${String(v).replaceAll('"','""')}"` : String(v)).join(',')).join('\n')+'\n';
const workFile = (name, text) => writeFileSync(join(OUT, `ai-work-${name}`), text);
workFile('event-budget-raw.csv', workCsv([['item_id','category','item','quantity','unit_cost_eur'], ...WORK_BUDGET]));
workFile('tutor-cards.txt', `AI for Learning & Work — tutor cards
Use made-up details only. Record your starting point before any help.

Comparison: use the same safe learning question in two fresh conversations in the same tool.
1. Give me the answer: how much flour is half of a recipe that uses three quarters of a cup?
2. Teach me through questions: how much flour is half of a recipe that uses three quarters of a cup? Ask one question and wait for my attempt before giving feedback.
Predict which will leave evidence of your thinking. Keep short extracts and compare them.

Tutoring scaffold: prior knowledge → example → question → student attempt → feedback.
Prompt: I want to understand fractions in a recipe. Find out what I already know. Give a small example, ask me one question and hold back the full explanation until I have tried. Wait for my answer, then give feedback.
Repair if needed: You gave the answer too soon. Give only one hint and wait for my attempt.
Use the staged b6s2 sample if the tool is blocked; attempt each question before reading the next turn.
Close the tool and hide the saved conversation before explaining from memory in b6s3. Compare with your starting point, then check a worked example or non-AI source.
`);
workFile('workplace-brief.txt', `FICTIONAL TRAINING-CENTRE OPEN DAY — events team request and meeting notes
All details and cost records are synthetic. No personal data is needed.

Request: prepare a concise open-day cost briefing for the training centre events team, with a defensible eligible subtotal, category breakdown, mean eligible line cost and unresolved items before approval. Draft a professional email or briefing; do not send it. Spending requires the events lead's human approval after the outstanding source checks.

Preparation: the training centre supplies LibreOffice Calc, installed before the session, and Writer if you want a separate document. Download: https://www.libreoffice.org/download/ . No account is required. You can keep your final briefing in the portal's textfields.
AI route: DuckDuckGo AI Chat at https://duck.ai, free text chat without signing in. If blocked or asked for an account, payment or an unavailable feature, try https://copilot.microsoft.com without signing in; otherwise use the matching session in ai-work-sample-outputs.txt. No uploads or account-dependent office integrations are required. The sample replaces chat, not your own cleaning, calculations or final work product.

Meeting notes / data rules:
- All prices are euro per unit. Unit cost is from 0 to 500 inclusive.
- Quantity is an integer from 1 to 100. Refunds are not recorded in this export.
- Valid categories: Venue / Materials / Catering / Transport.
- Each item ID identifies one cost line; item is the description of that cost.
- Trim category whitespace, standardise category case and map Vneue to Venue.
- Convert an explicit euro price to a number without changing its value.
- Compare every field before removing an exact duplicate. Keep the first source row and log the surplus row removed.
- Hold both records of a conflicting ID until the source is checked. Do not choose the more convenient value.
- Missing and invalid quantities remain flagged, not guessed. Exclude held or invalid records from numerical analysis and name those exclusions.
- There is no attendance, income, historical comparison or complete-event-cost evidence in this brief. Known eligible costs are a partial subtotal, not a complete budget.

Method: Preserve → Profile → Define rules → Clean → Validate → Analyse → AI assist → Human review (the review document calls the last step Human verify).
Save an untouched raw_v1 and a separate working copy. Use raw data row numbers, excluding the header, throughout your log. Record every change, removal and flag; Verified by means a source, rule or record comparison, not your personal name.
Keep raw, working, profile, rules, cleaning log, validation and analysis sheets in your local workbook. Paste compact log, formulas, results and limitations into the portal; a filename alone is not assessable evidence. Imported project notes allow 4,000 characters each; add extra evidence notes for overflow.
Calculate line cost = quantity × unit cost, an eligible subtotal, category totals and mean eligible line cost with an explicit included count. Reconcile every removed or held row and retain unresolved flags. Ask AI only to critique or phrase your validated synthetic figures and limitations. In b6s5 independently check every numerical and factual claim, hand-check a line and inspect formula ranges, before signing off a chart or concise summary.
`);
workFile('data-dictionary.csv', workCsv([['field','meaning','type','unit','allowed_values_or_range','missing_or_conflict_rule','source'], ...['item_id','category','item','quantity','unit_cost_eur'].map(f=>[f,'','','','','',''])]));
workFile('cleaning-log.csv', 'Row / field,Original,Issue,Action,Reason,Verified by\n'+',,,,,\n'.repeat(10));
workFile('validation-checklist.csv', workCsv([['check','before','after','evidence_or_formula','unresolved_action'], ...['Raw preservation','Row count','Field count','Blanks','Exact duplicates','Conflicting IDs','Categories','Units','Ranges','Held rows','Reconciliation'].map(f=>[f,'','','',''])]));
workFile('human-review-checklist.csv', 'claim,spreadsheet_cell_or_source,formula_or_independent_check,verdict,change_or_removal,human_sign_off\n'+',,,,,\n'.repeat(8));
const WORK_CLAIMS = [
  ['Recorded venue costs are €100.', 'SUPPORTED', 'Eligible source rows 1 and 8: 1 × 80 + 1 × 20. This describes recorded venue costs only.'],
  ['Eligible line costs total €300.', 'WRONG', 'The seven eligible source rows total €249.00; check the formula range and exclusions.'],
  ['Attendance will rise by 20%.', 'UNCERTAIN', 'Unsupported prediction: the brief has no attendance or historical comparison evidence. Remove it; do not invent a baseline.']
];
const WORK_EDITS = [
  ['Please review the recorded costs before approving spending.', 'ACCEPTED', 'Clear, polite request consistent with the brief; the events lead must approve.'],
  ['The figures are complete and ready for approval.', 'REJECTED', 'Removes the draft caveat about unresolved items and wrongly claims completeness. The brief requires outstanding source checks before spending.']
];
workFile('sample-outputs.txt', `SYNTHETIC SAMPLES — AI for Learning & Work
These are prepared examples, not a live tool's responses. Record the sample route in your evidence. They are suggestions to test against your own thinking, spreadsheet and brief. Do not treat the samples as an answer key.

=== b6s1: answer-giving and tutoring comparison ===
Prompt A: Give me the answer: how much flour is half of a recipe that uses three quarters of a cup?
Output A: Half of three quarters is three eighths of a cup.
Prompt B (fresh conversation): Teach me through questions: how much flour is half of a recipe that uses three quarters of a cup? Wait for my attempt.
Tutor: Imagine splitting each quarter into two equal pieces. What fraction of a cup is each smaller piece?
STUDENT-ATTEMPT PAUSE: Write your own answer before reading further.
Feedback: Splitting a quarter into two makes eighths. Now how many of those smaller pieces make half of three quarters? Keep your attempt and compare which conversation shows your thinking.

=== b6s2: staged AI tutor challenge — fractions in a recipe ===
Before starting: record what you understand about halving fractions.
Prompt: Find out what I know about fractions in a recipe, give an example and ask questions. Hold back the full explanation until I have tried.
Tutor turn 1: What does the denominator tell you in one quarter of a cup?
STUDENT-ATTEMPT PAUSE: Write your attempt before reading turn 2.
Tutor turn 2 / feedback: The denominator says how many equal parts make one whole. Example: cutting a whole into four equal parts makes quarters. If you halve each quarter, how many equal parts now make the whole?
STUDENT-ATTEMPT PAUSE: Write your attempt before reading turn 3.
Tutor turn 3 / feedback: There are eight equal parts, so each is one eighth. A recipe uses three quarters of a cup. How much would half the recipe use? Explain your reasoning before asking for the full explanation.
STUDENT-ATTEMPT PAUSE: Write your answer and reasoning before reading turn 4.
Tutor turn 4 / feedback: Half of each quarter is one eighth, so half of three quarters is three eighths. Compare this reasoning with your own attempt; record what still needs another try. If an earlier turn gave away too much, record a repaired prompt asking for only one hint.
For b6s3 close this sample and explain from memory before reopening notes.

=== b6s4: suggested interpretation for Human review in b6s5 ===
Sample prompt: Suggest a concise interpretation of the synthetic budget figures I have calculated, keeping any limitations. I will check every claim independently.
Sample output:
${WORK_CLAIMS.map(c=>c[0]).join('\n')}
Use your own calculations and the source brief to check each claim in b6s5. If your live output has no error, also review this sample.

=== b6s6: professional communication editing ===
Student draft for this sample: Can the events team review these recorded costs? Some items are unresolved and need source checks before spending is approved.
Sample editing prompt: Edit for clarity and professional tone. Preserve my meaning, figures and caveats; do not invent facts.
Suggested edit:
${WORK_EDITS.map(c=>c[0]).join(' ')}
Compare every suggestion with the draft and brief; record what you accept or reject and why. Draft only: no email is sent.
`);
workFile('briefing-template.md', `# Workplace briefing

## Audience and request
Who needs this and which decision will it support?

## My own draft before AI
Write from your checked summary.

## Verified figures and formulas
Record line costs, eligible subtotal, category totals, included count, mean and exclusions. Name cells and formula ranges.

## Unresolved items
What is held or flagged? Which source must be checked?

## Suggested edits
Keep the editing prompt and short output.

## Accepted / rejected changes with reasons
Check every suggestion against the draft and evidence.

## Final concise summary (or chart, data and caption)
Include verified figures, included count and limitations.

## Disclosure
What did AI contribute and what did I check myself?

## Human approval checkpoint
Who verifies, decides or approves before spending, and what must happen first?
`);
workFile('disclosure-cards.txt', `Disclosure scenarios — decide individually; compare with a partner if available.
Choose disclose / no disclosure needed / check expectations first. Explain audience, expectations and authorship, then write what you would say or why no disclosure is needed. Explain one reasonable disagreement. There is no universal yes/no key.

1. Private brainstorming: you use AI to think of possible hobbies. Audience: yourself. What changes if you later publish the ideas?
2. Assessed work at the training centre: AI helps you practise and edit. Audience: the assessor, who expects evidence of your learning. Check the training centre's assessment expectations.
3. Drafting a CV with made-up details: AI suggests clearer wording. Audience: a hypothetical employer expecting an accurate account of skills. Could the wording imply invented experience?
4. Workplace report: AI suggests interpretations of a cost table. Audience: a team deciding how to spend money. What assistance and human checks does it need to know about?
5. Creative project: AI suggests dialogue for a fictional scene. Audience: viewers and collaborators who may have different expectations about authorship. What was agreed before making it?

Disagreement: describe two reasonable choices in one case. Which difference in expectations explains them, and whose expectations would you check?
`);
workFile('learning-contract.md', `# My AI-use learning contract
For my learning and assessed work at the training centre. Make each rule specific enough to catch myself breaking it.

## AI helps me with…
Specific learning or work tasks, and the checks I keep:

## AI does not replace…
My thinking, authorship and decisions; where I must stop and verify:

## I disclose AI use when…
What I will say, and whose expectations I will check:

## My repeatable workflow and human checkpoints
Step → who verifies → who decides → who approves → evidence needed before proceeding.
`);
// Teacher-only reference: computed from the same raw fixture, retaining source row identities.
const workSeen = new Set();
const workRetained = WORK_BUDGET.map((row,i)=>({source:i+1,row})).filter(({row})=>{const signature=JSON.stringify(row);if(workSeen.has(signature))return false;workSeen.add(signature);return true});
const workConflicts = new Set(workRetained.filter(x=>workRetained.some(y=>x.source!==y.source&&x.row[0]===y.row[0])).map(x=>x.row[0]));
const workEligible = workRetained.filter(({row})=>!workConflicts.has(row[0])&&/^\d+$/.test(row[3])&&Number(row[3])>=1&&Number(row[3])<=100).map(({source,row})=>({source,category:({materials:'Materials',transport:'Transport',Vneue:'Venue'})[row[1].trim()]||row[1].trim(),cost:Number(row[3])*Number(row[4].replace('€',''))}));
const workTotal = workEligible.reduce((n,r)=>n+r.cost,0);
writeFileSync(join('docs/teacher','ai-work-event-budget.KEY.txt'), `TEACHER KEY — Chapter 6 AI for Learning & Work. Never deploy under public/.
The raw CSV and this key use the same fixed WORK_BUDGET fixture. Data row numbers exclude the header.

RAW PROFILE: ${WORK_BUDGET.length} rows, 5 fields, 1 blank cell, 1 surplus exact-duplicate row, 2 repeated-ID groups of which 1 is conflicting, 1 invalid quantity, 3 category-normalisation cells and 1 currency-format cell.

SOURCE RECORDS (unchanged raw values):
${WORK_BUDGET.map((r,i)=>`${i+1}: ${r.join(',')}`).join('\n')}

DATA DICTIONARY:
item_id: text identifier for one cost line; unique after exact-duplicate removal; hold both conflicting records pending source check.
category: text; Venue / Materials / Catering / Transport; trim whitespace, standardise case and map Vneue to Venue per meeting notes.
item: text description; do not invent a missing description; check source if ambiguous.
quantity: integer units, 1–100 inclusive; missing/invalid values flagged and excluded, never guessed; refunds are not in this export.
unit_cost_eur: numeric euro per unit, 0–500 inclusive; remove explicit euro formatting without changing value; missing/invalid costs require a source check.
Source for all rules: fictional workplace brief and meeting notes.

DATA CLEANING LOG: Row / field | Original | Issue | Action | Reason | Verified by
2 / category | materials[trailing space] | whitespace and case | Materials | valid category | brief category rule
4 / unit_cost_eur | €1.50 | currency format | numeric 1.50 | euro per unit unchanged | brief units rule
5 / category | transport | case | Transport | valid category | brief category rule
8 / category | Vneue | spelling | Venue | explicit mapping | brief category rule
11 / whole row | E03,Catering,Juice cartons,6,3 | exact duplicate | remove surplus row 11 | all five fields match row 3 | full record comparison with source row 3
7 / item_id and quantity | E07; 2 | conflicting ID | flag and hold original record | cannot tell whether 2 or 20 is intended | compare all fields with row 12; brief conflict rule
12 / item_id and quantity | E07; 20 | conflicting ID | flag and hold original record | no source supports choosing either | compare all fields with row 7; brief conflict rule
9 / quantity | blank | missing | flag and hold; leave blank | no evidence of intended quantity | brief missing-value rule; source check needed
10 / quantity | -1 | invalid range | flag and hold; retain -1 | quantities are 1–100 and refunds not recorded | brief range rule; source check needed

VALIDATE: raw_v1 unchanged. ${workRetained.length} retained rows, 5 raw fields; 1 missing and 1 invalid quantity remain documented flags, and 2 conflicting records remain held. Exact duplicate surplus is now 0. Three category cells and one currency-format cell resolved. E03 is no longer repeated; E07 remains a conflicting ID group. Do not claim zero outstanding issues.
Reconciliation: 12 raw = 1 removed exact duplicate + 11 retained; 11 retained = 7 eligible + 4 held (source rows 7, 9, 10, 12). Keep the originals traceable; do not silently change a held value.

ANALYSE: eligible source rows ${workEligible.map(r=>r.source).join(', ')}.
${workEligible.map(r=>`Source row ${r.source}: ${r.category} line cost €${r.cost.toFixed(2)}`).join('\n')}
Eligible subtotal ${workTotal.toFixed(2)}; ${['Venue','Materials','Catering','Transport'].map(c=>`${c} ${workEligible.filter(r=>r.category===c).reduce((n,r)=>n+r.cost,0).toFixed(2)}`).join('; ')}.
Mean eligible line cost ${workTotal} / ${workEligible.length} = ${(workTotal/workEligible.length).toFixed(2)} rounded to two decimal places. Seven included rows. These are partial known costs, not the complete budget.

FORMULAS (Calc; retain source rows with header at row 1 and removed row marked): add F eligible as 1 or 0 after validation; G lineCost =IF(F2=1;D2*E2;0), copied through G13. E holds numeric working-copy prices. Subtotal =SUM(G2:G13); included count =COUNTIF(F2:F13;1); category example =SUMIF(B2:B13;"Venue";G2:G13); mean =SUM(G2:G13)/COUNTIF(F2:F13;1). The removed surplus row has F=0; both conflicts, missing and invalid quantities have F=0. Equivalent formulas or a separate eligible analysis sheet are valid if source rows reconcile. Never use 11 or 12 as the mean denominator.
Hand check: source row 4, 10 × €1.50 = €15.00. Check every formula range and every excluded record independently.

SAMPLE REVIEW:
${WORK_CLAIMS.map(([claim,verdict,why])=>`[${verdict}] ${claim} ${why}`).join('\n')}
${WORK_EDITS.map(([claim,verdict,why])=>`[${verdict}] ${claim} ${why}`).join('\n')}
Tutor b6s1: [SUPPORTED] half of three quarters is three eighths; splitting quarters in two makes eighths, by fraction arithmetic. The student must attempt the question before reading feedback.
Tutor b6s2: [SUPPORTED] a denominator counts equal parts of the whole; halving quarters makes eight equal parts; half of three quarters is three eighths. Verify using a fraction drawing or arithmetic, and compare the student's reasoning. Feedback is conditional teaching support, not proof that the student learned; b6s3's memory explanation is the evidence.
The b6s6 draft's unresolved-items caveat is [SUPPORTED] by the four held records and brief. Restore it and preserve human approval. The polite request is [ACCEPTED]; completeness is [WRONG] as a factual claim and [REJECTED] as an edit.

DISCLOSURE DISCUSSION: accept justified contextual choices, not a universal yes/no rule. Private brainstorming may need no disclosure; assessed work should follow training centre expectations; a CV must not imply invented experience; a workplace report should explain material AI assistance and human checks; creative authorship depends on audience and agreed expectations. Students may check expectations first and explain a reasonable disagreement. The learning contract should name who verifies, decides or approves before proceeding.
`);

// ---------- Chapter 7: Our AI Future. One fixed decision fixture, read from curriculum.json; answers only in docs/teacher.
const BLOCK7 = JSON.parse(readFileSync(new URL('../curriculum.json', import.meta.url), 'utf8')).blocks.find(b => b.id === 'block7');
const FUTURE = BLOCK7.sessions.find(s => s.id === 'b7s4').activity;
const FUTURE_NODE = id => FUTURE.nodes.find(n => n.id === id);
const FUTURE_CARD = id => FUTURE.evidence.find(e => e.id === id);
const FUTURE_METRICS = node => Object.fromEntries(FUTURE.metricKeys.map((k, i) => [k, node.metrics[i]]));
function futureResult(node) {
  const m = FUTURE_METRICS(node);
  const hoursReleased = FUTURE.scenario.baseline[0] - m.humanHours;
  const rateA = m.wrongA / FUTURE.scenario.groups[0][2] * 100, rateB = m.wrongB / FUTURE.scenario.groups[1][2] * 100;
  return {
    ...m, hoursReleased,
    capacityValueEUR: hoursReleased * FUTURE.scenario.hourValueEUR - m.costEUR,
    manual: 100 - m.automated - m.assisted, wrongTotal: m.wrongA + m.wrongB,
    rateA, rateB, gap: Math.abs(rateB - rateA)
  };
}
const futureBase = futureResult({ metrics: FUTURE.scenario.baseline });
const futureEUR = n => `${n < 0 ? '−' : ''}€${Math.abs(n).toFixed(2)}`;
const futureLine = node => { const r = futureResult(node);
  return `hours ${r.humanHours.toFixed(1)} (released ${r.hoursReleased.toFixed(1)}); cost ${futureEUR(r.costEUR)}; capacity value ${futureEUR(r.capacityValueEUR)}; automatic ${r.automated} / assisted ${r.assisted} / manual ${r.manual} of 100; wrong ${r.wrongTotal}/100 (A ${r.wrongA}/80 = ${r.rateA.toFixed(2)}%, B ${r.wrongB}/20 = ${r.rateB.toFixed(2)}%, gap ${r.gap.toFixed(2)} points); AI transcript retention ${r.retentionDays} days; energy index ${r.energyUnits}`; };
const futureFile = (name, text) => writeFileSync(join(OUT, `ai-future-${name}`), text);
const FUTURE_STARTS = FUTURE_NODE('start').choices;
const FUTURE_MIDS = FUTURE_STARTS.map(c => FUTURE_NODE(c.next));
const FUTURE_TERMINALS = FUTURE_MIDS.flatMap(n => n.choices.map(c => FUTURE_NODE(c.next)));
const FUTURE_TASKS = ['checking order status', 'drafting a routine reply', 'interpreting an unclear return request', 'explaining a refusal', 'resolving an unusual complaint', 'correcting a wrong record', 'supporting a customer without digital access', 'deciding an exception'];
const FUTURE_STAKEHOLDERS = ['Service worker', 'Customer', 'Service manager (employer)', 'Public-interest regulator', 'Customer needing a staffed language or access route'];
const FUTURE_CAREERS = ['teacher', 'doctor', 'farmer', 'architect', 'engineer', 'journalist', 'tradesperson', 'designer', 'accountant', 'or one of your own'];

futureFile('evidence-cards.txt', `Case evidence cards (Chapter 7, Our AI Future) — ${FUTURE.scenario.title}
Every person, observation and count here is synthetic. It is a fictional exercise, not a study of a real retailer, and none of it predicts 2035.

Role: ${FUTURE.scenario.role}. ${FUTURE.scenario.brief}

Groups in the one modelled week of 100 routine requests:
${FUTURE.scenario.groups.map(([id, label, n]) => `- Group ${id}: ${label} — ${n} requests. Group B names a support route, not a kind of person.`).join('\n')}
Baseline vector (${FUTURE.metricKeys.join(', ')}): ${FUTURE.scenario.baseline.join(', ')}.
Human task capacity is valued at €${FUTURE.scenario.hourValueEUR} per hour. Hours, costs, retention days and energy units always describe that same week of 100 requests.

=== Root cards: read all four before choosing ===
${['E1', 'E2', 'E3', 'E4'].map(id => { const c = FUTURE_CARD(id); return `${c.id} [${c.status}]\n${c.text}`; }).join('\n\n')}

=== Branch cards: each is revealed by one starting choice ===
${['EP', 'EH', 'EF', 'EN'].map(id => { const c = FUTURE_CARD(id); return `${c.id} [${c.status}]\n${c.text}`; }).join('\n\n')}

Scope and caveats:
- One small week is not a representative study, and the sandbox replay reused the development cases, so it is not independent evidence.
- Automatic, assisted and manual counts are disjoint and sum to 100. Wrong outcomes are service failures in this exercise; the model does not estimate how badly anyone was harmed.
- Rates are wrong outcomes within each group's own total. The gap between them is in percentage points, and one number does not settle fairness.
- Retention counts days of new AI transcript storage only, and the energy units are an invented comparison index. A zero does not mean the service uses no energy or holds no personal data.
- Released hours are capacity, not jobs. Nothing here supports a claim about redundancies.
`);

futureFile('career-cards.txt', `Career and domain cards (Chapter 7, Our AI Future)

=== The assessed domain: ${FUTURE.scenario.title} ===
The three-future pack is built on this one common retail domain, so every future rests on the same comparable evidence.
Tasks within the retail customer-service job — choose five for your career transformation map, with at least one judged automated, one augmented and one strongly human:
${FUTURE_TASKS.map((t, i) => `${i + 1}. ${t}`).join('\n')}
The audit measured ten staff hours on routine request handling only. The whole job also contains stock work, relationships and unusual cases, and time released is not a count of jobs lost.

Stakeholder roles for the stakeholder lens, matching the book's worker, customer or citizen, employer, regulator and someone at risk of being excluded:
${FUTURE_STAKEHOLDERS.map(s => `- ${s}`).join('\n')}

=== Optional transfer prompts: other careers and domains ===
The book's list: ${FUTURE_CAREERS.join(', ')}.
Use one of these to practise breaking a job into tasks and asking, for each task, whether it is likely to be automated, augmented or still strongly human.
Changing the assessed pack to another domain requires new evidence for that domain. Do not transplant the Harbour Co-op counts, costs, error rates or retention days into a school, hospital, farm or newsroom: they were observed in a different fictional exercise and mean nothing outside it.
`);

futureFile('career-map.csv', 'task,possible_change,evidence_and_assumption,human_capability_and_responsibility\n' + ',,,\n'.repeat(5));

futureFile('branch-cards.txt', `Branching paper walkthrough (Chapter 7, Our AI Future) — the same choices and consequences as the portal, with no recommended route.

How to use it: read the root card and its four evidence cards. Pick one starting choice, write down why and which card you are citing, then follow its "next" id to that node. Read the new evidence card there, choose again for the same reasons, and read the terminal card. Record its results. Then restart from the root with a different starting choice, three times in all, including no deployment.
There is no correct route, no winner and no score. Every terminal below is a modelled possibility, not a measured follow-up result.

Units: hours, euro and counts all describe one modelled week of 100 routine requests (80 group A, 20 group B). Vector order: ${FUTURE.metricKeys.join(', ')}.
Arithmetic: hoursReleased = ${FUTURE.scenario.baseline[0]} − humanHours; capacityValueEUR = hoursReleased × ${FUTURE.scenario.hourValueEUR} − costEUR; manual = 100 − automated − assisted; wrongTotal = wrongA + wrongB; rateA = wrongA / 80 × 100; rateB = wrongB / 20 × 100; gap = |rateB − rateA| in percentage points. Capacity value is released task capacity less extra cost, not cash profit or wages saved. A negative value is a valid result.

=== ROOT: ${FUTURE_NODE('start').id} — ${FUTURE_NODE('start').title} ===
Evidence: ${FUTURE_NODE('start').evidenceIds.join(', ')}. Metrics: none yet; the baseline is ${FUTURE.scenario.baseline.join(', ')}.
Consequence: ${FUTURE_NODE('start').consequence}
Accountability: ${FUTURE_NODE('start').accountability}
Uncertainty: ${FUTURE_NODE('start').uncertainty}
Choices:
${FUTURE_STARTS.map(c => `- [${c.id}] ${c.label} → go to ${c.next}`).join('\n')}

${FUTURE_MIDS.map(n => `=== NODE: ${n.id} — ${n.title} ===
New evidence: ${n.evidenceIds.join(', ')}. Metrics: ${n.metrics.join(', ')}.
Results: ${futureLine(n)}
Consequence: ${n.consequence}
Accountability: ${n.accountability}
Uncertainty: ${n.uncertainty}
Choices:
${n.choices.map(c => `- [${c.id}] ${c.label} → go to ${c.next}`).join('\n')}`).join('\n\n')}

${FUTURE_TERMINALS.map(n => `=== TERMINAL: ${n.id} — ${n.title} ===
Evidence: ${n.evidenceIds.join(', ')}. Metrics: ${n.metrics.join(', ')}.
Modelled results: ${futureLine(n)}
Consequence: ${n.consequence}
Accountability: ${n.accountability}
Uncertainty: ${n.uncertainty}
No further choices.`).join('\n\n')}

Record for each run: both choices, the evidence you cited, your reason, and the terminal results. Then write your three futures on the scenario canvas and decide yourself which run is optimistic, which is concerning and which is balanced.
`);

futureFile('decision-log.csv', 'run,node,choice,evidence_available,alternatives_considered,reason_chosen,consequence,would_I_decide_differently_now\n' + ',,,,,,,\n'.repeat(6));

futureFile('scenario-canvas.md', `# 2035 scenario canvas

Career or public service: ________________  Name: ________________  Date: ________

Each scenario needs a technology change, a human response, and an unintended consequence. No scenario is allowed to be “everything's fine” or “everything's ruined”.

## Optimistic

- Selected run (id and both choices):
- Technology change:
- Human response:
- Unintended consequence:
- What the case evidence supports (card id, count and its stated limit):
- What I am assuming about 2035:

## Concerning

- Selected run (id and both choices):
- Technology change:
- Human response:
- Unintended consequence:
- What the case evidence supports (card id, count and its stated limit):
- What I am assuming about 2035:

## Balanced

- Selected run (id and both choices):
- Technology change:
- Human response:
- Unintended consequence:
- What the case evidence supports (card id, count and its stated limit):
- What I am assuming about 2035:

## Stakeholder impacts

${FUTURE_STAKEHOLDERS.map(s => `- ${s}: benefits and risks across the three futures | evidence and limit | whose interests clash and which safeguard still costs something`).join('\n')}

## Future skills

- Capability 1, and the task on my map where it matters:
- Capability 2, and the task on my map where it matters:
- Capability 3, and the task on my map where it matters:
- One concrete action during TY: what, when, and evidence that I tried:

## Governance choice

- The proposal I argued for, and the strongest objection to it:
- Who can override, correct or stop the service, and how a customer reaches them:

## Final recommendation

- Approach (pilot / human+AI / full automation / no deployment) and its conditions:
- Alternative considered, who gains and who carries the risk:
- Accountable role, review or stop trigger, and the next evidence to collect:

## Evidence prompts (universal)

- Prediction: what I expected before I started.
- Attempt: what I actually did.
- Result: what happened, with the count or card that shows it.
- Surprise: what I did not expect.
- Change: what I would do differently next time.
- Transfer: where else this reasoning applies.
`);

futureFile('stakeholder-analysis.csv', 'stakeholder,three_future_impacts,evidence_and_limit,conflict_and_safeguard\n' + FUTURE_STAKEHOLDERS.map(s => `${csvField(s)},,,`).join('\n') + '\n');

futureFile('policy-cards.txt', `Policy choice cards (Chapter 7, Our AI Future)

THE PROPOSAL
"High-stakes AI decisions must always have human review."
This is a proposal for debate. It is not a description of current law, and nothing here tells you what any legal duty is.

1. Argue for it. Use your own retailer runs. Which decisions went wrong, for whom, and what would a human check have caught?
2. Argue against it. What does human review cost in time, money and delay? What does it fail to fix? Which decisions would it slow down for no benefit?
3. Distinguish routine from high-stakes. A routine order-status reply and a disputed refusal that materially affects a customer are not the same risk. Where would you draw the line, and what happens to the cases on each side of it?
4. Answer the strongest objection. Not the weakest one. Write the objection you find hardest, then your response.
5. Name who can correct, override or stop the service, and how a customer actually reaches that person.

COUNTERPOINT FROM THE CASE
${FUTURE_CARD('EH').id} [${FUTURE_CARD('EH').status}]: ${FUTURE_CARD('EH').text}
Compare the two review branches you can reach from Human+AI: ${FUTURE_NODE('human-resource').title} and ${FUTURE_NODE('human-targets').title}. An approval click is not the same thing as a person checking, and a review step alone did not remove the unequal error rates.

There is no verdict card. Two students can argue opposite positions well, and the debate reflection is where you say what changed your view or why it survived.
`);

futureFile('skills-card.md', `# Future skills card

Chosen future (which recorded run, and why it matters to me): ________________

Suggested capabilities: critical judgement, communication, empathy, domain knowledge, negotiating priorities. Choose three, or name your own and justify it. Tie each one to a task on your career transformation map, not to a general claim about the future of work.

## Capability 1

- Capability:
- Where it matters in my chosen future:
- Why, using a task from my map and a case card:

## Capability 2

- Capability:
- Where it matters in my chosen future:
- Why, using a task from my map and a case card:

## Capability 3

- Capability:
- Where it matters in my chosen future:
- Why, using a task from my map and a case card:

## One concrete action during TY

- What I will do:
- When:
- Evidence that I tried:
`);

writeFileSync(join('docs/teacher', 'ai-future-adoption.KEY.txt'), `TEACHER KEY — Chapter 7 Our AI Future, AI Adoption Decision Simulator. Never deploy under public/ and never link it as a student download.
Every path, vector and result below is computed from the same block7 decision fixture in curriculum.json that the portal and the student downloads use.

THE GRAPH: 1 root, ${FUTURE_MIDS.length} intermediate nodes, ${FUTURE_TERMINALS.length} terminals, ${FUTURE.nodes.length} nodes and ${FUTURE.nodes.reduce((n,x)=>n+((x.choices||[]).length),0)} edges. Every complete path has exactly two choices. No hidden threshold, probability, random event or extra ending exists, and metrics are replaced at each node rather than accumulated.
UNITS: one modelled week of 100 routine requests, 80 group A (standard digital) and 20 group B (language or access support). Vector order ${FUTURE.metricKeys.join(', ')}. hoursReleased = ${FUTURE.scenario.baseline[0]} − humanHours; capacityValueEUR = hoursReleased × ${FUTURE.scenario.hourValueEUR} − costEUR; manual = 100 − automated − assisted; rateA = wrongA/${FUTURE.scenario.groups[0][2]} × 100; rateB = wrongB/${FUTURE.scenario.groups[1][2]} × 100; gap = |rateB − rateA| in percentage points. Capacity value is released task capacity less extra cost: not profit, not wages saved, not a redundancy forecast. Negative values are valid results.

BASELINE / NO-DEPLOYMENT OBSERVATION: ${FUTURE.scenario.baseline.join(', ')} → ${futureBase.wrongTotal}/100 wrong, A ${futureBase.wrongA}/${FUTURE.scenario.groups[0][2]} = ${futureBase.rateA.toFixed(2)}%, B ${futureBase.wrongB}/${FUTURE.scenario.groups[1][2]} = ${futureBase.rateB.toFixed(2)}%, gap ${futureBase.gap.toFixed(2)} points, capacity value ${futureEUR(futureBase.capacityValueEUR)}.

ALL EIGHT PATH IDENTITIES AND RESULTS:
${FUTURE_MIDS.map(mid => { const start = FUTURE_STARTS.find(c => c.next === mid.id); return mid.choices.map(c => { const t = FUTURE_NODE(c.next); return `${start.id} → ${c.id} (${start.label} → ${c.label}); terminal ${t.id}; cards ${t.evidenceIds.join(' + ')}; vector ${t.metrics.join(', ')}\n  ${futureLine(t)}\n  Accountability: ${t.accountability}\n  Next evidence: ${t.uncertainty}`; }).join('\n'); }).join('\n')}

INTERMEDIATE OBSERVATIONS (shown before the second choice):
${FUTURE_MIDS.map(n => `${n.id} (card ${n.evidenceIds.join(', ')}): ${futureLine(n)}`).join('\n')}

CONCEPT QUIZ KEY (b7s2, "A task, a general capability, or a forecast?"):
${BLOCK7.sessions.find(s => s.id === 'b7s2').activity.items.map(([q, a], i) => `${i + 1}. ${q} → ${a}`).join('\n')}
The three sortable kinds are a narrow system trained for specific tasks, the hypothesis of broad human-like capability, and an uncertain forecast about the future. A convincing performance on one task settles nothing about general capability, and a stated arrival year is a forecast however confidently it is written.

OBSERVATION VERSUS ASSUMPTION:
Observations inside this fiction: E1 (the audit week), E2 (the sandbox replay), E3 (what people said), and the four branch observations EP/EH/EF/EN. Assumptions: everything in E4 — the €${FUTURE.scenario.hourValueEUR} hour value, the unknown purchase cost, the retention definition and the invented energy index — plus every terminal vector, which is a modelled possibility and not a measured follow-up.
Limitations of the reused small sample: E2 replays the same 100 cases used while developing the prototype, so it cannot evidence future performance; E1 is one week of one part of one job; no customer consultation or workforce agreement exists (E3). Counts this small move by whole requests, so a one-request difference in group B shifts rateB by ${(100/FUTURE.scenario.groups[1][2]).toFixed(2)} points.

DISCUSSION POINTS:
- Task versus job. The measured ten hours cover routine request handling only. Released capacity is time someone must decide how to use; it is not evidence about jobs. Expect students to name the tasks the audit never measured.
- Residual risk. No terminal reaches zero wrong outcomes. ${FUTURE_NODE('human-resource').id} is the lowest at ${futureResult(FUTURE_NODE('human-resource')).wrongTotal}/100 and still leaves B at ${futureResult(FUTURE_NODE('human-resource')).rateB.toFixed(2)}%; ${FUTURE_NODE('full-speed').id} reaches a gap of ${futureResult(FUTURE_NODE('full-speed')).gap.toFixed(2)} points.
- Privacy. Retention counts new AI transcript days only. The no-deployment routes show 0 because no new AI transcripts exist, not because the service holds no personal data.
- Exclusion. Group B is a support route. Every route that improves the headline figures should be checked against what happens to the customer who needs a staffed phone or counter.
- Accountability. The retailer stays responsible when a supplier runs the model; forwarding complaints does not transfer the duty. A named role who can override, correct, pause or stop is the test of a governance answer.
- Sustainability. The energy index is invented for comparison only. Do not let it be quoted as kWh or carbon.

HOW OPPOSING RECOMMENDATIONS ARE BOTH JUSTIFIED:
A student prioritising equal service quality can defend ${FUTURE_NODE('human-resource').id} or ${FUTURE_NODE('pilot-support').id}: the smallest gaps, at the cost of most of the capacity gain (capacity value ${futureEUR(futureResult(FUTURE_NODE('human-resource')).capacityValueEUR)} and ${futureEUR(futureResult(FUTURE_NODE('pilot-support')).capacityValueEUR)}).
A student prioritising capacity under stated safeguards can defend ${FUTURE_NODE('full-audit').id}: appeals and short retention with automation retained.
A student prioritising precaution can defend ${FUTURE_NODE('none-train').id} or ${FUTURE_NODE('none-wait').id}: no new AI exposure, modest or no improvement, existing errors unchanged.
A fully developed no-deployment recommendation earns the same formative level as a supported pilot or human+AI recommendation. ${FUTURE_NODE('full-speed').id} has the highest capacity value, ${futureEUR(futureResult(FUTURE_NODE('full-speed')).capacityValueEUR)}, and the worst group B outcome; the highest number is not the answer.

UNSUPPORTED CLAIMS TO CHALLENGE:
- "Eight released hours means jobs will go." The model values capacity, not employment, and E3 records the opposite request from workers.
- "No AI means no risk." ${FUTURE_NODE('none-wait').id} keeps ${futureResult(FUTURE_NODE('none-wait')).wrongTotal}/100 wrong and a ${futureResult(FUTURE_NODE('none-wait')).gap.toFixed(2)}-point gap, and the queue and access difficulties remain.
- "An audit removes the harm." ${FUTURE_NODE('full-audit').id} still leaves ${futureResult(FUTURE_NODE('full-audit')).wrongTotal}/100 wrong and a customer may suffer an error before any appeal.
- "Human review guarantees oversight." ${FUTURE_NODE('human-targets').id} shows approvals rising and errors with them.
- "The sandbox shows it works." E2 reuses the development cases and is not independent evidence.
- "The optimistic future is the one with the best numbers." Students assign the three labels themselves and must justify each from their own runs.

NO TERMINAL IS CORRECT. There is no combined score and no ranked outcome anywhere in the fixture. Assess the reasoning, the cited evidence, the alternative considered, the named accountable role and the stated trigger — not which approach the student chose.
`);

rmSync(WORK, { recursive: true, force: true });
const manifest =Object.fromEntries(readdirSync(OUT).filter(f => !f.startsWith('.')).sort().map(f => [f, statSync(join(OUT, f)).size]));
// Include the manifest's own byte size without depending on the previous run.
let manifestText;
do { manifestText = JSON.stringify(manifest, null, 2) + '\n'; manifest['manifest.json'] = Buffer.byteLength(manifestText); } while (Buffer.byteLength(JSON.stringify(manifest, null, 2) + '\n') !== Buffer.byteLength(manifestText));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
