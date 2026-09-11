// Full student-and-teacher journey through the live UI with real clicks and typing, screenshot per step.
// Not part of `npm test`. Usage:
//   ACCEPTANCE_BASE_URL=https://preview-main.ty-ai-learning.pages.dev SHOTS=/path/to/dir node tests/acceptance/live-walkthrough.mjs
// Writes <SHOTS>/NN-step.png and <SHOTS>/summary.json. Creates and deletes two throwaway auth users.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, REF, check, results, createUser, cleanup, CAPSTONE1_ANSWERS } from './lib.mjs';

const SHOTS = process.env.SHOTS || 'live-shots';
mkdirSync(SHOTS, { recursive: true });
const STORAGE_KEY = `sb-${REF}-auth-token`;
let shotIndex = 0;
const steps = [];
async function step(page, name, fn) {
  const started = Date.now();
  let ok = true, detail = '';
  try { const r = await fn(); if (r === false) ok = false; if (typeof r === 'string') detail = r; } catch (e) { ok = false; detail = e.message.split('\n')[0]; }
  const file = `${String(++shotIndex).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  try { await page.screenshot({ path: join(SHOTS, file), fullPage: false }); } catch { /* page may be closed */ }
  steps.push({ name, ok, detail, file, ms: Date.now() - started });
  check(name, ok, detail);
}
const long = (t) => `${t} This sentence makes the answer long enough to show reasoning and evidence in my own words.`;

async function device(browser, session, path = '/') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  if (session) await page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(session)]);
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  return { context, page };
}
async function fillTextfields(page, n) { const areas = await page.$$('textarea[data-i]'); for (let i = 0; i < areas.length; i++) await areas[i].fill(long(`Answer ${i + 1} of ${n}.`)); return areas.length; }
async function saveSession(page, expectNext) {
  await page.fill('#reflectionText', long('My reflection in my own words.'));
  await page.click('#saveSession');
  await page.waitForFunction(() => /complete/i.test(document.getElementById('lessonFeedback')?.textContent || ''), null, { timeout: 10000 });
  const fb = await page.textContent('#lessonFeedback');
  if (/Finish the required|Add a little more/i.test(fb)) throw new Error(fb);
  if (expectNext) await page.waitForFunction((id) => document.querySelector('.session-link.active')?.dataset.session === id, expectNext, { timeout: 10000 });
  return fb;
}

const users = [];
const browser = await chromium.launch();
try {
  const student = await createUser('student'); users.push(student);
  const admin = await createUser('admin', { role: 'admin' }); users.push(admin);

  // ---------- anonymous visitor
  let { context, page } = await device(browser, null);
  await step(page, 'Home page loads for a signed-out visitor', async () => (await page.textContent('#syncStatus')).includes('Local mode'));
  await context.close();

  // ---------- student, chapter 1
  ({ context, page } = await device(browser, student.session));
  await page.waitForFunction(() => /Welcome/.test(document.getElementById('welcomeName')?.textContent || ''), null, { timeout: 15000 });
  await step(page, 'Student signed in, cloud synced', async () => (await page.textContent('#syncStatus')).includes('Cloud'));
  await page.click('[data-block="0"]');
  await page.waitForSelector('#labBanner .lab-stage');
  await step(page, 'Chapter 1 opens with mission and six lab stages', async () => (await page.$$('#labBanner .lab-stage')).length === 6);

  await step(page, 'Session 1 quiz: choose every answer, save reflection', async () => {
    for (const sel of await page.$$('select[data-i]')) await sel.selectOption({ index: 1 });
    return await saveSession(page, 'b1lab');
  });
  await step(page, 'Lab session: acknowledge safety notice, tool link enables, downloads listed', async () => {
    await page.check('[data-ack]');
    const enabled = await page.$eval('#labToolLink', el => !el.classList.contains('disabled'));
    const dl = (await page.$$('.downloads a[download]')).length;
    return enabled && dl >= 2 ? `downloads=${dl}` : false;
  });
  await step(page, 'Lab session: record evidence in five fields and save', async () => { await fillTextfields(page, 5); return await saveSession(page, 'b1s2'); });
  await step(page, 'AI in My Day map: five systems, two full chains, save', async () => {
    for (let i = 0; i < 5; i++) { await page.fill(`input[data-i="${i}"][data-f="service"]`, ['Spotify', 'Maps', 'Spam filter', 'Face unlock', 'Autocorrect'][i]); }
    for (let i = 0; i < 2; i++) for (const f of ['input', 'action', 'output', 'benefit', 'risk']) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, `${f} value`);
    return await saveSession(page, 'b1s3');
  });
  await step(page, 'Human vs AI: four responses, save', async () => { await fillTextfields(page, 4); return await saveSession(page, 'b1s4'); });
  await step(page, 'Exit reflection: save, chapter practical work complete', async () => { await fillTextfields(page, 2); const fb = await saveSession(page, null); return /chapter assessment/i.test(fb) ? fb : false; });
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]', { timeout: 10000 });
  await step(page, 'Capstone card shows lab evidence and three prompts', async () => {
    const hasLab = await page.$('#chapterCapstoneHost .lab-evidence');
    return Boolean(hasLab) && (await page.$$('textarea[data-capstone]')).length === 3;
  });
  await step(page, 'Submit chapter 1 capstone, formative level returned', async () => {
    const answers = Object.values(CAPSTONE1_ANSWERS);
    const areas = await page.$$('textarea[data-capstone]');
    for (let i = 0; i < areas.length; i++) await areas[i].fill(answers[i]);
    await page.click('#submitCapstone');
    await page.waitForFunction(() => /COMPLETE/.test(document.getElementById('chapterCapstoneHost')?.textContent || ''), null, { timeout: 20000 });
    const txt = await page.textContent('#chapterCapstoneHost');
    const m = txt.match(/Getting started|Getting there|Going further/);
    return m ? `level: ${m[0]}` : false;
  });
  await page.click('#homeBtn');
  await step(page, 'Home: Chapter 1 done, Chapter 2 unlocked, badge awarded', async () => {
    const done = await page.$eval('[data-block="0"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="1"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });

  // ---------- student, chapter 2 (reload so the workspace launcher initialises with the new unlock)
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => /Welcome/.test(document.getElementById('welcomeName')?.textContent || ''), null, { timeout: 15000 });
  await page.click('[data-block="1"]');
  await page.waitForSelector('#labBanner .lab-stage');
  await step(page, 'Chapter 2 opens; Project Workspace launcher present', async () => { await page.waitForSelector('#projectWorkspaceBtn', { timeout: 15000 }); return true; });
  await step(page, 'Be the classifier: save', async () => { await fillTextfields(page, 4); return await saveSession(page, 'b2s2'); });
  await step(page, 'Train v1 lab: safety gate, training set download, evidence, save', async () => {
    await page.check('[data-ack]');
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    await fillTextfields(page, 4);
    const fb = await saveSession(page, 'b2s3');
    return dl.some(h => /training-v1/.test(h)) ? `${fb} downloads=${dl.length}` : false;
  });
  await step(page, 'Test log: ten rows, mixed results, save', async () => {
    for (let i = 0; i < 10; i++) {
      await page.selectOption(`select[data-r="${i}"][data-f="actual"]`, { index: 1 + (i % 2) });
      await page.selectOption(`select[data-r="${i}"][data-f="prediction"]`, { index: 1 + ((i === 3 || i === 7) ? (i + 1) % 2 : i % 2) });
      await page.fill(`input[data-r="${i}"][data-f="note"]`, i === 3 || i === 7 ? 'dark background' : 'clear');
    }
    return await saveSession(page, 'b2s4');
  });
  await step(page, 'Confusion matrix: counts entered, accuracy calculated, save', async () => {
    for (const [k, v] of [['cc', 4], ['cb', 1], ['bc', 1], ['bb', 4]]) await page.fill(`input[data-m="${k}"]`, String(v));
    await page.click('#calcMatrix');
    const res = await page.textContent('#matrixResult');
    const fb = await saveSession(page, 'b2s5');
    return /80%/.test(res) ? `${res} · ${fb}` : res;
  });
  await step(page, 'Shortcut experiment: trap set download listed, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    await fillTextfields(page, 4);
    const fb = await saveSession(page, 'b2s6');
    return dl.some(h => /shortcut-trap/.test(h)) ? fb : false;
  });
  await step(page, 'Improve v2: save', async () => { await fillTextfields(page, 4); return await saveSession(page, 'b2s7'); });
  await step(page, 'Compare and reflect: save, chapter 2 practical complete', async () => { await fillTextfields(page, 4); return await saveSession(page, null); });

  // ---------- project workspace
  await page.click('#projectWorkspaceBtn');
  await page.waitForSelector('#projectWorkspaceModal.open', { timeout: 15000 });
  await step(page, 'Project Workspace opens with brief and acceptance criteria', async () => (await page.$$('#projectWorkspaceModal li')).length >= 6);
  await step(page, 'Import lab evidence adds evidence items', async () => {
    await page.click('#pwImportLab');
    await page.waitForFunction(() => /Imported/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    const n = (await page.$$('#pwEvidence .pw-evidence')).length;
    return n >= 3 ? `${await page.textContent('#pwMessage')} (${n} items)` : `only ${n} items`;
  });
  await step(page, 'Work log entry and recommendation, save', async () => {
    await page.click('#pwAddLog');
    await page.fill('#pwLog .pw-entry textarea[data-f="did"]', 'Trained v1 on the drawn set, ran the shortcut trap, trained v2 on the balanced set.');
    await page.fill('#pwLog .pw-entry textarea[data-f="result"]', 'v1 got 4/10 on swapped backgrounds; v2 got 9/10.');
    await page.fill('#pwRecommendation', long('Recommend v2 with balanced backgrounds; v1 learned the desk colour, not the object.'));
    await page.click('#pwSave');
    await page.waitForFunction(() => /Saved/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('#pwMessage');
  });
  await step(page, 'Submit project', async () => {
    await page.click('#pwSubmit');
    await page.waitForFunction(() => /submitted/i.test(document.querySelector('.pw-status')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('.pw-status');
  });
  await page.click('.pw-close');
  await page.click('#portfolioBtn');
  await step(page, 'Portfolio shows progress and badge', async () => /100%|9\d%/.test(await page.textContent('#portfolioPct')));
  await context.close();

  // ---------- teacher
  ({ context, page } = await device(browser, admin.session, '/admin'));
  await page.waitForSelector('#studentRows [data-student]', { timeout: 20000 });
  await step(page, 'Admin dashboard lists students with metrics', async () => Number(await page.textContent('#metricStudents')) >= 1);
  await page.fill('#studentSearch', student.displayName);
  await page.click(`[data-student="${student.id}"]`);
  await page.waitForFunction(() => !document.getElementById('studentDetail').classList.contains('hidden'), null, { timeout: 15000 });
  await page.waitForFunction(() => !/Loading student evidence/.test(document.getElementById('detailContent')?.textContent || ''), null, { timeout: 20000 });
  await step(page, 'Student detail shows reflections, activity and lab evidence', async () => {
    const txt = await page.textContent('#detailContent');
    return /Safety notice acknowledged/.test(txt) && /Reflection/.test(txt);
  });
  await page.waitForSelector('#projectReviewPanel [data-review-project]', { timeout: 15000 });
  await step(page, 'Teacher reviews the submitted project', async () => {
    await page.fill('#projectReviewPanel [data-review-comment]', 'Clear evidence of the shortcut and a fair retest. Well done.');
    await page.click('#projectReviewPanel [data-review-project]');
    await page.waitForFunction(() => /reviewed/i.test(document.getElementById('projectReviewPanel')?.textContent || ''), null, { timeout: 15000 });
    return true;
  });
  await context.close();

  // ---------- student sees the review on a new device
  ({ context, page } = await device(browser, student.session));
  await page.waitForSelector('#projectWorkspaceBtn', { timeout: 20000 });
  await page.click('#projectWorkspaceBtn');
  await page.waitForSelector('#projectWorkspaceModal.open', { timeout: 15000 });
  await step(page, 'Student sees reviewed status and teacher comment on another device', async () => {
    const txt = await page.textContent('#projectWorkspaceModal');
    return /reviewed/i.test(txt) && /Well done/.test(txt);
  });
  await context.close();

  // ---------- non-admin blocked
  ({ context, page } = await device(browser, student.session, '/admin'));
  await page.waitForFunction(() => (document.getElementById('gateMessage')?.textContent || '').length > 0, null, { timeout: 15000 });
  await step(page, 'Student is refused on the admin page', async () => /not authorised/i.test(await page.textContent('#gateMessage')));
  await context.close();
} catch (error) {
  check('walkthrough completed without exception', false, error.message);
} finally {
  await browser.close();
  await cleanup(users);
}
writeFileSync(join(SHOTS, 'summary.json'), JSON.stringify({ base: BASE, ran: new Date().toISOString(), steps, results }, null, 2));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${BASE}`);
process.exit(failed ? 1 : 0);
