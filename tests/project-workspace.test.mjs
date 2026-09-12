import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROJECT_BRIEFS, emptyProjectWorkspace, projectReadyForSubmission, validProjectId } from '../lib/project-briefs.mjs';

const fn=fs.readFileSync('netlify/functions/projects.mts','utf8');
const migration=fs.readFileSync('netlify/database/migrations/005_project-workspace/migration.sql','utf8');
const student=fs.readFileSync('project-workspace.js','utf8');
const admin=fs.readFileSync('admin-projects.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const adminHtml=fs.readFileSync('admin.html','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-006-project-workspace.md','utf8');

test('chapter 2 project brief matches hands-on ML workflow',()=>{
  const b=PROJECT_BRIEFS.block2;
  assert.equal(b.role,'Junior ML Test Engineer');
  assert.match(b.objective,/train.*test.*break.*diagnose.*improve/i);
  assert.ok(b.acceptanceCriteria.length>=6);
  assert.ok(validProjectId('block2'));
});

test('submission requires real work log, evidence and recommendation',()=>{
  assert.equal(projectReadyForSubmission(emptyProjectWorkspace()),false);
  const workspace={workLog:[{did:'I tested the model against unseen objects.',result:'The dark background caused repeat errors.'}],evidence:[{note:'V1 test log shows 7 of 10 correct.'},{note:'Confusion matrix shows three cup misses.'},{note:'V2 retest improved the same test set.'}],finalRecommendation:'I would only use the improved model in a supervised pilot because V2 performs better on the same test set, but unusual lighting still causes errors and needs human checking.'};
  assert.equal(projectReadyForSubmission(workspace),true);
});

test('project persistence preserves working copy and submitted snapshot separately',()=>{
  assert.match(migration,/workspace JSONB/i);
  assert.match(migration,/submitted_snapshot JSONB/i);
  assert.match(fn,/submitted_snapshot=\$\{snapshot\}::jsonb/);
});

test('student project APIs derive identity and expose no learner-id selector',()=>{
  assert.match(fn,/getUser\(\)/);
  assert.match(fn,/identity_user_id=\$\{auth\.user\.id\}/);
  assert.doesNotMatch(student,/learnerId|studentId/);
});

test('admin project APIs are server-authorised',()=>{
  assert.match(fn,/requireAdmin/);
  assert.match(fn,/ADMIN_EMAILS/);
  assert.match(fn,/Administrator access required/);
  assert.match(admin,/admin\/student/);
});

test('student and admin portals load project workspace modules',()=>{
  assert.match(index,/project-workspace\.js/);
  assert.match(adminHtml,/admin-projects\.js/);
});

test('project workspace supports multi-visit work evidence',()=>{
  assert.match(student,/Save work/);
  assert.match(student,/workLog/);
  assert.match(student,/evidence/);
  assert.match(student,/finalRecommendation/);
  assert.match(student,/`\$\{k\}: \$\{String\(r\.prompt\)\.trim\(\)\} → \$\{String\(r\.better\|\|''\)\.trim\(\)\}`/);
  assert.match(student,/`\$\{marks\.length\} marks: `/);
  assert.match(student,/`\$\{runs\.length\} runs; Group B \$\{Math\.min\(\.\.\.gb\)\}%–\$\{Math\.max\(\.\.\.gb\)\}%; overall /);
  assert.match(student,/`\$\{runs\.length\} paths`/);
  assert.match(student,/`\$\{r\.id\}: \$\{r\.steps\[0\]\.label\} \\u2192 \$\{r\.steps\[1\]\.label\}; value \\u20ac\$\{r\.value\.toFixed\(2\)\}; wrong \$\{r\.wrong\}\/100 \(A \$\{r\.m\.wrongA\}\/80, B \$\{r\.m\.wrongB\}\/20\); retention \$\{r\.m\.retentionDays\} days`/);
  // A user-test log has no prediction to score, so a testlog without actual/prediction rows summarises by its declared columns.
  assert.match(student,/const declared=\(a\.columns\|\|\[\]\)\.map\(c=>c\[0\]\);const keys=declared\.length\?declared:\[\.\.\.new Set\(all\.flatMap\(r=>Object\.keys\(r\)\)\)\]/);
});

test('ADR locks project work as first-class TY evidence',()=>{
  assert.match(adr,/first-class/i);
  assert.match(adr,/hands-on|practical/i);
  assert.match(adr,/not a punitive timesheet/i);
});
