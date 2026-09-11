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
