import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';

const app=fs.readFileSync('app.js','utf8');
const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-004-chapter-capstone-assessment.md','utf8');

test('pilot chapters each have applied capstones',()=>{
  assert.equal(Object.keys(CAPSTONES).length,3);
  assert.match(CAPSTONES.block1.brief,/school|adviser/i);
  assert.match(CAPSTONES.block2.brief,/model|failure/i);
  assert.match(CAPSTONES.block3.brief,/library.*search.*inferred/is);
  assert.equal(CAPSTONES.block3.id,'block3-capstone');
  assert.equal(CAPSTONES.block3.title,'Data Card review');
  assert.equal(CAPSTONES.block3.prompts.length,3);
});

test('block3 capstone scoring counts data-detective vocabulary as concept and action',()=>{
  const weak=assessChapterCapstone({blockId:'block3',answers:{0:'Some fields are fine.',1:'It could be wrong.',2:'Use it carefully.'}});
  const strong=assessChapterCapstone({blockId:'block3',answers:{0:'Search terms and borrow history are observed, the name is volunteered, and reading_level is inferred, so the inferred column and the full search log are sensitive and should be removed or anonymised before recommending books.',1:'A student could be labelled with a low reading level because they borrow picture books for a younger sibling, therefore I would want evidence such as a teacher check on a sample of rows before trusting it.',2:'The data can be used to suggest books a student might like. It must not be used to judge ability or rank students, and a librarian should review the card each term because the inferred field can drift.'}});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('existing chapter scoring is unchanged by the block3 keywords',()=>{
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  assert.deepEqual(weak.criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
  assert.equal(weak.level,'Getting started');
  const strong=assessChapterCapstone({blockId:'block2',answers:{0:'80% means 8 of 10 unseen examples were correct, but accuracy alone does not show which class failed or under what conditions.',1:'The dark background is likely a shortcut because cup training images were mostly light while bottle images were dark, and both failures happened to dark-background cups.',2:'I would add cups and bottles across mixed light and dark backgrounds, retrain, then rerun the same unseen test set and compare both accuracy and the direction of errors.'}});
  assert.deepEqual(strong.criteria,{understanding:2,evidence:2,reasoning:2,ownWords:1});
  assert.equal(strong.level,'Going further');
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
