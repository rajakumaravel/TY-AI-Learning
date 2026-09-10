import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const student=fs.readFileSync('project-workspace.js','utf8');

test('chapter 2 project workspace is gated behind chapter 1 capstone qualification',()=>{
  assert.match(student,/chapter2Unlocked/);
  assert.match(student,/first\.sessions\.every/);
  assert.match(student,/chapterAssessments/);
  assert.match(student,/submittedAt/);
  assert.match(student,/if\(!chapter2Unlocked\(progress\.state\)\)return/);
});
