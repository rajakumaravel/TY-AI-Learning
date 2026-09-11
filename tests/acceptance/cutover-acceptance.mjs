// ADR-007 cutover acceptance: runs against a live Cloudflare Pages deployment and the linked Supabase project.
// Not part of `npm test`. Requires `supabase login` (keys are read from the CLI and never printed).
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/cutover-acceptance.mjs
//
// Creates three throwaway auth users (two students, one app-metadata admin), exercises the API and RLS, then deletes them.

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const BASE = (process.env.ACCEPTANCE_BASE_URL || '').replace(/\/$/, '');
const REF = process.env.SUPABASE_PROJECT_REF || 'fnnftbsalquzwgzlsovx';
if (!BASE) { console.error('Set ACCEPTANCE_BASE_URL to the deployment under test.'); process.exit(2); }

const keys = JSON.parse(execFileSync('supabase', ['projects', 'api-keys', '--project-ref', REF, '-o', 'json'], { encoding: 'utf8' }));
const ANON = keys.find(k => k.name === 'anon')?.api_key;
const SERVICE = keys.find(k => k.name === 'service_role')?.api_key;
if (!ANON || !SERVICE) { console.error('Could not read anon/service_role keys from Supabase CLI.'); process.exit(2); }
const SUPABASE_URL = `https://${REF}.supabase.co`;

const results = [];
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  (${detail})` : ''}`); }

