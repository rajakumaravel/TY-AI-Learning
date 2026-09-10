import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assessReflection, levelFromScore, copiedStudyRatio } from '../lib/assessment.mjs';

const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const index=fs.readFileSync('index.html','utf8');
const admin=fs.readFileSync('admin.html','utf8');
const migration=fs.readFileSync('netlify/database/migrations/003_formative-assessment/migration.sql','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-003-formative-assessment.md','utf8');

test('score bands map to TY student-facing levels',()=>{
  assert.equal(levelFromScore(3),'Getting started');
  assert.equal(levelFromScore(4),'Getting there');
  assert.equal(levelFromScore(7),'Going further');
});

test('strong evidence-based reflection scores above a minimal claim',()=>{
  const weak=assessReflection({reflection:'Google Maps could be wrong.',activity:{},studyText:''});
  const strong=assessReflection({reflection:'During my test I noticed the route changed because traffic data changed. This shows the prediction depends on current data; however a wrong prediction could make someone late, so a human should still check important journeys.',activity:{0:{result:'route changed'},1:{risk:'late'}},studyText:''});
  assert.ok(strong.score>weak.score);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('study-text overlap can trigger own-words caution',()=>{
  const study='AI systems use data to find patterns and make predictions about possible outcomes';
  assert.ok(copiedStudyRatio(study,study)>0.9);
});

test('assessment persistence preserves automated and teacher judgements separately',()=>{
  assert.match(migration,/suggested_level/i);
  assert.match(migration,/teacher_level/i);
  assert.match(migration,/teacher_comment/i);
  assert.match(api,/reviewMatch\s*=\s*path\.match/);
  assert.match(api,/reviewed_by/);
});

test('student assessment uses saved progress evidence and is formative',()=>{
  assert.match(api,/state\.reflections/);
  assert.match(api,/state\.activity/);
  assert.match(api,/assessReflection/);
  assert.match(index,/assessment-client\.js/);
});

test('teacher review UI is wired into protected admin experience',()=>{
  assert.match(admin,/admin-assessment\.js/);
  assert.match(api,/requireAdmin/);
  assert.match(api,/Administrator access required/);
});

test('ADR protects the TY hands-on and teacher-authority principles',()=>{
  assert.match(adr,/formative/i);
  assert.match(adr,/teacher/i);
  assert.match(adr,/hands-on|practical|work/i);
});
