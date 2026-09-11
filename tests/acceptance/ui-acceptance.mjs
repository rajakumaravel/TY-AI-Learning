// ADR-007 browser acceptance with Playwright. Not part of `npm test`.
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/ui-acceptance.mjs
//
// Each browser context is a fresh "device" with no local state; the Supabase session is injected into
// localStorage the same way the Google OAuth callback would store it. Covers cross-device persistence,
// the Chapter 1→2 gate as rendered, and admin-page rejection for a non-admin account.

import { chromium } from 'playwright';
import { BASE, REF, api, check, finish, createUser, cleanup, CHAPTER1_SESSIONS, CAPSTONE1_ANSWERS, CHAPTER2_SESSIONS, CAPSTONE2_ANSWERS } from './lib.mjs';

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

  // Admin page: student rejected, admin admitted
  const ds = await device(browser, a.session, '/admin');
  await ds.page.waitForFunction(() => (document.getElementById('gateMessage')?.textContent || '').length > 0, null, { timeout: 15000 }).catch(() => {});
  const gate = await ds.page.textContent('#gateMessage');
  check('student sees admin rejection message', /not authorised as an administrator/i.test(gate), gate);
  check('student sees no student metrics', !(await ds.page.$eval('#metricStudents', el => el.offsetParent !== null).catch(() => false)));
  await ds.context.close();

  const da = await device(browser, admin.session, '/admin');
  await da.page.waitForFunction(() => Number(document.getElementById('metricStudents')?.textContent) > 0, null, { timeout: 15000 }).catch(() => {});
  const bodyText = await da.page.textContent('body');
  check('admin dashboard lists test student', bodyText.includes(a.displayName), (await da.page.textContent('#gateMessage').catch(() => '')) || '');
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
