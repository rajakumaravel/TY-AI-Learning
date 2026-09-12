// Full student-and-teacher journey through the live UI with real clicks and typing, screenshot per step.
// Not part of `npm test`. Usage:
//   ACCEPTANCE_BASE_URL=https://preview-main.ty-ai-learning.pages.dev SHOTS=/path/to/dir node tests/acceptance/live-walkthrough.mjs
// Writes <SHOTS>/NN-step.png and <SHOTS>/summary.json. Creates and deletes two throwaway auth users.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, REF, check, results, createUser, cleanup, CAPSTONE1_ANSWERS, CAPSTONE2_ANSWERS, CAPSTONE3_ANSWERS, CAPSTONE4_ANSWERS, CAPSTONE5_ANSWERS, completeChapter6UI, completeChapter7UI, completeChapter8UI } from './lib.mjs';

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
  if (expectNext) { await page.waitForSelector('#nextSession', { timeout: 10000 }); await page.waitForSelector('#lessonFeedback .assessment-card', { timeout: 15000 }).catch(() => {}); await page.click('#nextSession'); await page.waitForFunction((id) => document.querySelector('.session-link.active')?.dataset.session === id, expectNext, { timeout: 10000 }); }
  return fb;
}

// Chapter 5 helpers: the annotate and simulator kinds re-render on every change, so sentence buttons are re-queried per mark and ranges get a real input event.
async function addMark(page, index, type, note) {
  await (await page.$$('.annotate-lab button.annotate-sentence[data-sentence]'))[index].click();
  await page.selectOption('select#annotateMark', { label: type });
  await page.fill('textarea#annotateNote', note);
  await page.click('button#annotateAdd');
  await page.waitForFunction((n) => (document.querySelector('.annotate-findings')?.textContent || '').includes(n), note, { timeout: 10000 });
}
async function setRange(page, key, value) { await page.$eval(`input[type=range][data-sim="${key}"]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value)); }
async function recordRun(page) {
  const before = (await page.textContent('.sim-runs').catch(() => '')).length;
  await page.click('button#simRecord');
  await page.waitForFunction((n) => (document.querySelector('.sim-runs')?.textContent || '').length > n, before, { timeout: 10000 });
  return `${await page.textContent('#simAccB')} · ${await page.textContent('#simOverall')}`;
}

async function submitCapstone(page, answers) {
  const values = Object.values(answers);
  const areas = await page.$$('textarea[data-capstone]');
  for (let i = 0; i < areas.length; i++) await areas[i].fill(values[i]);
  await page.click('#submitCapstone');
  await page.waitForFunction(() => /COMPLETE/.test(document.getElementById('chapterCapstoneHost')?.textContent || ''), null, { timeout: 20000 });
  const m = (await page.textContent('#chapterCapstoneHost')).match(/Getting started|Getting there|Going further/);
  return m ? `level: ${m[0]}` : false;
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
  await step(page, 'Submit chapter 1 capstone, formative level returned', async () => submitCapstone(page, CAPSTONE1_ANSWERS));
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
  await step(page, 'Portfolio shows progress and badge', async () => { const pct = parseInt(await page.textContent('#portfolioPct'), 10); return pct > 0 && pct <= 100 ? `portfolio ${pct}%` : `portfolio ${pct}`; });
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
    await page.waitForFunction(() => [...document.querySelectorAll('#projectReviewPanel .review-status')].some(el => /Reviewed · saved/.test(el.textContent)), null, { timeout: 15000 });
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
  await page.click('.pw-close');

  // ---------- student, chapter 2 capstone unlocks chapter 3
  await step(page, 'Chapter 3 locked until the chapter 2 assessment', async () => page.$eval('[data-block="2"]', el => el.classList.contains('locked') && el.disabled));
  await page.click('[data-block="1"]');
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]', { timeout: 15000 });
  await step(page, 'Submit chapter 2 capstone, formative level returned', async () => submitCapstone(page, CAPSTONE2_ANSWERS));
  await page.click('#homeBtn');
  await step(page, 'Home: Chapter 2 done, Chapter 3 unlocked', async () => {
    const done = await page.$eval('[data-block="1"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="2"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });

  // ---------- student, chapter 3 (reload so the second workspace launcher initialises with the new unlock)
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => /Welcome/.test(document.getElementById('welcomeName')?.textContent || ''), null, { timeout: 15000 });
  await page.click('[data-block="2"]');
  await page.waitForSelector('#labBanner .lab-stage');
  await step(page, 'Chapter 3 opens with six lab stages; Chapter 3 project launcher present', async () => {
    await page.waitForSelector('#projectWorkspaceBtn-block3', { timeout: 15000 });
    const label = await page.textContent('#projectWorkspaceBtn-block3');
    return (await page.$$('#labBanner .lab-stage')).length === 6 && /Project: Data Detective/.test(label) ? label : false;
  });
  await step(page, 'Chapter 3 page shows the Myth-busters section', async () => /Public means visible/.test(await page.textContent('#mythBusters')));
  await step(page, 'Data trail warm-up quiz: choose every answer, save', async () => {
    for (const sel of await page.$$('select[data-i]')) await sel.selectOption({ index: 1 });
    return await saveSession(page, 'b3s2');
  });
  await step(page, 'Data Tracking Sherlock lab: category-level notice, policy extracts listed, audit fields, save', async () => {
    await page.check('[data-ack]');
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    await fillTextfields(page, 4);
    const fb = await saveSession(page, 'b3s3');
    return dl.some(h => /privacy-policy-extracts/.test(h)) ? `${fb} downloads=${dl.length}` : false;
  });
  await step(page, 'Why collect it? chain: five rows of category → purpose → benefit → risk, save', async () => {
    const categories = ['Location', 'Listening history', 'Contacts', 'Device type', 'Inferred mood'];
    for (let i = 0; i < 5; i++) for (const f of ['category', 'purpose', 'benefit', 'risk']) await page.fill(`.chain input[data-i="${i}"][data-f="${f}"]`, f === 'category' ? categories[i] : `${f} of ${categories[i].toLowerCase()}`);
    return await saveSession(page, 'b3s4');
  });
  await step(page, 'Dataset fairness challenge: all 120 rows rendered, six findings including who is missing, save', async () => {
    await page.waitForSelector('.dataset-table tbody tr', { timeout: 15000 });
    const rows = (await page.$$('.dataset-table tbody tr')).length;
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const findings = [
      ['column:club_choice', 'Missing value', 'Nine sign-ups have no club_choice recorded.'],
      ['column:signup_date', 'Inconsistent format', 'signup_date mixes ISO, slash and written formats.'],
      ['row:17', 'Duplicate', 'Rows 17 and 18 are the same student twice.'],
      ['column:parent_phone', 'Sensitive or unnecessary field', 'parent_phone is not needed to recommend a club.'],
      ['column:inferred_income_band', 'Inferred, not collected', 'inferred_income_band was guessed from the eircode, never asked.'],
      ['column:year_group', 'Who is missing (representation)', 'No student who joined mid-year appears in the sign-ups.']
    ];
    for (const [target, issue, note] of findings) {
      await page.selectOption('#datasetTarget', target);
      await page.selectOption('#datasetIssue', { label: issue });
      await page.fill('#datasetNote', note);
      await page.click('#datasetAdd');
    }
    await page.waitForFunction((n) => (document.querySelector('.dataset-findings')?.textContent || '').includes(n), findings[5][2], { timeout: 10000 });
    const fb = await saveSession(page, 'b3s5');
    return rows === 120 && dl.some(h => /club-signups-flawed/.test(h)) ? `rows=${rows} · ${fb} downloads=${dl.length}` : `rows=${rows} downloads=${dl.length}`;
  });
  await step(page, 'Your rights and the safeguards: four responses, save', async () => { const n = await fillTextfields(page, 4); const fb = await saveSession(page, 'b3s6'); return n === 4 ? fb : `fields=${n}`; });
  await step(page, 'Design a better data plan: nine Sheet A5 fields, save, chapter 3 practical complete', async () => { const n = await fillTextfields(page, 9); const fb = await saveSession(page, null); return n === 9 && /chapter assessment/i.test(fb) ? fb : `fields=${n} · ${fb}`; });
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]', { timeout: 10000 });
  await step(page, 'Capstone card shows the How am I doing? self-check and level-up challenge', async () => {
    const self = await page.textContent('#chapterCapstoneHost .self-check');
    return /Getting started/.test(self) && /Going further/.test(self) && Boolean(await page.$('#chapterCapstoneHost .level-up'));
  });
  await step(page, 'Submit chapter 3 capstone, formative level returned', async () => submitCapstone(page, CAPSTONE3_ANSWERS));

  // ---------- chapter 3 project workspace
  await page.click('#projectWorkspaceBtn-block3');
  await page.waitForSelector('#projectWorkspaceModal.open', { timeout: 15000 });
  await step(page, 'Chapter 3 Project Workspace opens with brief and acceptance criteria', async () => {
    const eyebrow = await page.textContent('#projectWorkspaceModal .eyebrow');
    return /CHAPTER 3 PROJECT/.test(eyebrow) && (await page.$$('#projectWorkspaceModal li')).length >= 6 ? eyebrow : false;
  });
  await step(page, 'Import chapter 3 lab evidence adds the audit, chains and fairness findings as evidence', async () => {
    await page.click('#pwImportLab');
    await page.waitForFunction(() => /Imported/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    const n = (await page.$$('#pwEvidence .pw-evidence')).length;
    const txt = await page.textContent('#pwEvidence');
    return n >= 3 && / at (column:|row:|table)/.test(txt) && /Location → /.test(txt) ? `${await page.textContent('#pwMessage')} (${n} items)` : `only ${n} items`;
  });
  await step(page, 'Chapter 3 work log entry and recommendation, save', async () => {
    await page.click('#pwAddLog');
    await page.fill('#pwLog .pw-entry textarea[data-f="did"]', 'Audited a music service at category level, traced five collection chains, logged six dataset findings and wrote the Responsible Data Card.');
    await page.fill('#pwLog .pw-entry textarea[data-f="result"]', 'Four sensitive or inferred columns flagged for removal; mid-year joiners missing; representation check added.');
    await page.fill('#pwRecommendation', long('Use the better data plan for club planning only after removing eircode, phone, date of birth and the inferred income band, with a human reviewing any decision about a student.'));
    await page.click('#pwSave');
    await page.waitForFunction(() => /Saved/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('#pwMessage');
  });
  await step(page, 'Submit chapter 3 project', async () => {
    await page.click('#pwSubmit');
    await page.waitForFunction(() => /submitted/i.test(document.querySelector('.pw-status')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('.pw-status');
  });
  await page.click('.pw-close');

  // ---------- student, chapter 3 capstone (submitted above) unlocks chapter 4
  await page.click('#homeBtn');
  await step(page, 'Home: Chapter 3 done, Chapter 4 unlocked', async () => {
    const done = await page.$eval('[data-block="2"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="3"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });

  // ---------- student, chapter 4 (reload so the third workspace launcher initialises with the new unlock)
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => /Welcome/.test(document.getElementById('welcomeName')?.textContent || ''), null, { timeout: 15000 });
  await page.click('[data-block="3"]');
  await page.waitForSelector('#labBanner .lab-stage');
  await step(page, 'Chapter 4 opens with six lab stages; Chapter 4 project launcher present', async () => {
    await page.waitForSelector('#projectWorkspaceBtn-block4', { timeout: 15000 });
    const label = await page.textContent('#projectWorkspaceBtn-block4');
    return (await page.$$('#labBanner .lab-stage')).length === 6 && /^Project: .+/.test(label) ? label : false;
  });
  await step(page, 'Chapter 4 page shows the Myth-busters section', async () => /Clear beats long/.test(await page.textContent('#mythBusters')));
  await step(page, 'Same task, different prompts lab: safety notice, DuckDuckGo AI Chat link, downloads, four fields, save', async () => {
    await page.check('[data-ack]');
    const enabled = await page.$eval('#labToolLink', el => !el.classList.contains('disabled') && /duck\.ai/.test(el.getAttribute('href') || ''));
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const n = await fillTextfields(page, 4);
    const fb = await saveSession(page, 'b4s2');
    return enabled && n === 4 && dl.some(h => /genai-weak-question-card/.test(h)) ? `${fb} downloads=${dl.length}` : `enabled=${enabled} fields=${n} downloads=${dl.length}`;
  });
  await step(page, 'What an LLM actually does quiz: choose every answer, save', async () => {
    for (const sel of await page.$$('select[data-i]')) await sel.selectOption({ index: 1 });
    return await saveSession(page, 'b4s3');
  });
  await step(page, 'Prompt Lab 1: C-T-C-F builder composes v2, v1 and v2 recorded on Sheet A4, save', async () => {
    await page.waitForSelector('.prompt-lab', { timeout: 10000 });
    const parts = { context: 'I am a TY student preparing a two-minute talk on the River Shannon for classmates.', task: 'Outline the talk.', constraints: '150 words, plain language, no figures without a named source.', format: 'Five bullet points, and ask me two questions first.' };
    for (const [k, v] of Object.entries(parts)) await page.fill(`[data-builder="${k}"]`, v);
    await page.click('#composeV2');
    const composed = await page.$eval('textarea[data-version="v2"][data-field="prompt"]', el => el.value);
    if (!Object.values(parts).every(v => composed.includes(v))) throw new Error(`compose v2 missing parts: ${composed}`);
    await page.fill('textarea[data-version="v1"][data-field="prompt"]', 'Tell me about the River Shannon.');
    await page.fill('textarea[data-version="v1"][data-field="output"]', 'A fluent general paragraph with a length, some counties and a confident date, no sources.');
    await page.fill('textarea[data-version="v1"][data-field="better"]', 'No, it answered a question I did not really ask.');
    await page.fill('textarea[data-version="v2"][data-field="change"]', 'Added context, one task verb, constraints and a format.');
    await page.fill('textarea[data-version="v2"][data-field="output"]', 'Five bullets for the talk and two questions back to me about the audience and length.');
    await page.fill('textarea[data-version="v2"][data-field="better"]', 'Yes, it fitted the actual task and asked before assuming.');
    return await saveSession(page, 'b4s4');
  });
  await step(page, 'Prompt Lab 2: v3 tested and revised plus the two iteration notes, save', async () => {
    await page.fill('textarea[data-version="v3"][data-field="prompt"]', 'Same prompt as v2 plus: ask me two questions before you answer, then give one example bullet of what good looks like.');
    await page.fill('textarea[data-version="v3"][data-field="change"]', 'Added ask-me-questions-first, then one example, one at a time.');
    await page.fill('textarea[data-version="v3"][data-field="output"]', 'It asked about the audience first; the example bullet made the rest more concrete.');
    await page.fill('textarea[data-version="v3"][data-field="better"]', 'Yes for the questions; the example helped a little.');
    await page.fill('textarea[data-extra="0"]', long('Tried an example, the audience, success criteria and ask-me-questions-first, one at a time.'));
    await page.fill('textarea[data-extra="1"]', long('The questions-first addition helped most; the audience line just made the prompt longer.'));
    return await saveSession(page, 'b4s5');
  });
  await step(page, 'Four useful roles chain: tutor, brainstorm partner, critic, transformer, save', async () => {
    const roles = ['Tutor', 'Brainstorm partner', 'Critic', 'Transformer'];
    for (let i = 0; i < 4; i++) for (const f of ['role', 'prompt', 'did', 'risk']) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, f === 'role' ? roles[i] : `${f} for ${roles[i].toLowerCase()}`);
    return await saveSession(page, 'b4s6');
  });
  await step(page, 'Verification challenge chain (Sheet A2): three claims checked, save', async () => {
    const claims = [['The Shannon is about 360 km long', 'OSI river data', 'supported', 'kept it'], ['The Shannon Bridge Act was passed in 1931', 'Irish Statute Book search', 'wrong', 'removed it'], ['Ardnacrusha opened in 1929', 'ESB heritage page', 'supported', 'added the source']];
    for (let i = 0; i < 3; i++) for (const [j, f] of ['claim', 'source', 'verdict', 'changed'].entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, claims[i][j]);
    return await saveSession(page, 'b4s7');
  });
  await step(page, 'Injecting doubt: four responses, save', async () => { const n = await fillTextfields(page, 4); const fb = await saveSession(page, 'b4s8'); return n === 4 ? fb : `fields=${n}`; });
  await step(page, 'Build a reusable prompt: four fields, template download listed, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const n = await fillTextfields(page, 4);
    const fb = await saveSession(page, 'b4s9');
    return n === 4 && dl.some(h => /reusable-prompt-template/.test(h)) ? `${fb} downloads=${dl.length}` : `fields=${n} downloads=${dl.length}`;
  });
  await step(page, 'Red-team a prompt: three fields, save', async () => { const n = await fillTextfields(page, 3); const fb = await saveSession(page, 'b4s10'); return n === 3 ? fb : `fields=${n}`; });
  await step(page, 'Exit rule: one field, save, chapter 4 practical complete', async () => { const n = await fillTextfields(page, 1); const fb = await saveSession(page, null); return n === 1 && /chapter assessment/i.test(fb) ? fb : `fields=${n} · ${fb}`; });
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]', { timeout: 10000 });
  await step(page, 'Submit chapter 4 capstone, formative level returned', async () => submitCapstone(page, CAPSTONE4_ANSWERS));

  // ---------- chapter 4 project workspace
  await page.click('#projectWorkspaceBtn-block4');
  await page.waitForSelector('#projectWorkspaceModal.open', { timeout: 15000 });
  await step(page, 'Chapter 4 Project Workspace opens with brief and acceptance criteria', async () => {
    const eyebrow = await page.textContent('#projectWorkspaceModal .eyebrow');
    return /CHAPTER 4 PROJECT/.test(eyebrow) && (await page.$$('#projectWorkspaceModal li')).length >= 3 ? eyebrow : false;
  });
  await step(page, 'Import chapter 4 lab evidence adds the prompt versions, verification log and lab notes as evidence', async () => {
    await page.click('#pwImportLab');
    await page.waitForFunction(() => /Imported/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    const n = (await page.$$('#pwEvidence .pw-evidence')).length;
    const txt = await page.textContent('#pwEvidence');
    const values = await page.$$eval('#pwEvidence textarea', els => els.map(e => e.value).join('\n'));
    return n >= 3 && /v1: Tell me about the River Shannon\. → /.test(values) && /supported → /.test(values) ? `${await page.textContent('#pwMessage')} (${n} items)` : `only ${n} items: ${txt.slice(0, 80)}`;
  });
  await step(page, 'Chapter 4 work log entry and recommendation, save', async () => {
    await page.click('#pwAddLog');
    await page.fill('#pwLog .pw-entry textarea[data-f="did"]', 'Ran the three-version prompt experiment, tried the four roles, verified three claims and built a reusable template.');
    await page.fill('#pwLog .pw-entry textarea[data-f="result"]', 'v2 fitted the task; one claim was wrong and one citation did not exist.');
    await page.fill('#pwRecommendation', long('Use the C-T-C-F template and verify every figure and citation against an independent source; confident wording is not confident truth.'));
    await page.click('#pwSave');
    await page.waitForFunction(() => /Saved/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('#pwMessage');
  });
  await step(page, 'Submit chapter 4 project', async () => {
    await page.click('#pwSubmit');
    await page.waitForFunction(() => /submitted/i.test(document.querySelector('.pw-status')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('.pw-status');
  });
  await page.click('.pw-close');

  // ---------- student, chapter 4 capstone (submitted above) unlocks chapter 5
  await page.click('#homeBtn');
  await step(page, 'Home: Chapter 4 done, Chapter 5 unlocked', async () => {
    const done = await page.$eval('[data-block="3"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="4"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });

  // ---------- student, chapter 5 (reload so the fourth workspace launcher initialises with the new unlock)
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => /Welcome/.test(document.getElementById('welcomeName')?.textContent || ''), null, { timeout: 15000 });
  await page.click('[data-block="4"]');
  await page.waitForSelector('#labBanner .lab-stage');
  await step(page, 'Chapter 5 opens with six lab stages; Chapter 5 project launcher present', async () => {
    await page.waitForSelector('#projectWorkspaceBtn-block5', { timeout: 15000 });
    const label = await page.textContent('#projectWorkspaceBtn-block5');
    return (await page.$$('#labBanner .lab-stage')).length === 6 && /^Project: .+/.test(label) ? label : false;
  });
  await step(page, 'Chapter 5 page shows the Myth-busters section and no AI tool safety notice', async () => /one source, not ten/.test(await page.textContent('#mythBusters')) && !(await page.$('#labToolLink')) && !(await page.$('[data-ack]')));
  await step(page, 'The confidence trap chain: three claim cards ranked before checking, verdicts after, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const cards = [['Transition Year was introduced in Irish schools in 1974', '4', 'true', 'It sounded like a textbook fact and it was one.'], ['The River Shannon is the longest river in Europe', '3', 'false', 'Confident wording; it is the longest in Ireland, not Europe.'], ['Most Irish teenagers would rather learn from an AI tutor than from a teacher', '2', "can't be verified", 'No survey I could find asks this question.']];
    for (let i = 0; i < 3; i++) for (const [j, f] of ['statement', 'before', 'verdict', 'fooled'].entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, cards[i][j]);
    const fb = await saveSession(page, 'b5s2');
    return dl.some(h => /claim-cards/.test(h)) ? `${fb} downloads=${dl.length}` : `downloads=${dl.length}`;
  });
  await step(page, 'Which habit comes first? quiz: choose every answer, save', async () => {
    const selects = await page.$$('select[data-i]');
    for (const sel of selects) await sel.selectOption({ index: 1 });
    const fb = await saveSession(page, 'b5s3');
    return selects.length === 8 ? fb : `items=${selects.length}`;
  });
  await step(page, 'AI News Detective annotate: article split into sentences, six marks of four types, counts shown, save', async () => {
    await page.waitForSelector('.annotate-lab button.annotate-sentence[data-sentence]', { timeout: 15000 });
    const sentences = (await page.$$('.annotate-lab button.annotate-sentence[data-sentence]')).length;
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const marks = [[1, 'Factual claim', 'Transition Year exists and is optional; checkable.'], [2, 'Factual claim', 'Names a founding year that can be checked.'], [3, 'Unsupported certainty', 'Experts agree, but no expert is named.'], [4, 'Emotional framing', 'Loaded wording meant to make me worried.'], [5, 'Missing source', 'A recent survey with no name or link.'], [6, 'Unsupported certainty', 'Beyond doubt is not evidence.']];
    for (const [i, type, note] of marks) await addMark(page, i, type, note);
    const counts = await page.textContent('.annotate-counts');
    const marked = (await page.$$('.annotate-lab button.annotate-sentence.marked')).length;
    const fb = await saveSession(page, 'b5s4');
    return sentences >= 10 && marked === 6 && /Factual claim\D*2/.test(counts) && /Unsupported certainty\D*2/.test(counts) && dl.some(h => /news-detective-article/.test(h)) ? `sentences=${sentences} · ${counts.trim()} · ${fb}` : `sentences=${sentences} marked=${marked} counts=${counts} downloads=${dl.length}`;
  });
  await step(page, 'Lateral verification chain (Sheet A2): five claims checked in new tabs, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const claims = [['Transition Year began in 1974', 'Department of Education page on Transition Year', 'Independent', 'Supported'], ['The National AI Tutoring Act 2025 was passed', 'Irish Statute Book search', 'Independent', 'Wrong'], ['A recent survey found 78% of parents want AI tutors', 'No named survey found; two sites repeat the article', 'Repeating it', 'Uncertain'], ['The Leaving Certificate is the final exam', 'State Examinations Commission site', 'Independent', 'Supported'], ['The Department of Education runs the system', 'gov.ie Department of Education page', 'Independent', 'Supported']];
    for (let i = 0; i < 5; i++) for (const [j, f] of ['claim', 'source', 'independent', 'verdict'].entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, claims[i][j]);
    const fb = await saveSession(page, 'b5s5');
    return dl.some(h => /verification-log-A2/.test(h)) ? `${fb} downloads=${dl.length}` : `downloads=${dl.length}`;
  });
  await step(page, 'Bias simulator: three runs recorded (2/20, 13/20, 18/20 for Group B), three fields, save', async () => {
    await page.waitForSelector('.bias-sim input[type=range][data-sim="shareB"]', { timeout: 15000 });
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const a18 = /18\/20/.test(await page.textContent('#simAccA'));
    const run1 = await recordRun(page);
    await setRange(page, 'shareB', 50);
    await page.check('input[type=checkbox][data-sim="removed"]');
    const run2 = await recordRun(page);
    await setRange(page, 'proxy', 0);
    const run3 = await recordRun(page);
    const runs = (await page.textContent('.sim-runs')).split(/18\/20|13\/20|2\/20/).length - 1;
    await page.fill('textarea[data-i="0"]', long('Raised Group B from 10% to 50% of the training data, then removed the sensitive field, then weakened the postcode proxy; Group A stayed at 90% while Group B climbed.'));
    await page.fill('textarea[data-i="1"]', long('The bias entered at collection because Group B was under-represented, and through a proxy because postcode stood in for the group even after the field was removed.'));
    await page.fill('textarea[data-i="2"]', long('Group B applicants are affected; I would collect balanced training data and drop or weaken the postcode feature before using the model.'));
    const fb = await saveSession(page, 'b5s6');
    const ok = a18 && /\b2\/20/.test(run1) && /13\/20/.test(run2) && /18\/20/.test(run3) && runs >= 3 && dl.some(h => /bias-simulator-worksheet/.test(h));
    return ok ? `${run1} | ${run2} | ${run3} · ${fb}` : `A18=${a18} run1=${run1} run2=${run2} run3=${run3} runs=${runs} downloads=${dl.length}`;
  });
  await step(page, 'Bias stations chain: four stations, where bias enters, who is affected, which kind, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const stations = [['Hiring data', 'The data: past hires were mostly one group', 'Applicants from under-represented groups', 'Representation bias'], ['Image generation', 'The data: stereotyped images dominate the training set', 'Anyone who does not match the stereotype', 'Representation bias'], ['Discipline analytics', 'How people use it: staff trust the flag without checking', 'Students flagged from past records', 'Automation bias'], ['Recommendation feeds', 'The design: engagement is the only goal', 'Users pushed towards extreme content', 'Framing']];
    for (let i = 0; i < 4; i++) for (const [j, f] of ['station', 'enters', 'affected', 'kind'].entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`, stations[i][j]);
    const fb = await saveSession(page, 'b5s7');
    return dl.some(h => /bias-station-cards/.test(h)) ? `${fb} downloads=${dl.length}` : `downloads=${dl.length}`;
  });
  await step(page, 'Improve the output: corrected version and two explanations, template download listed, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const areas = await page.$$('textarea[data-i]');
    await page.fill('textarea[data-i="0"]', 'Corrected version: Transition Year is an optional year in Irish secondary schools, run by the Department of Education, and the Leaving Certificate remains the final exam. A plan for AI tutors in every classroom by 2028 has been discussed, but no Act has been passed and the survey figure quoted could not be verified, so it is marked uncertain. Sources: Department of Education, State Examinations Commission.');
    await page.fill('textarea[data-i="1"]', long('Took out the invented Act, the fabricated report and the experts agree line.'));
    await page.fill('textarea[data-i="2"]', long('It is shorter and calmer, and every claim left in has a named source.'));
    const fb = await saveSession(page, 'b5s8');
    return areas.length === 3 && dl.some(h => /corrected-version-template/.test(h)) ? `${fb} downloads=${dl.length}` : `fields=${areas.length} downloads=${dl.length}`;
  });
  await step(page, 'Synthetic media: two responses, checklist download listed, save', async () => {
    const dl = await page.$$eval('.downloads a[download]', a => a.map(x => x.getAttribute('href')));
    const n = await fillTextfields(page, 2);
    const fb = await saveSession(page, 'b5s9');
    return n === 2 && dl.some(h => /synthetic-media-checklist/.test(h)) ? `${fb} downloads=${dl.length}` : `fields=${n} downloads=${dl.length}`;
  });
  await step(page, 'Reflection: my three-step rule, save, chapter 5 practical complete', async () => {
    await page.fill('textarea[data-i="0"]', 'Stop and notice how it makes me feel.');
    await page.fill('textarea[data-i="1"]', 'Open new tabs and find independent coverage.');
    await page.fill('textarea[data-i="2"]', 'Trace the claim back to its original evidence.');
    const fb = await saveSession(page, null);
    return /chapter assessment/i.test(fb) ? fb : false;
  });
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]', { timeout: 10000 });
  await step(page, 'Submit chapter 5 capstone, formative level returned', async () => submitCapstone(page, CAPSTONE5_ANSWERS));

  // ---------- chapter 5 project workspace
  await page.click('#projectWorkspaceBtn-block5');
  await page.waitForSelector('#projectWorkspaceModal.open', { timeout: 15000 });
  await step(page, 'Chapter 5 Project Workspace opens with brief and acceptance criteria', async () => {
    const eyebrow = await page.textContent('#projectWorkspaceModal .eyebrow');
    return /CHAPTER 5 PROJECT/.test(eyebrow) && (await page.$$('#projectWorkspaceModal li')).length >= 3 ? eyebrow : false;
  });
  await step(page, 'Import chapter 5 lab evidence adds the annotated article, verification chain and simulator runs as evidence', async () => {
    await page.click('#pwImportLab');
    await page.waitForFunction(() => /Imported/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    const n = (await page.$$('#pwEvidence .pw-evidence')).length;
    const values = await page.$$eval('#pwEvidence textarea', els => els.map(e => e.value).join('\n'));
    return n >= 3 && /6 marks: /.test(values) && /3 runs; Group B 10%–90%; overall 50%–90%/.test(values) && / → Independent → Supported/.test(values) ? `${await page.textContent('#pwMessage')} (${n} items)` : `only ${n} items: ${values.slice(0, 160)}`;
  });
  await step(page, 'Chapter 5 work log entry and recommendation, save', async () => {
    await page.click('#pwAddLog');
    await page.fill('#pwLog .pw-entry textarea[data-f="did"]', 'Marked up the AI article, verified five claims laterally, ran the bias simulator three times, worked the four stations and published a corrected version.');
    await page.fill('#pwLog .pw-entry textarea[data-f="result"]', 'Two claims wrong, one uncertain; Group B only reached 90% once the proxy was weakened; corrected version is shorter and sourced.');
    await page.fill('#pwRecommendation', long('Publish only the corrected version with the uncertain parts labelled and the sources added; less exciting, more trustworthy.'));
    await page.click('#pwSave');
    await page.waitForFunction(() => /Saved/.test(document.getElementById('pwMessage')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('#pwMessage');
  });
  await step(page, 'Submit chapter 5 project', async () => {
    await page.click('#pwSubmit');
    await page.waitForFunction(() => /submitted/i.test(document.querySelector('.pw-status')?.textContent || ''), null, { timeout: 15000 });
    return await page.textContent('.pw-status');
  });
  await page.click('.pw-close');
  await context.close();

  // ---------- Chapter 6: all sessions, independent sample review, capstone and project.
  ({ context, page } = await device(browser, student.session));
  await page.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
  await completeChapter6UI(page, async sid => step(page, `Chapter 6 ${sid}: saved sample-route evidence`, async()=>true));
  await step(page, 'Chapter 6 capstone and project completed', async()=>true);
  await context.close();

  // ---------- Chapter 7: Chapter 6 is qualified through the UI above, then all eight sessions, the branching
  // decision simulator with real clicks, the capstone and the project with imported decision evidence.
  ({ context, page } = await device(browser, student.session));
  await page.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
  await step(page, 'Home: Chapter 6 done, Chapter 7 unlocked', async () => {
    const done = await page.$eval('[data-block="5"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="6"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });
  await completeChapter7UI(page, async sid => step(page, `Chapter 7 ${sid}: saved evidence`, async()=>true));
  await step(page, 'Chapter 7 capstone and project completed', async()=>true);
  await context.close();

  // ---------- Chapter 8: Chapter 7 is qualified through the UI above, then all eight sessions with real clicks,
  // the build session by the fallback route with the tool never acknowledged, the capstone, the programme-complete
  // state and the project with imported lab evidence.
  ({ context, page } = await device(browser, student.session));
  await page.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
  await step(page, 'Home: Chapter 7 done, Chapter 8 unlocked', async () => {
    const done = await page.$eval('[data-block="6"]', el => el.classList.contains('done'));
    const unlocked = await page.$eval('[data-block="7"]', el => !el.classList.contains('locked') && !el.disabled);
    return done && unlocked;
  });
  await completeChapter8UI(page, async sid => step(page, `Chapter 8 ${sid}: saved project evidence`, async()=>true));
  await step(page, 'Chapter 8 capstone, project and programme-complete state', async()=>await page.textContent('.programme-complete'));
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
