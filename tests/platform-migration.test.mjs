import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260910123000_initial_platform_schema.sql','utf8');
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');

test('Supabase schema uses auth UUIDs instead of Netlify identity ids as primary ownership',()=>{
  assert.match(sql,/user_id uuid primary key references auth\.users\(id\)/i);
  assert.match(sql,/legacy_identity_user_id text unique/i);
  assert.doesNotMatch(sql,/identity_user_id text primary key/i);
});

test('all learner-owned tables have RLS enabled',()=>{
  for(const table of ['learners','learner_progress','formative_assessments','chapter_assessments','student_projects']){
    assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`,'i'));
  }
});

test('student RLS policies scope reads to auth.uid()',()=>{
  const matches=sql.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)||[];
  assert.equal(matches.length,5);
  assert.match(sql,/revoke all on table public\.student_projects from anon, authenticated/i);
});

test('browser clients are not granted direct mutation privileges',()=>{
  assert.doesNotMatch(sql,/grant\s+(insert|update|delete)/i);
  assert.match(sql,/grant select on table public\.learner_progress to authenticated/i);
});

test('CI executes on non-main migration branches as well as pull requests',()=>{
  assert.match(ci,/push:\s*\n\s*branches: \['\*\*'\]/m);
  assert.match(ci,/pull_request:\s*\n\s*branches: \[main\]/m);
});
