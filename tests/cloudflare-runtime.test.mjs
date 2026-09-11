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
});
