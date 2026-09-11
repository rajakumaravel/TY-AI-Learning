// ADR-007 browser acceptance with Playwright. Not part of `npm test`.
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/ui-acceptance.mjs
//
// Each browser context is a fresh "device" with no local state; the Supabase session is injected into
// localStorage the same way the Google OAuth callback would store it. Covers cross-device persistence,
// the Chapter 1→2 gate as rendered, and admin-page rejection for a non-admin account.

import { chromium } from 'playwright';
import { BASE, REF, api, check, finish, createUser, cleanup, CHAPTER1_SESSIONS, CAPSTONE1_ANSWERS } from './lib.mjs';

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

  // Capstone submitted server-side, then mirrored into progress state the way the app does after submission
  const cap = await api('chapter-assessment/block1', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE1_ANSWERS }) });
  check('capstone accepted', cap.status === 200 && Boolean(cap.body?.assessment?.submittedAt), JSON.stringify(cap.body));
  const withCap = { completed: CHAPTER1_SESSIONS, reflections: {}, activity: {}, badges: [], chapterAssessments: { block1: { submittedAt: cap.body?.assessment?.submittedAt, level: cap.body?.assessment?.suggestedLevel, score: cap.body?.assessment?.suggestedScore } } };
  check('server accepts capstone-qualified state', (await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: withCap }) })).status === 200);

  // Device 3: Chapter 2 unlocked
  let d3 = await device(browser, a.session);
  await d3.page.waitForFunction(() => { const el = document.querySelector('[data-block="1"]'); return el && !el.classList.contains('locked'); }, null, { timeout: 15000 }).catch(() => {});
  check('device 3 Chapter 2 unlocked after capstone', await d3.page.$eval('[data-block="1"]', el => !el.classList.contains('locked') && !el.disabled));
  check('device 3 Chapter 1 marked done', await d3.page.$eval('[data-block="0"]', el => el.classList.contains('done')));
  await d3.context.close();

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
