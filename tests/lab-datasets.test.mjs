import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const course=JSON.parse(fs.readFileSync('curriculum.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('public/datasets/manifest.json','utf8'));
const app=fs.readFileSync('app.js','utf8');
const downloads=course.blocks.flatMap(b=>b.sessions.flatMap(s=>(s.activity.downloads||[]).map(d=>({session:s.id,...d}))));

test('every curriculum download exists on disk and in the manifest',()=>{
  assert.ok(downloads.length>=8);
  for(const d of downloads){
    assert.ok(fs.existsSync(`public/datasets/${d.file}`),`${d.session}: ${d.file} missing`);
    assert.ok(manifest[d.file]>0,`${d.session}: ${d.file} not in manifest`);
    assert.ok(d.label&&d.note,`${d.session}: label and note`);
  }
});

test('chapter 2 lab sessions each offer a dataset or template',()=>{
  for(const id of ['b2s2','b2s3','b2s4','b2s5','b2s6'])assert.ok(downloads.some(d=>d.session===id),id);
  assert.ok(downloads.some(d=>d.session==='b1lab'),'chapter 1 fallback cards');
  assert.ok(downloads.some(d=>/shortcut-trap/.test(d.file)&&d.session==='b2s5'));
});

test('chapter 3 dataset, teacher key and templates are generated and in the manifest',()=>{
  assert.ok(fs.existsSync('docs/teacher/club-signups-flawed.KEY.txt'),'teacher key generated outside public/');
  assert.ok(!fs.existsSync('public/datasets/club-signups-flawed.README.txt')&&!Object.keys(manifest).some(f=>/README|KEY/i.test(f)),'teacher key is never served');
  for(const file of ['club-signups-flawed.csv','club-signups-cleaned-template.csv','responsible-data-card-template.md','privacy-policy-extracts.txt','fairness-scenario-cards.txt']){
    assert.ok(fs.existsSync(`public/datasets/${file}`),`${file} missing`);
    assert.ok(manifest[file]>0,`${file} not in manifest`);
  }
  assert.ok(downloads.some(d=>d.session==='b3s4'&&d.file==='club-signups-flawed.csv'),'b3s4 flawed CSV');
  assert.ok(!downloads.some(d=>/README/.test(d.file)),'the teacher key is not offered to students');
});

test('chapter 3 book-aligned downloads: policy extracts in the Sherlock lab, scenario cards in the fairness challenge, Sheet A5 card in the data plan',()=>{
  assert.ok(downloads.some(d=>d.session==='b3s2'&&d.file==='privacy-policy-extracts.txt'),'b3s2 policy extracts');
  assert.ok(downloads.some(d=>d.session==='b3s4'&&d.file==='fairness-scenario-cards.txt'),'b3s4 scenario cards');
  assert.ok(downloads.some(d=>d.session==='b3s6'&&d.file==='responsible-data-card-template.md'),'b3s6 card template');
  assert.ok(downloads.some(d=>d.session==='b3s6'&&d.file==='club-signups-cleaned-template.csv'),'b3s6 cleaned template');
  const extracts=fs.readFileSync('public/datasets/privacy-policy-extracts.txt','utf8');
  assert.equal((extracts.match(/^=== \d\. /gm)||[]).length,3,'three fictional services');
  assert.match(extracts,/to improve our services/);
  const cards=fs.readFileSync('public/datasets/fairness-scenario-cards.txt','utf8');
  for(const re of [/school club recommendations/,/job shortlisting/,/transport planning/,/Decide what data you'd collect/,/joined mid-year/,/without smartphones/,/work nights/])assert.match(cards,re);
  const card=fs.readFileSync('public/datasets/responsible-data-card-template.md','utf8');
  for(const q of ['What data is collected?','What is observed rather than typed?','What might be inferred?','Why is it needed?','What could go wrong?','Who might be missing or misrepresented?','What should be removed or minimised?','What needs human review?'])assert.ok(card.includes(q),q);
  assert.match(card,/## Integrity \(optional\)/);
  for(const re of [/Quality/,/Provenance/,/Limitations/])assert.match(card,re);
});

test('dataset archives stay small enough for school connections',()=>{
  for(const [file,size] of Object.entries(manifest))assert.ok(size<1_000_000,`${file} is ${size} bytes`);
});

test('student UI lists downloads with the download attribute',()=>{
  assert.match(app,/href="\/datasets\/\$\{esc\(d\.file\)\}" download/);
  assert.match(app,/function activityHTML\(s\)\{return activityBodyHTML\(s\)\+downloadsHTML\(s\.activity\)\}/);
});