async function api(path, token, init = {}) {
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${BASE}/api/${path}`, { ...init, headers });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
async function rest(table, query, token, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers || {}) } });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
async function createUser(label, appMetadata = {}) {
  const email = `acceptance-${label}-${randomUUID().slice(0, 8)}@ty-ai-learning.test`;
  const password = randomUUID() + randomUUID();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: `Acceptance ${label}` }, app_metadata: appMetadata }) });
  if (!res.ok) throw new Error(`createUser ${label}: HTTP ${res.status} ${await res.text()}`);
  const user = await res.json();
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!login.ok) throw new Error(`login ${label}: HTTP ${login.status} ${await login.text()}`);
  const session = await login.json();
  return { id: user.id, token: session.access_token };
}
async function deleteUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
  return res.ok;
}

const users = [];
try {
  const a = await createUser('student-a'); users.push(a);
  const b = await createUser('student-b'); users.push(b);
  const admin = await createUser('admin', { role: 'admin' }); users.push(admin);

  // Unauthenticated
  check('unauthenticated /api/session is 401', (await api('session')).status === 401);
  check('unauthenticated /api/admin/me is 401', (await api('admin/me')).status === 401);

  // Sign-in and learner provisioning
  const sessionA = await api('session', a.token);
  check('student A /api/session authenticated', sessionA.status === 200 && sessionA.body?.authenticated === true, JSON.stringify(sessionA.body));
  check('session does not expose other learner fields', sessionA.body?.student?.id === a.id);

  // Progress persistence (server-side; second read simulates another device)
  const state = { completed: ['s1-1'], badges: [], marker: randomUUID() };
  const put = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state }) });
  check('student A PUT /api/progress ok', put.status === 200 && put.body?.ok === true, JSON.stringify(put.body));
  const get = await api('progress', a.token);
  check('student A progress round-trips', get.status === 200 && get.body?.state?.marker === state.marker);
  const getB = await api('progress', b.token);
  check('student B sees empty progress, not A\'s', getB.status === 200 && !getB.body?.state?.marker);

  // Project workspace save
  const workspace = {
    workLog: [{ planned: 'Train V1', did: 'Trained a two-class model on 20 images per class.', result: 'V1 accuracy about 80% on unseen tests.', blocker: '', decision: '', next: 'Break it', minutes: 30, date: '2026-09-11' }],
    evidence: [
      { label: 'Test log', url: 'https://example.com/test-log', note: 'Table of 10 unseen test results.' },
      { label: 'Confusion matrix', url: '', note: 'Confusion matrix drawn from the test log results.' },
      { label: 'V2 comparison', url: 'https://example.com/v2', note: 'V2 improved on the background bias failures.' }
    ],
    finalRecommendation: 'Deploy V2 only with a wider background set; V1 learned a shortcut from the desk colour and must not be used in production.'
  };
  const save = await api('projects/block2', a.token, { method: 'PUT', body: JSON.stringify({ workspace }) });
  check('student A PUT /api/projects/block2 ok', save.status === 200 && save.body?.project?.status === 'in_progress', JSON.stringify(save.body));
  const projB = await api('projects/block2', b.token);
  check('student B GET project is own empty workspace', projB.status === 200 && projB.body?.project?.status === 'not_started' && (projB.body?.project?.workspace?.workLog || []).length === 0);

  // RLS: browser role reads own rows only, and cannot write
  const rlsSelf = await rest('student_projects', `select=user_id,project_id&user_id=eq.${a.id}`, a.token);
  check('RLS: student A reads own project row', rlsSelf.status === 200 && Array.isArray(rlsSelf.body) && rlsSelf.body.length === 1, JSON.stringify(rlsSelf.body));
  const rlsCross = await rest('student_projects', `select=user_id,project_id&user_id=eq.${a.id}`, b.token);
  check('RLS: student B cannot read A\'s project row', rlsCross.status === 200 && Array.isArray(rlsCross.body) && rlsCross.body.length === 0, JSON.stringify(rlsCross.body));
  const rlsProgress = await rest('learner_progress', `select=user_id&user_id=eq.${a.id}`, b.token);
  check('RLS: student B cannot read A\'s progress row', rlsProgress.status === 200 && Array.isArray(rlsProgress.body) && rlsProgress.body.length === 0);
  const rlsLearners = await rest('learners', 'select=user_id', b.token);
  check('RLS: student B learners view is only self', rlsLearners.status === 200 && Array.isArray(rlsLearners.body) && rlsLearners.body.every(r => r.user_id === b.id));
  const rlsWrite = await rest('student_projects', `user_id=eq.${a.id}`, a.token, { method: 'PATCH', body: JSON.stringify({ status: 'reviewed' }) });
  check('RLS: student A cannot write own project row directly', rlsWrite.status >= 400 || (Array.isArray(rlsWrite.body) && rlsWrite.body.length === 0), `status ${rlsWrite.status}`);

  // Admin authorisation
  check('student A /api/admin/me is 403', (await api('admin/me', a.token)).status === 403);
  check('student A /api/admin/students is 403', (await api('admin/students', a.token)).status === 403);
  check('student A admin project list is 403', (await api(`projects/admin/student/${b.id}`, a.token)).status === 403);
  const me = await api('admin/me', admin.token);
  check('app-metadata admin /api/admin/me is 200', me.status === 200 && me.body?.authorized === true, JSON.stringify(me.body));
  const students = await api('admin/students', admin.token);
  check('admin student list includes A', students.status === 200 && (students.body?.students || []).some(s => s.id === a.id));

  // Submit and review
  const submit = await api('projects/block2/submit', a.token, { method: 'POST' });
  check('student A submits project', submit.status === 200 && submit.body?.project?.status === 'submitted', JSON.stringify(submit.body));
  const adminView = await api(`projects/admin/student/${a.id}`, admin.token);
  const seen = adminView.body?.projects?.[0];
  check('admin sees exact submitted snapshot', adminView.status === 200 && seen?.submittedSnapshot?.finalRecommendation === workspace.finalRecommendation);
  const review = await api(`projects/admin/student/${a.id}/block2/review`, admin.token, { method: 'PUT', body: JSON.stringify({ comment: 'Acceptance review.' }) });
  check('admin reviews project', review.status === 200 && review.body?.project?.status === 'reviewed', JSON.stringify(review.body));
  const after = await api('projects/block2', a.token);
  check('student A sees reviewed status and comment', after.body?.project?.status === 'reviewed' && after.body?.project?.reviewComment === 'Acceptance review.');
  const reviewByStudent = await api(`projects/admin/student/${a.id}/block2/review`, b.token, { method: 'PUT', body: JSON.stringify({ comment: 'x' }) });
  check('student B cannot review A\'s project', reviewByStudent.status === 403);
} catch (error) {
  check('run completed without exception', false, error.message);
} finally {
  for (const u of users) check(`cleanup: deleted test user ${u.id.slice(0, 8)}`, await deleteUser(u.id));
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${BASE}`);
process.exit(failed ? 1 : 0);
