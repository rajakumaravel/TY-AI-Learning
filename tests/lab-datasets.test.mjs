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

test('chapter 4 downloads are generated, in the manifest and offered in the right sessions; the teacher key stays outside public/',()=>{
  const files=['genai-weak-question-card.txt','genai-sample-outputs.txt','genai-verification-topics.txt','genai-red-team-prompts.txt','prompt-experiment-sheet-A4.csv','verification-log-A2.csv','reusable-prompt-template.md'];
  for(const file of files){
    assert.ok(fs.existsSync(`public/datasets/${file}`),`${file} missing`);
    assert.ok(manifest[file]>0,`${file} not in manifest`);
  }
  assert.ok(fs.existsSync('docs/teacher/genai-sample-outputs.KEY.txt'),'teacher key generated outside public/');
  assert.ok(!fs.existsSync('public/datasets/genai-sample-outputs.KEY.txt')&&!fs.readdirSync('public/datasets').some(f=>/KEY/i.test(f)),'teacher key is never served');
  assert.ok(!downloads.some(d=>/KEY/i.test(d.file)),'the teacher key is not offered to students');
  assert.ok(downloads.some(d=>d.session==='b4s1'&&d.file==='genai-weak-question-card.txt'),'b4s1 weak question card');
  assert.ok(downloads.some(d=>d.session==='b4s1'&&d.file==='genai-sample-outputs.txt'),'b4s1 sample outputs');
  assert.ok(downloads.some(d=>d.session==='b4s3'&&d.file==='prompt-experiment-sheet-A4.csv'),'b4s3 Sheet A4');
  for(const file of ['genai-verification-topics.txt','genai-sample-outputs.txt','verification-log-A2.csv'])assert.ok(downloads.some(d=>d.session==='b4s6'&&d.file===file),`b4s6 ${file}`);
  assert.ok(downloads.some(d=>d.session==='b4s8'&&d.file==='reusable-prompt-template.md'),'b4s8 template');
  assert.ok(downloads.some(d=>d.session==='b4s9'&&d.file==='genai-red-team-prompts.txt'),'b4s9 red-team cards');
});

test('chapter 4 sample outputs are labelled synthetic, mix verdicts, and every claim is marked in the teacher key',()=>{
  const card=fs.readFileSync('public/datasets/genai-weak-question-card.txt','utf8');
  assert.match(card,/Tell me about the River Shannon\./);
  for(const re of [/No context/,/No task/,/No constraints/,/No format/])assert.match(card,re);
  const samples=fs.readFileSync('public/datasets/genai-sample-outputs.txt','utf8');
  assert.match(samples,/SYNTHETIC SAMPLES/);
  assert.equal((samples.match(/^=== Answer \d /gm)||[]).length,2,'two answers');
  assert.doesNotMatch(samples,/\[(SUPPORTED|UNCERTAIN|WRONG)\]/,'verdicts are not marked for students');
  const key=fs.readFileSync('docs/teacher/genai-sample-outputs.KEY.txt','utf8');
  const marked=[...key.matchAll(/^\d+\. \[(SUPPORTED|UNCERTAIN|WRONG)\] (.+)$/gm)];
  assert.ok(marked.length>=20,'every claim marked');
  for(const [,verdict,claim] of marked)assert.ok(samples.includes(claim),`marked claim appears in the samples: ${claim}`);
  for(const v of ['SUPPORTED','UNCERTAIN','WRONG'])assert.ok(marked.some(m=>m[1]===v),`at least one ${v}`);
  assert.match(key,/Shannon Bridge Act/);
  assert.match(key,/Fabricated citation/);
  assert.match(key,/Red-team prompt cards: planted issues/);
  const topics=fs.readFileSync('public/datasets/genai-verification-topics.txt','utf8');
  assert.equal((topics.match(/^=== Topic \d: /gm)||[]).length,3,'three topics');
  for(const re of [/River Shannon/,/Transition Year/,/Apollo 11/])assert.match(topics,re);
  assert.equal((topics.match(/^[1-5]\. /gm)||[]).length,15,'five checkable facts per topic');
  const red=fs.readFileSync('public/datasets/genai-red-team-prompts.txt','utf8');
  assert.equal((red.match(/^=== Prompt \d ===/gm)||[]).length,3,'three red-team prompts');
  assert.match(fs.readFileSync('public/datasets/prompt-experiment-sheet-A4.csv','utf8'),/^version,prompt,prompt_change,what_changed_in_output,was_it_better_why\nV1 - baseline,,,,\nV2,,,,\nV3,,,,\n$/);
  assert.match(fs.readFileSync('public/datasets/verification-log-A2.csv','utf8'),/^claim,source_checked,supported_uncertain_wrong,what_i_changed\n(,,,\n){3}$/);
  const template=fs.readFileSync('public/datasets/reusable-prompt-template.md','utf8');
  for(const h of ['## Context','## Task','## Constraints','## Format'])assert.ok(template.includes(h),h);
  assert.match(template,/\[unsure\]/);
});

test('dataset archives stay small enough for school connections',()=>{
  for(const [file,size] of Object.entries(manifest))assert.ok(size<1_000_000,`${file} is ${size} bytes`);
});

test('student UI lists downloads with the download attribute',()=>{
  assert.match(app,/href="\/datasets\/\$\{esc\(d\.file\)\}" download/);
  assert.match(app,/function activityHTML\(s\)\{return activityBodyHTML\(s\)\+downloadsHTML\(s\.activity\)\}/);
});
