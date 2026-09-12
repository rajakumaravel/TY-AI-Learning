// Open a deployment as a throwaway reviewer account with every chapter unlocked.
//
//   ACCEPTANCE_BASE_URL=https://preview-main.ty-ai-learning.pages.dev node scripts/browse-all-chapters.mjs [--admin]
//
// Creates a fresh Supabase auth user (keys via `supabase login`, never printed), completes all sessions and
// submits the chapter capstones for every block except the last through the deployment's own API, then
// opens a headed Chromium with the session injected into localStorage exactly as the Google OAuth
// callback would store it. Close the browser window to delete the user again.

import { chromium } from 'playwright';
import { REF, BASE, api, createUser, deleteUser, CHAPTER1_SESSIONS, CHAPTER2_SESSIONS, CHAPTER3_SESSIONS, CHAPTER4_SESSIONS, CAPSTONE1_ANSWERS, CAPSTONE2_ANSWERS, CAPSTONE3_ANSWERS } from '../tests/acceptance/lib.mjs';

const admin = process.argv.includes('--admin');
const user = await createUser(admin ? 'reviewer-admin' : 'reviewer', admin ? { role: 'admin' } : {});
try {
  const completed = [];
  const steps = [[CHAPTER1_SESSIONS, 'block1', CAPSTONE1_ANSWERS], [CHAPTER2_SESSIONS, 'block2', CAPSTONE2_ANSWERS], [CHAPTER3_SESSIONS, 'block3', CAPSTONE3_ANSWERS], [CHAPTER4_SESSIONS]];
  for (const [sessions, block, answers] of steps) {
    completed.push(...sessions);
    const put = await api('progress', user.token, { method: 'PUT', body: JSON.stringify({ state: { completed, reflections: {}, activity: {}, badges: [], chapterAssessments: {} } }) });
    if (put.status !== 200) throw new Error(`progress PUT after ${block || 'last chapter'}: HTTP ${put.status} ${JSON.stringify(put.body)}`);
    if (!block) break;
    const cap = await api(`chapter-assessment/${block}`, user.token, { method: 'POST', body: JSON.stringify({ answers }) });
    if (cap.status !== 200) throw new Error(`capstone ${block}: HTTP ${cap.status} ${JSON.stringify(cap.body)}`);
  }
  console.log(`Reviewer ${user.id.slice(0, 8)} seeded on ${BASE}; every chapter unlocked${admin ? ', admin role set' : ''}. Close the browser to delete it.`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(user.session)]);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await new Promise(resolve => { browser.on('disconnected', resolve); context.on('close', resolve); page.on('close', resolve); });
} finally {
  console.log(await deleteUser(user.id) ? 'Reviewer account deleted.' : 'WARNING: could not delete the reviewer account.');
}
