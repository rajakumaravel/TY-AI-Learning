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

test('dataset archives stay small enough for school connections',()=>{
  for(const [file,size] of Object.entries(manifest))assert.ok(size<1_000_000,`${file} is ${size} bytes`);
});

test('student UI lists downloads with the download attribute',()=>{
  assert.match(app,/href="\/datasets\/\$\{esc\(d\.file\)\}" download/);
  assert.match(app,/function activityHTML\(s\)\{return activityBodyHTML\(s\)\+downloadsHTML\(s\.activity\)\}/);
});
