import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const student=fs.readFileSync('project-workspace.js','utf8');

test('project workspaces are gated behind the previous chapter capstone qualification, in COURSE order',()=>{
  assert.match(student,/function projectUnlocked\(state=\{\},projectId\)/);
  assert.match(student,/COURSE\.blocks\.findIndex\(b=>b\.id===projectId\)/);
  assert.match(student,/prev\.sessions\.every/);
  assert.match(student,/chapterAssessments/);
  assert.match(student,/submittedAt/);
  assert.match(student,/if\(!projectUnlocked\(progress\.state,projectId\)\)return/);
  assert.doesNotMatch(student,/chapter2Unlocked/);
});

test('project workspace requests and lab evidence are parameterised by project, not hard-coded to block2',()=>{
  assert.match(student,/async function req\(projectId,path='',opts=\{\}\)/);
  assert.doesNotMatch(student,/req\('block2/);
  assert.doesNotMatch(student,/b\.id==='block2'/);
  assert.match(student,/function labEvidenceItems\(state=\{\},blockId\)/);
  assert.match(student,/a\.kind==='dataset'/);
  assert.match(student,/\$\{f\.issue\} at \$\{f\.target\}: /);
  assert.match(student,/a\.kind==='chain'/);
  assert.match(student,/\.join\(' → '\)/);
  assert.match(student,/a\.kind==='prompt'/);
  assert.match(student,/a\.kind==='annotate'/);
  assert.match(student,/a\.kind==='simulator'/);
  assert.match(student,/a\.kind==='decision'/);
  // Chapter 8 adds no kind: its six lab stages import through the existing lab/textfields, chain and testlog branches.
  assert.match(student,/a\.kind==='lab'\|\|a\.kind==='textfields'/);
  assert.match(student,/a\.kind==='testlog'/);
  assert.match(student,/`Project: \$\{PROJECT_BRIEFS\[projectId\]\.chapter\}`/);
  assert.match(student,/CHAPTER \$\{chapterNumber\(activeProjectId\)\} PROJECT/);
  assert.match(student,/'projectWorkspaceBtn':`projectWorkspaceBtn-\$\{projectId\}`/);
});
