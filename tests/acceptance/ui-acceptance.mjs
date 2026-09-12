// ADR-007 browser acceptance with Playwright. Not part of `npm test`.
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/ui-acceptance.mjs
//
// Each browser context is a fresh "device" with no local state; the Supabase session is injected into
// localStorage the same way the Google OAuth callback would store it. Covers cross-device persistence,
// the chapter gates as rendered (1→2 through 7→8), the Chapter 5 annotate and simulator kinds, the Chapter 7 decision kind, and admin-page rejection for a non-admin account.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { BASE, REF, api, check, finish, createUser, cleanup, noIdentifiers, CHAPTER1_SESSIONS, CAPSTONE1_ANSWERS, CHAPTER2_SESSIONS, CAPSTONE2_ANSWERS, CHAPTER3_SESSIONS, CAPSTONE3_ANSWERS, CHAPTER4_SESSIONS, CAPSTONE4_ANSWERS, CHAPTER5_SESSIONS, CAPSTONE5_ANSWERS, completeChapter6UI, completeChapter7UI, completeChapter8UI } from './lib.mjs';

// The annotate/simulator controls re-render on input, so ranges are set with a real input event rather than page.fill.
async function setRange(page, key, value) { await page.$eval(`input[type=range][data-sim="${key}"]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value)); }

const STORAGE_KEY = `sb-${REF}-auth-token`;

async function device(browser, session, path = '/') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  if (session) await page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(session)]);
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  return { context, page };
}

const users = [];
const browser = await chromium.launch();
try {
  const a = await createUser('student-a'); users.push(a);
  const admin = await createUser('admin', { role: 'admin' }); users.push(admin);

  // Device 1: signed in, nothing done yet
  let d1 = await device(browser, a.session);
  await d1.page.waitForFunction(() => document.getElementById('welcomeName')?.textContent.includes('Welcome'), null, { timeout: 15000 });
  check('device 1 shows signed-in welcome', (await d1.page.textContent('#welcomeName')).includes(a.displayName));
  check('device 1 sync status is not Local mode', !(await d1.page.textContent('#syncStatus')).includes('Local mode'), await d1.page.textContent('#syncStatus'));
  check('device 1 course progress starts at 0%', (await d1.page.textContent('#coursePct')).trim() === '0%');
  check('device 1 Chapter 2 locked before Chapter 1', await d1.page.$eval('[data-block="1"]', el => el.classList.contains('locked') && el.disabled));
  // Experience Lab: banner, safety gate, fallback
  await d1.page.click('[data-block="0"]');
  await d1.page.waitForSelector('#labBanner .lab-stage', { timeout: 10000 });
  check('chapter 1 shows six Experience Lab stages', (await d1.page.$$('#labBanner .lab-stage')).length === 6);
  await d1.page.click('[data-lab-session="b1lab"]');
  await d1.page.waitForSelector('#labToolLink', { timeout: 10000 });
  check('lab tool link disabled until safety notice acknowledged', await d1.page.$eval('#labToolLink', el => el.classList.contains('disabled') && el.getAttribute('aria-disabled') === 'true'));
  check('lab safety notice mentions no account and no personal details', /account/i.test(await d1.page.textContent('.lab-privacy')) && /face|name|personal/i.test(await d1.page.textContent('.lab-privacy')));
  await d1.page.check('[data-ack]');
  check('lab tool link enabled after acknowledgement', await d1.page.$eval('#labToolLink', el => !el.classList.contains('disabled') && el.getAttribute('aria-disabled') === 'false'));
  check('lab fallback hidden by default', await d1.page.$eval('#labFallback', el => el.hidden));
  await d1.page.click('[data-fallback]');
  check('lab fallback shown on request', await d1.page.$eval('#labFallback', el => !el.hidden));
  const links = await d1.page.$$eval('.downloads a[download]', els => els.map(a => a.getAttribute('href')));
  check('chapter 1 lab lists downloads', links.length >= 2, JSON.stringify(links));
  const served = await Promise.all(['cup-bottle-shortcut-trap.zip', 'test-log-template.csv', ...links.map(h => h.replace('/datasets/', ''))].map(f => fetch(`${BASE}/datasets/${f}`, { method: 'HEAD' }).then(r => r.status)));
  check('dataset downloads are served with HTTP 200', served.every(s => s === 200), JSON.stringify(served));
  await d1.context.close();

  // Work recorded server-side (as the app would after saving sessions), then a capstone
  const done = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { completed: CHAPTER1_SESSIONS, reflections: {}, activity: {}, badges: [], chapterAssessments: {} } }) });
  check('server accepts Chapter 1 completion', done.status === 200);

  // Device 2: fresh browser, must see Chapter 1 progress from the server, Chapter 2 still locked (no capstone yet)
  let d2 = await device(browser, a.session);
  await d2.page.waitForFunction(() => document.getElementById('coursePct')?.textContent !== '0%', null, { timeout: 15000 }).catch(() => {});
  const pct = (await d2.page.textContent('#coursePct')).trim();
  check('device 2 shows Chapter 1 progress persisted across devices', pct !== '0%', `coursePct=${pct}`);
  check('device 2 Chapter 1 card not locked', await d2.page.$eval('[data-block="0"]', el => !el.classList.contains('locked')));
  check('device 2 Chapter 2 still locked without capstone', await d2.page.$eval('[data-block="1"]', el => el.classList.contains('locked') && el.disabled));
  const lockText = await d2.page.$eval('[data-block="1"]', el => el.textContent);
  check('device 2 Chapter 2 card explains the gate', /Complete Chapter 0?1 assessment/i.test(lockText), lockText.slice(-80));
  await d2.context.close();

  // Capstone submitted server-side; qualification is derived by the server, no client mirroring needed
  const cap = await api('chapter-assessment/block1', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE1_ANSWERS }) });
  check('capstone accepted', cap.status === 200 && Boolean(cap.body?.assessment?.submittedAt), JSON.stringify(cap.body));

  // Device 3: Chapter 2 unlocked
  let d3 = await device(browser, a.session);
  await d3.page.waitForFunction(() => { const el = document.querySelector('[data-block="1"]'); return el && !el.classList.contains('locked'); }, null, { timeout: 15000 }).catch(() => {});
  check('device 3 Chapter 2 unlocked after capstone', await d3.page.$eval('[data-block="1"]', el => !el.classList.contains('locked') && !el.disabled));
  check('device 3 Chapter 1 marked done', await d3.page.$eval('[data-block="0"]', el => el.classList.contains('done')));
  check('device 3 Chapter 3 locked until Chapter 2 qualified', await d3.page.$eval('[data-block="2"]', el => el.classList.contains('locked') && el.disabled));
  const lock3 = await d3.page.$eval('[data-block="2"]', el => el.textContent);
  check('device 3 Chapter 3 card explains the gate', /Complete Chapter 0?2 assessment/i.test(lock3), lock3.slice(-80));
  await d3.context.close();

  // Chapter 2 completed and qualified server-side, then Chapter 3 opens with the dataset audit table
  const done2 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS], reflections: {}, activity: {}, badges: [], chapterAssessments: {} } }) });
  check('server accepts Chapter 2 completion', done2.status === 200);
  const cap2 = await api('chapter-assessment/block2', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE2_ANSWERS }) });
  check('Chapter 2 capstone accepted', cap2.status === 200 && Boolean(cap2.body?.assessment?.submittedAt), JSON.stringify(cap2.body));

  let d4 = await device(browser, a.session);
  await d4.page.waitForFunction(() => { const el = document.querySelector('[data-block="2"]'); return el && !el.classList.contains('locked'); }, null, { timeout: 15000 }).catch(() => {});
  check('device 4 Chapter 3 unlocked after Chapter 2 capstone', await d4.page.$eval('[data-block="2"]', el => !el.classList.contains('locked') && !el.disabled));
  check('device 4 Chapter 4 locked until Chapter 3 qualified', await d4.page.$eval('[data-block="3"]', el => el.classList.contains('locked') && el.disabled));
  await d4.page.click('[data-block="2"]');
  await d4.page.waitForSelector('#labBanner .lab-stage', { timeout: 10000 });
  check('chapter 3 shows six Experience Lab stages', (await d4.page.$$('#labBanner .lab-stage')).length === 6);
  check('chapter 3 renders the Myth-busters section', Boolean(await d4.page.$('#mythBusters')) && /Public means visible/.test(await d4.page.textContent('#mythBusters')));
  await d4.page.click('[data-session="b3s4"]');
  await d4.page.waitForSelector('.dataset-table tbody tr', { timeout: 15000 });
  const rows = (await d4.page.$$('.dataset-table tbody tr')).length;
  check('b3s4 dataset table renders all 120 rows from the served CSV', rows === 120, `rows=${rows}`);
  const csv = await fetch(`${BASE}/datasets/club-signups-flawed.csv`);
  check('flawed CSV is served with HTTP 200', csv.status === 200, `status ${csv.status}`);
  const note = 'Nine sign-ups have no club_choice recorded.';
  await d4.page.selectOption('#datasetTarget', { index: 1 });
  await d4.page.selectOption('#datasetIssue', { index: 1 });
  await d4.page.fill('#datasetNote', note);
  await d4.page.click('#datasetAdd');
  await d4.page.waitForFunction((n) => (document.querySelector('.dataset-findings')?.textContent || '').includes(n), note, { timeout: 10000 }).catch(() => {});
  check('adding a finding via the form appears in the findings list', (await d4.page.textContent('.dataset-findings')).includes(note));
  const missing = 'No student who joined mid-year appears in the sign-ups.';
  await d4.page.selectOption('#datasetTarget', 'column:year_group');
  await d4.page.selectOption('#datasetIssue', { label: 'Who is missing (representation)' });
  await d4.page.fill('#datasetNote', missing);
  await d4.page.click('#datasetAdd');
  await d4.page.waitForFunction((n) => (document.querySelector('.dataset-findings')?.textContent || '').includes(n), missing, { timeout: 10000 }).catch(() => {});
  check('a "Who is missing (representation)" finding appears in the findings list', /Who is missing \(representation\)/.test(await d4.page.textContent('.dataset-findings')) && (await d4.page.textContent('.dataset-findings')).includes(missing));
  await d4.context.close();

  // Chapter 3 completed and qualified server-side, then Chapter 4 opens and the b4s3 prompt builder composes v2
  const done3 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS], reflections: {}, activity: {}, badges: [], chapterAssessments: {} } }) });
  check('server accepts Chapter 3 completion', done3.status === 200);
  const cap3 = await api('chapter-assessment/block3', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE3_ANSWERS }) });
  check('Chapter 3 capstone accepted', cap3.status === 200 && Boolean(cap3.body?.assessment?.submittedAt), JSON.stringify(cap3.body));

  let d5 = await device(browser, a.session);
  await d5.page.waitForFunction(() => { const el = document.querySelector('[data-block="3"]'); return el && !el.classList.contains('locked'); }, null, { timeout: 15000 }).catch(() => {});
  check('device 5 Chapter 4 unlocked after Chapter 3 capstone', await d5.page.$eval('[data-block="3"]', el => !el.classList.contains('locked') && !el.disabled));
  await d5.page.click('[data-block="3"]');
  await d5.page.waitForSelector('#labBanner .lab-stage', { timeout: 10000 });
  check('chapter 4 shows six Experience Lab stages', (await d5.page.$$('#labBanner .lab-stage')).length === 6);
  check('chapter 4 renders the Myth-busters section', Boolean(await d5.page.$('#mythBusters')) && /Clear beats long/.test(await d5.page.textContent('#mythBusters')));
  await d5.page.click('[data-session="b4s3"]');
  await d5.page.waitForSelector('.prompt-lab', { timeout: 15000 });
  check('b4s3 renders the C-T-C-F builder and both version blocks', (await d5.page.$$('[data-builder]')).length === 4 && Boolean(await d5.page.$('textarea[data-version="v1"][data-field="prompt"]')) && Boolean(await d5.page.$('textarea[data-version="v2"][data-field="prompt"]')));
  const parts = { context: 'I am a TY student preparing a two-minute talk on the River Shannon for classmates.', task: 'Outline the talk.', constraints: '150 words, plain language, no figures without a named source.', format: 'Five bullet points, and ask me two questions first.' };
  for (const [k, v] of Object.entries(parts)) await d5.page.fill(`[data-builder="${k}"]`, v);
  await d5.page.click('#composeV2');
  const composed = await d5.page.$eval('textarea[data-version="v2"][data-field="prompt"]', el => el.value);
  check('Compose v2 writes the four C-T-C-F parts into the v2 prompt', Object.values(parts).every(v => composed.includes(v)) && /\n\n/.test(composed), JSON.stringify(composed));
  await d5.page.click('[data-block-home], #homeBtn');
  check('device 5 Chapter 5 locked until Chapter 4 qualified', await d5.page.$eval('[data-block="4"]', el => el.classList.contains('locked') && el.disabled));
  const lock5 = await d5.page.$eval('[data-block="4"]', el => el.textContent);
  check('device 5 Chapter 5 card explains the gate', /Complete Chapter 0?4 assessment/i.test(lock5), lock5.slice(-80));
  await d5.context.close();

  // Chapter 4 completed and qualified server-side, then Chapter 5 opens with the annotate and simulator kinds
  const done4 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS, ...CHAPTER4_SESSIONS], reflections: {}, activity: {}, badges: [], chapterAssessments: {} } }) });
  check('server accepts Chapter 4 completion', done4.status === 200);
  const cap4 = await api('chapter-assessment/block4', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE4_ANSWERS }) });
  check('Chapter 4 capstone accepted', cap4.status === 200 && Boolean(cap4.body?.assessment?.submittedAt), JSON.stringify(cap4.body));

  let d6 = await device(browser, a.session);
  await d6.page.waitForFunction(() => { const el = document.querySelector('[data-block="4"]'); return el && !el.classList.contains('locked'); }, null, { timeout: 15000 }).catch(() => {});
  check('device 6 Chapter 5 unlocked after Chapter 4 capstone', await d6.page.$eval('[data-block="4"]', el => !el.classList.contains('locked') && !el.disabled));
  await d6.page.click('[data-block="4"]');
  await d6.page.waitForSelector('#labBanner .lab-stage', { timeout: 10000 });
  check('chapter 5 shows six Experience Lab stages', (await d6.page.$$('#labBanner .lab-stage')).length === 6);
  check('chapter 5 renders the Myth-busters section', Boolean(await d6.page.$('#mythBusters')) && /one source, not ten/.test(await d6.page.textContent('#mythBusters')));
  check('chapter 5 renders no AI tool safety notice', !(await d6.page.$('#labToolLink')) && !(await d6.page.$('[data-ack]')));
  await d6.page.click('[data-session="b5s3"]');
  await d6.page.waitForSelector('.annotate-lab button.annotate-sentence[data-sentence]', { timeout: 15000 });
  const sentences = (await d6.page.$$('.annotate-lab button.annotate-sentence[data-sentence]')).length;
  check('b5s3 splits the served article into sentence buttons', sentences >= 10, `sentences=${sentences}`);
  const article = await fetch(`${BASE}/datasets/news-detective-article.txt`);
  check('news detective article is served with HTTP 200', article.status === 200, `status ${article.status}`);
  const markTypes = await d6.page.$$eval('select#annotateMark option', els => els.map(o => o.textContent.trim()).filter(Boolean));
  check('b5s3 mark menu lists the four highlighter marks', ['Factual claim', 'Emotional framing', 'Missing source', 'Unsupported certainty'].every(t => markTypes.includes(t)), JSON.stringify(markTypes));
  const noteA = 'Names a founding year that can be checked.';
  await (await d6.page.$$('.annotate-lab button.annotate-sentence'))[1].click();
  check('clicking a sentence fills the annotate target', /Sentence \d+/.test(await d6.page.$eval('#annotateTarget', el => el.value || el.textContent)));
  await d6.page.selectOption('select#annotateMark', { label: 'Factual claim' });
  await d6.page.fill('textarea#annotateNote', noteA);
  await d6.page.click('button#annotateAdd');
  await d6.page.waitForFunction((n) => (document.querySelector('.annotate-findings')?.textContent || '').includes(n), noteA, { timeout: 10000 }).catch(() => {});
  check('adding a mark via the form appears in the findings list', (await d6.page.textContent('.annotate-findings')).includes(noteA));
  const noteB = 'Experts agree with nothing to back it up.';
  await (await d6.page.$$('.annotate-lab button.annotate-sentence'))[3].click();
  await d6.page.selectOption('select#annotateMark', { label: 'Unsupported certainty' });
  await d6.page.fill('textarea#annotateNote', noteB);
  await d6.page.click('button#annotateAdd');
  await d6.page.waitForFunction((n) => (document.querySelector('.annotate-findings')?.textContent || '').includes(n), noteB, { timeout: 10000 }).catch(() => {});
  const counts = await d6.page.textContent('.annotate-counts');
  check('annotate counts show one Factual claim and one Unsupported certainty', /Factual claim\D*1/.test(counts) && /Unsupported certainty\D*1/.test(counts), counts);
  check('marked sentences carry the marked class', (await d6.page.$$('.annotate-lab button.annotate-sentence.marked')).length === 2);
  await d6.page.click('[data-session="b5s5"]');
  await d6.page.waitForSelector('.bias-sim input[type=range][data-sim="shareB"]', { timeout: 15000 });
  check('b5s5 renders the simulator controls and results', Boolean(await d6.page.$('input[type=range][data-sim="proxy"]')) && Boolean(await d6.page.$('input[type=checkbox][data-sim="removed"]')) && Boolean(await d6.page.$('#simAccA')) && Boolean(await d6.page.$('#simAccB')) && Boolean(await d6.page.$('#simOverall')));
  check('simulator default run: Group A 18/20, Group B 2/20', /18\/20/.test(await d6.page.textContent('#simAccA')) && /\b2\/20/.test(await d6.page.textContent('#simAccB')), `${await d6.page.textContent('#simAccA')} | ${await d6.page.textContent('#simAccB')}`);
  await setRange(d6.page, 'shareB', 50);
  await d6.page.check('input[type=checkbox][data-sim="removed"]');
  check('simulator shareB 50 / proxy 80 / removed: Group B 13/20', /13\/20/.test(await d6.page.textContent('#simAccB')), await d6.page.textContent('#simAccB'));
  await setRange(d6.page, 'proxy', 0);
  check('simulator shareB 50 / proxy 0 / removed: Group B 18/20, overall 36/40 · 90%', /18\/20/.test(await d6.page.textContent('#simAccB')) && /36\/40/.test(await d6.page.textContent('#simOverall')) && /90%/.test(await d6.page.textContent('#simOverall')), `${await d6.page.textContent('#simAccB')} | ${await d6.page.textContent('#simOverall')}`);
  await d6.page.click('button#simRecord');
  await d6.page.waitForFunction(() => (document.querySelector('.sim-runs')?.textContent || '').length > 0, null, { timeout: 10000 }).catch(() => {});
  check('Record this run appends the run to the runs list', /18\/20|90%/.test(await d6.page.textContent('.sim-runs')), await d6.page.textContent('.sim-runs'));
  check('b5s5 renders the three simulator fields', (await d6.page.$$('.bias-sim textarea[data-i], textarea[data-i]')).length >= 3);
  const served5 = await Promise.all(['claim-cards.txt', 'annotation-sheet.csv', 'bias-station-cards.txt', 'bias-simulator-worksheet.csv', 'corrected-version-template.md', 'synthetic-media-checklist.txt', 'verification-log-A2.csv'].map(f => fetch(`${BASE}/datasets/${f}`, { method: 'HEAD' }).then(r => r.status)));
  check('chapter 5 downloads are served with HTTP 200', served5.every(s => s === 200), JSON.stringify(served5));
  await d6.context.close();

  // Chapter 5 → 6 gate, then all Chapter 6 sessions and its project through real controls.
  const done5 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS, ...CHAPTER4_SESSIONS, ...CHAPTER5_SESSIONS], reflections: {}, activity: {}, badges: [] } }) });
  check('server accepts Chapter 5 completion', done5.status === 200);
  const locked6 = await device(browser, a.session);
  await locked6.page.waitForSelector('[data-block="5"]');
  check('Chapter 6 remains locked before Chapter 5 capstone', await locked6.page.$eval('[data-block="5"]',el=>el.disabled&&el.classList.contains('locked')));
  check('Chapter 7 card is locked and names the Chapter 6 gate', await locked6.page.$eval('[data-block="6"]',el=>el.disabled&&el.classList.contains('locked')&&/Complete Chapter 0?6 assessment/i.test(el.textContent)));
  check('Chapter 8 card is locked and names the Chapter 7 gate', await locked6.page.$eval('[data-block="7"]',el=>el.disabled&&el.classList.contains('locked')&&/Complete Chapter 0?7 assessment/i.test(el.textContent)));
  check('no ninth chapter card is offered', (await locked6.page.$$('[data-block="8"]')).length===0);
  await locked6.context.close();
  const cap5 = await api('chapter-assessment/block5', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE5_ANSWERS }) });
  check('Chapter 5 capstone accepted',cap5.status===200&&Boolean(cap5.body?.assessment?.submittedAt));
  const d7 = await device(browser, a.session);
  await d7.page.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
  await completeChapter6UI(d7.page);
  await d7.context.close();

  // Chapter 6 → 7 gate as rendered, then every Chapter 7 session and the branching decision kind through real controls.
  const d8 = await device(browser, a.session);
  await d8.page.waitForFunction(()=>{const el=document.querySelector('[data-block="6"]');return el&&!el.classList.contains('locked')},null,{timeout:15000});
  check('Chapter 7 unlocked after the Chapter 6 capstone', await d8.page.$eval('[data-block="6"]',el=>!el.classList.contains('locked')&&!el.disabled));
  await completeChapter7UI(d8.page);
  await d8.context.close();

  // Chapter 7 → 8 gate as rendered, then every Chapter 8 session, the fallback build route and the programme-complete state.
  const d9 = await device(browser, a.session);
  await d9.page.waitForFunction(()=>{const el=document.querySelector('[data-block="7"]');return el&&!el.classList.contains('locked')},null,{timeout:15000});
  check('Chapter 8 unlocked after the Chapter 7 capstone', await d9.page.$eval('[data-block="7"]',el=>!el.classList.contains('locked')&&!el.disabled));
  await completeChapter8UI(d9.page);
  await d9.context.close();

  // Phase 10 (ADR-008 §1-2): the learner's own portfolio export and the narrower coordinator summary, driven from
  // the Portfolio view through the selector contract. A marker reflection proves the student export carries the
  // learner's work and the coordinator summary does not; neither carries an email, auth id or reviewed_by.
  const p10 = await createUser('phase10-student'); users.push(p10);
  const reflectionMarker = `Phase10 reflection marker ${randomUUID()}`;
  const seeded = await api('progress', p10.token, { method: 'PUT', body: JSON.stringify({ state: { completed: CHAPTER1_SESSIONS, reflections: { b1s1: reflectionMarker }, activity: {}, badges: [], chapterAssessments: {} } }) });
  check('server accepts the phase 10 export fixture\'s Chapter 1 completion', seeded.status === 200);
  const dExport = await device(browser, p10.session);
  await dExport.page.click('#portfolioBtn');
  await dExport.page.waitForSelector('#exportPortfolio', { timeout: 15000 });
  // Wait for cloud progress to land, or the export is built from empty state.
  await dExport.page.waitForFunction(() => Number(document.getElementById('portfolioSessions')?.textContent || 0) > 0, null, { timeout: 15000 });
  const [portfolioDownload] = await Promise.all([dExport.page.waitForEvent('download'), dExport.page.click('#exportPortfolio')]);
  const portfolioHtml = readFileSync(await portfolioDownload.path(), 'utf8');
  check('student portfolio export is a self-contained HTML document', /class="portfolio-export"/.test(portfolioHtml));
  check('student portfolio export contains the learner\'s own reflection', portfolioHtml.includes(reflectionMarker));
  check('student portfolio export carries the formative-evidence note', /class="export-note"/.test(portfolioHtml) && /not a certified qualification/i.test(portfolioHtml));
  check('student portfolio export names no email, auth id or reviewed_by', noIdentifiers(portfolioHtml, [p10.id]));
  const [summaryDownload] = await Promise.all([dExport.page.waitForEvent('download'), dExport.page.click('#exportCoordinatorSummary')]);
  const summaryHtml = readFileSync(await summaryDownload.path(), 'utf8');
  check('coordinator summary contains no reflection text', !summaryHtml.includes(reflectionMarker));
  check('coordinator summary names no email, auth id or reviewed_by', noIdentifiers(summaryHtml, [p10.id]));
  await dExport.context.close();

  // Admin page: student rejected, admin admitted
  const ds = await device(browser, a.session, '/admin');
  await ds.page.waitForFunction(() => (document.getElementById('gateMessage')?.textContent || '').length > 0, null, { timeout: 15000 }).catch(() => {});
  const gate = await ds.page.textContent('#gateMessage');
  check('student sees admin rejection message', /not authorised as an administrator/i.test(gate), gate);
  check('student sees no student metrics', !(await ds.page.$eval('#metricStudents', el => el.offsetParent !== null).catch(() => false)));
  check('student sees no pilot analytics view', !(await ds.page.$('#adminAnalytics')));
  await ds.context.close();

  const da = await device(browser, admin.session, '/admin');
  await da.page.waitForFunction(() => Number(document.getElementById('metricStudents')?.textContent) > 0, null, { timeout: 15000 }).catch(() => {});
  const bodyText = await da.page.textContent('body');
  check('admin dashboard lists test student', bodyText.includes(a.displayName), (await da.page.textContent('#gateMessage').catch(() => '')) || '');
  // Phase 10 (ADR-008 §3-4): the six aggregate measures with suppression applied and no learner named.
  await da.page.waitForSelector('#adminAnalytics [data-measure]', { timeout: 15000 }).catch(() => {});
  const measures = new Set(await da.page.$$eval('#adminAnalytics [data-measure]', els => els.map(e => e.dataset.measure)).catch(() => []));
  check('admin analytics view renders all six measures', ['completion', 'improvement', 'dropoff', 'agreement', 'labs', 'feedback'].every(m => measures.has(m)), JSON.stringify([...measures]));
  // Whether any cell is suppressed depends on how many learners exist right now, so assert the rule instead of
  // the weather: the view states the rule, and no cell ever shows a live count between 1 and 4.
  const analyticsNote = await da.page.textContent('#adminAnalytics').catch(() => '');
  check('admin analytics view states the suppression rule', /fewer than 5/i.test(analyticsNote));
  const smallCounts = await da.page.$$eval('#adminAnalytics td:not([data-suppressed])', els =>
    els.map(e => e.textContent.trim()).filter(t => /^[1-4]$/.test(t)));
  check('admin analytics view never shows a count below the suppression threshold', smallCounts.length === 0, JSON.stringify(smallCounts));
  const analyticsText = await da.page.textContent('#adminAnalytics').catch(() => '');
  check('admin analytics view names no learner id, display name or reviewed_by', noIdentifiers(analyticsText, [a.id, admin.id, p10.id, a.displayName, p10.displayName].filter(Boolean)));
  await da.context.close();

  // Signed-out visitor
  const anon = await device(browser, null);
  check('signed-out visitor sees Local mode', (await anon.page.textContent('#syncStatus')).includes('Local mode'));
  await anon.context.close();
} catch (error) {
  check('run completed without exception', false, error.message);
} finally {
  await browser.close();
  await cleanup(users);
}
finish();
