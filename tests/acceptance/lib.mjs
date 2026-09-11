// Shared helpers for live acceptance scripts. Keys come from the Supabase CLI (`supabase login`) and are never printed.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export const BASE = (process.env.ACCEPTANCE_BASE_URL || '').replace(/\/$/, '');
export const REF = process.env.SUPABASE_PROJECT_REF || 'fnnftbsalquzwgzlsovx';
export const SUPABASE_URL = `https://${REF}.supabase.co`;
if (!BASE) { console.error('Set ACCEPTANCE_BASE_URL to the deployment under test.'); process.exit(2); }

const keys = JSON.parse(execFileSync('supabase', ['projects', 'api-keys', '--project-ref', REF, '-o', 'json'], { encoding: 'utf8' }));
export const ANON = keys.find(k => k.name === 'anon')?.api_key;
const SERVICE = keys.find(k => k.name === 'service_role')?.api_key;
if (!ANON || !SERVICE) { console.error('Could not read anon/service_role keys from Supabase CLI.'); process.exit(2); }

export const results = [];
export function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  (${detail})` : ''}`); }
export function finish() {
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed against ${BASE}`);
  process.exit(failed ? 1 : 0);
}

export async function api(path, token, init = {}) {
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${BASE}/api/${path}`, { ...init, headers });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
export async function rest(table, query, token, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers || {}) } });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
export async function createUser(label, appMetadata = {}) {
  const email = `acceptance-${label}-${randomUUID().slice(0, 8)}@ty-ai-learning.test`;
  const password = randomUUID() + randomUUID();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: `Acceptance ${label}` }, app_metadata: appMetadata }) });
  if (!res.ok) throw new Error(`createUser ${label}: HTTP ${res.status} ${await res.text()}`);
  const user = await res.json();
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!login.ok) throw new Error(`login ${label}: HTTP ${login.status} ${await login.text()}`);
  const session = await login.json();
  return { id: user.id, token: session.access_token, session, displayName: `Acceptance ${label}` };
}
export async function deleteUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
  return res.ok;
}
export async function cleanup(users) {
  for (const u of users) check(`cleanup: deleted test user ${u.id.slice(0, 8)}`, await deleteUser(u.id));
}

export const CHAPTER1_SESSIONS = ['b1s1', 'b1lab', 'b1s2', 'b1s3', 'b1s4'];
export const CAPSTONE1_ANSWERS = {
  q1: 'INPUT: student interests survey plus click and attendance data. AI ACTION: rank clubs by predicted enjoyment. OUTPUT: top three after-school activity recommendations for each student.',
  q2: 'Benefit: students discover clubs they would not have searched for. Risk: it recommends only popular clubs and hides minority interests. Other stakeholder: club coordinators whose numbers change.',
  q3: 'The final choice of which club to join and any decision to exclude a student should stay with the student and a teacher, because the model cannot see wellbeing or timetable context.'
};
export const CHAPTER2_SESSIONS = ['b2s1', 'b2s2', 'b2s3', 'b2s4', 'b2s5', 'b2s6', 'b2s7'];
export const CAPSTONE2_ANSWERS = {
  q1: 'The 80% accuracy tells me the model got 8 of 10 unseen tests right, so it usually works. It fails to tell me which class the errors fall on or why, because both cup misses were on dark backgrounds and accuracy hides that pattern.',
  q2: 'The model learned a background shortcut: light background means cup, dark background means bottle. The evidence is that the training data paired cups with light backgrounds and bottles with dark ones, and the only failures were cups photographed on dark backgrounds.',
  q3: 'Change the training data so each class has a balanced mix of light and dark backgrounds, then retrain and retest V2 on exactly the same 10 unseen images plus new dark-background cups, and compare the confusion matrix with V1 to check the shortcut is gone.'
};
export const CHAPTER3_SESSIONS = ['b3s1', 'b3s2', 'b3s3', 'b3s4', 'b3s5'];
export const CAPSTONE3_ANSWERS = {
  q1: 'The library app collects volunteered data such as the search words a student types, observed data such as the time and number of borrows, and inferred data such as a reading level guessed from borrow history, which was never collected from the student.',
  q2: 'The inferred reading level is the biggest risk because it could be wrong and could label a student unfairly, and the search log is sensitive because it reveals private interests. Students who read slowly or search for personal topics could be harmed if this data leaks or drives decisions.',
  q3: 'I would remove the inferred reading level, anonymise search logs after 30 days, collect only what the recommendation needs with consent, and state on the data card that the data must not be used to rank or group students by ability.'
};
