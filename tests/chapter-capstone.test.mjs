import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';

const app=fs.readFileSync('app.js','utf8');
const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-004-chapter-capstone-assessment.md','utf8');

test('pilot chapters each have applied capstones',()=>{
  assert.equal(Object.keys(CAPSTONES).length,2);
  assert.match(CAPSTONES.block1.brief,/school|adviser/i);
  assert.match(CAPSTONES.block2.brief,/model|failure/i);
});

test('capstone scoring rewards applied reasoning',()=>{
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  const strong=assessChapterCapstone({blockId:'block2',answers:{0:'80% means 8 of 10 unseen examples were correct, but accuracy alone does not show which class failed or under what conditions.',1:'The dark background is likely a shortcut because cup training images were mostly light while bottle images were dark, and both failures happened to dark-background cups.',2:'I would add cups and bottles across mixed light and dark backgrounds, retrain, then rerun the same unseen test set and compare both accuracy and the direction of errors.'}});
  assert.ok(strong.score>weak.score);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('progression requires chapter assessment as well as session completion',()=>{
  assert.match(app,/chapterAssessments/);
  assert.match(app,/blockQualified/);
  assert.match(app,/Chapter assessment required/);
});

test('API persists and evaluates chapter capstones',()=>{
  assert.match(api,/chapter_assessments/);
  assert.match(api,/assessChapterCapstone/);
  assert.match(api,/chapter-assessment/);
});

test('ADR preserves hands-on TY progression',()=>{
  assert.match(adr,/workplace task/i);
  assert.match(adr,/practical sessions complete/i);
  assert.match(adr,/next chapter unlocks/i);
});
