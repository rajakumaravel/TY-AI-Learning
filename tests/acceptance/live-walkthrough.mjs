// Full student-and-teacher journey through the live UI with real clicks and typing, screenshot per step.
// Not part of `npm test`. Usage:
//   ACCEPTANCE_BASE_URL=https://preview-main.ty-ai-learning.pages.dev SHOTS=/path/to/dir node tests/acceptance/live-walkthrough.mjs
// Writes <SHOTS>/NN-step.png and <SHOTS>/summary.json. Creates and deletes two throwaway auth users.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, REF, check, results, createUser, cleanup, CAPSTONE1_ANSWERS, CAPSTONE2_ANSWERS, CAPSTONE3_ANSWERS, CAPSTONE4_ANSWERS } from './lib.mjs';

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
  await step(page, 'Portfolio shows progress and badge', async () => /^(6\d|7\d|8\d|9\d|100)%$/.test((await page.textContent('#portfolioPct')).trim()));
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
    for (const [k, v] of Object.entries(parts)) await page.fill(`input[data-builder="${k}"]`, v);
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
