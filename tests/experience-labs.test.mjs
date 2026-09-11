import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const course=JSON.parse(fs.readFileSync('curriculum.json','utf8'));
const app=fs.readFileSync('app.js','utf8');
const workspace=fs.readFileSync('project-workspace.js','utf8');
const admin=fs.readFileSync('admin.js','utf8');
const fn=fs.readFileSync('functions/api/[[path]].js','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-005-experience-lab-standard.md','utf8');
const TAGS=['DO','TEST','MAKE','BREAK','IMPROVE','PROVE'];

test('every chapter declares an Experience Lab covering all six ADR-005 tests',()=>{
  assert.match(adr,/DO.*TEST.*MAKE.*BREAK.*IMPROVE.*PROVE/s);
  for(const b of course.blocks){
    assert.ok(b.lab?.title&&b.lab?.summary,`${b.id} lab metadata`);
    const ids=new Set(b.sessions.map(s=>s.id));
    assert.deepEqual(b.lab.stages.map(x=>x[0]),TAGS,`${b.id} stage tags`);
    for(const [,sid] of b.lab.stages)assert.ok(ids.has(sid),`${b.id} stage session ${sid} exists`);
    assert.ok(b.sessions.some(s=>s.activity.kind==='lab'),`${b.id} has a lab session`);
  }
});

test('lab sessions use free browser tools or built-in same-origin datasets, show safety guidance, and keep a fallback',()=>{
  for(const b of course.blocks)for(const s of b.sessions.filter(s=>s.activity.kind==='lab')){
    const a=s.activity;
    assert.match(a.tool.url,/^(https:\/\/|\/datasets\/)/);
    assert.equal(a.tool.free,true);
    assert.ok(a.privacy.length>=3&&a.privacy.some(p=>/account/i.test(p))&&a.privacy.some(p=>/face|name|personal/i.test(p)),`${s.id} privacy guidance`);
    assert.ok(a.fallback?.title&&a.fallback.steps.length>=3,`${s.id} fallback`);
    assert.ok(a.steps.length>=4&&a.fields.length>=4,`${s.id} steps and evidence fields`);
  }
});

test('chapter 1 lab captures prediction, behaviour, failure, input change and evidence',()=>{
  const lab=course.blocks[0].sessions.find(s=>s.id==='b1lab');
  assert.ok(lab);
  const fields=lab.activity.fields.join(' ');
  for(const re of [/prediction/i,/actually did/i,/unexpected|failure/i,/changed/i,/evidence/i])assert.match(fields,re);
  assert.equal(course.blocks[0].sessions.reduce((n,s)=>n+s.minutes,0),120);
});

test('chapter 2 lab is the Teachable Machine train-break-improve sequence',()=>{
  const b=course.blocks[1];
  assert.equal(b.sessions.find(s=>s.id==='b2s2').activity.kind,'lab');
  assert.match(b.sessions.find(s=>s.id==='b2s2').activity.tool.url,/teachablemachine/);
  assert.deepEqual(b.lab.stages.map(x=>x[1]),['b2s2','b2s3','b2s4','b2s5','b2s6','b2s7']);
});

test('chapter 3 lab is the Data Tracking Sherlock audit with the book\'s category-level notice and the policy extracts fallback',()=>{
  const b=course.blocks[2];
  const lab=b.sessions.find(s=>s.id==='b3s2');
  assert.equal(lab.activity.kind,'lab');
  assert.match(lab.activity.tool.name,/privacy policy or app-store listing/);
  assert.match(lab.activity.privacy[0],/^Investigate at category level only\./);
  assert.equal(lab.activity.fallback.title,'No policy to hand?');
  assert.ok(lab.activity.downloads.some(d=>d.file==='privacy-policy-extracts.txt'));
  assert.deepEqual(b.lab.stages.map(x=>x[1]),['b3s2','b3s3','b3s6','b3s4','b3s6','b3s6']);
});

test('student UI gates the external tool behind the safety notice and requires lab evidence',()=>{
  assert.match(app,/data-ack/);
  assert.match(app,/id="labToolLink" class="primary external \$\{ack\?'':'disabled'\}/);
  assert.match(app,/if\(a\.kind==='lab'\)return Boolean\(v\.ack\)&&a\.fields\.every/);
  assert.match(app,/data-fallback/);
  assert.match(app,/renderLabBanner\(\)/);
  assert.match(app,/labEvidenceHTML\(activeBlock\)\}\$\{cap\.prompts/);
});

test('lab evidence flows into the project workspace and admin review',()=>{
  assert.match(workspace,/id="pwImportLab"/);
  assert.match(workspace,/function labEvidenceItems/);
  assert.match(admin,/activity\.kind === "lab"/);
});

test('server requires every chapter 1 session, including the lab, before the capstone',()=>{
  const ids=course.blocks[0].sessions.map(s=>s.id);
  assert.ok(fn.includes(`block1:[${ids.map(id=>`'${id}'`).join(',')}]`));
});
