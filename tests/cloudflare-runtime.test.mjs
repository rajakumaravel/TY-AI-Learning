import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fn=fs.readFileSync('functions/api/[[path]].js','utf8');
const vite=fs.readFileSync('vite.config.mjs','utf8');
const identity=fs.readFileSync('lib/identity-compat.mjs','utf8');
const routes=JSON.parse(fs.readFileSync('public/_routes.json','utf8'));
const deploy=fs.readFileSync('.github/workflows/cloudflare-pages.yml','utf8');
const migrate=fs.readFileSync('.github/workflows/supabase-migrate.yml','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-007-cloudflare-supabase-platform.md','utf8');

test('Cloudflare API has no Netlify runtime dependency',()=>{
  assert.doesNotMatch(fn,/@netlify\//);
  assert.match(fn,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn,/onRequest\(context\)/);
  assert.match(fn,/Authentication required/);
  assert.match(fn,/Administrator access required/);
});

test('existing frontend identity imports are redirected to Supabase',()=>{
  assert.match(vite,/@netlify\/identity/);
  assert.match(vite,/identity-compat\.mjs/);
  assert.match(identity,/createClient/);
  assert.match(identity,/signInWithOAuth/);
  assert.match(identity,/provider/);
  assert.match(identity,/sb_access_token/);
});

test('Pages Functions run only for API routes',()=>{
  assert.deepEqual(routes,{version:1,include:['/api/*'],exclude:[]});
});

test('production platform workflows are manual until cutover approval',()=>{
  assert.match(deploy,/workflow_dispatch/);
  assert.match(deploy,/wrangler-action@v3/);
  assert.match(deploy,/pages deploy dist/);
  assert.match(migrate,/workflow_dispatch/);
  assert.match(migrate,/supabase@latest db push/);
  assert.match(migrate,/--dry-run/);
});

test('migration ADR prevents guessed identity reconciliation and premature cutover',()=>{
  assert.match(adr,/No guessed or name-based identity matching is permitted/i);
  assert.match(adr,/must not be merged into `main`/i);
  assert.match(adr,/RLS/i);
});

test('server derives chapter qualification from chapter_assessments and gates the next chapter',()=>{
  assert.match(fn,/from\('chapter_assessments'\)\.select\('block_id,suggested_level,suggested_score,teacher_level,submitted_at'\)/);
  assert.match(fn,/chapterAssessments:await chapterQualifications\(db,userId\)/);
  assert.match(fn,/state:await withServerQualifications\(db,auth\.user\.id,data\?\.state\)/);
  assert.match(fn,/const trusted=await withServerQualifications\(db,auth\.user\.id,state\)/);
  assert.equal((fn.match(/previousBlockQualified\(db,auth\.user\.id,(blockId|projectId)\)\)\)return json\(\{error:PREVIOUS_CHAPTER_REQUIRED\},409\)/g)||[]).length,3);
  assert.match(fn,/block3:\['b3s1','b3s2','b3s3','b3s4','b3s5','b3s6'\]/);
  assert.match(fn,/block4:\['b4s1','b4s2','b4s3','b4s4','b4s5','b4s6','b4s7','b4s8','b4s9','b4s10'\]/);
  assert.match(fn,/block5:\['b5s1','b5s2','b5s3','b5s4','b5s5','b5s6','b5s7','b5s8','b5s9'\]/);
  assert.match(fn,/block7:\['b7s1','b7s2','b7s3','b7s4','b7s5','b7s6','b7s7','b7s8'\]/);
  assert.match(fn,/block8:\['b8s1','b8s2','b8s3','b8s4','b8s5','b8s6','b8s7','b8s8'\]/);
});

test('admin/analytics is gated by the same requireAdmin check as every other admin route, with no separate or weaker check',()=>{
  const adminRouteGuards=fn.match(/path==='admin\/[a-z]+'&&method==='GET'\)\{\s*const admin=await requireAdmin\(context\); if\(admin\.error\)return admin\.error;/g)||[];
  assert.ok(adminRouteGuards.some((g)=>g.includes("'admin/analytics'")));
  assert.ok(adminRouteGuards.some((g)=>g.includes("'admin/students'")));
  assert.ok(adminRouteGuards.some((g)=>g.includes("'admin/me'")));
});

test('admin/analytics computes aggregates per request with no new table, migration or cache',()=>{
  assert.match(fn,/computePilotAnalytics\(/);
  assert.doesNotMatch(fn,/pilot_analytics/);
  assert.doesNotMatch(fn,/analytics_cache/);
});
