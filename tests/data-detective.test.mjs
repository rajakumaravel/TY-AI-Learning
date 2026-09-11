import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Files owned by other Phase 4 agents are read lazily so a missing file fails only its own case.
const read=p=>fs.readFileSync(p,'utf8');
const course=()=>JSON.parse(read('curriculum.json'));
const block3=()=>{const b=course().blocks.find(b=>b.id==='block3');assert.ok(b,'curriculum.json has block3');return b};
const session=id=>{const s=block3().sessions.find(s=>s.id===id);assert.ok(s,`block3 has ${id}`);return s};
const CSV='public/datasets/club-signups-flawed.csv';
const COLUMNS=['student_id','first_name','surname','date_of_birth','year_group','gender','home_eircode','interests','club_choice','signup_date','attendance_pct','parent_phone','inferred_income_band','notes'];
const ISSUE_TYPES=['Missing value','Inconsistent format','Duplicate','Sensitive or unnecessary field','Imbalance or bias','Suspicious value'];

// Minimal RFC-4180 style parser: quoted fields, escaped quotes, CRLF/LF.
function parseCSV(text){const t=String(text).replace(/^﻿/,'');const rows=[];let row=[],field='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){field+='"';i++}else q=false}else field+=c}else if(c==='"')q=true;else if(c===','){row.push(field);field=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field);rows.push(row)}const [columns=[],...body]=rows;return {columns,rows:body.filter(r=>!(r.length===1&&r[0]===''))}}
const dataset=()=>{const d=parseCSV(read(CSV));const col=n=>d.rows.map(r=>String(r[d.columns.indexOf(n)]??'').trim());return {...d,col}};

test('block3 chapter shape follows the Phase 4 contract',()=>{
  const b=block3();
  assert.equal(b.number,'03');
  assert.equal(b.title,'Data Detective');
  assert.equal(b.badge,'Data Detective');
  assert.equal(b.duration,'3 hours');
  assert.deepEqual(b.outcomes,['LO2','LO5']);
  assert.match(b.mission,/flawed dataset/i);
  assert.match(b.mission,/Responsible Data Card/);
  assert.deepEqual(b.sessions.map(s=>s.id),['b3s1','b3s2','b3s3','b3s4','b3s5']);
  assert.deepEqual(b.sessions.map(s=>s.minutes),[25,35,45,35,40]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),180);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['quiz','lab','dataset','textfields','textfields']);
  assert.equal(b.lab.title,'Fix a bad dataset');
  assert.deepEqual(b.lab.stages.map(x=>[x[0],x[1]]),[['DO','b3s2'],['TEST','b3s3'],['MAKE','b3s4'],['BREAK','b3s3'],['IMPROVE','b3s4'],['PROVE','b3s5']]);
  for(const s of b.sessions){
    assert.match(s.pageRef,/Draft · pending Student Book alignment/,`${s.id} pageRef`);
    assert.ok(s.intro&&s.reflection&&s.activity?.title&&s.activity?.instructions,`${s.id} text`);
    assert.ok(s.study?.title&&s.study.body.length===3&&s.study.example&&s.study.keywords.length>=3,`${s.id} study`);
  }
});

test('block3 sessions carry the contracted activities',()=>{
  const quiz=session('b3s1').activity;
  assert.equal(quiz.items.length,8);
  assert.deepEqual(quiz.options,['Volunteered','Observed','Inferred']);
  const lab=session('b3s2').activity;
  assert.deepEqual(lab.tool,{name:'the raw CSV file',url:'/datasets/club-signups-flawed.csv',free:true});
  assert.equal(lab.file,'club-signups-flawed.csv','b3s2 shows the built-in viewer inline');
  assert.equal(lab.privacy.length,4);
  assert.equal(lab.steps.length,5);
  assert.equal(lab.fields.length,4);
  assert.ok(lab.fallback?.title&&lab.fallback.steps.length>=3);
  assert.ok(lab.downloads.some(d=>d.file==='club-signups-flawed.csv'));
  assert.ok(lab.downloads.some(d=>d.file==='responsible-data-card-template.md'));
  const ds=session('b3s3').activity;
  assert.equal(ds.title,'Data audit table');
  assert.equal(ds.file,'club-signups-flawed.csv');
  assert.deepEqual(ds.issueTypes,ISSUE_TYPES);
  assert.equal(ds.minFindings,5);
  assert.ok(ds.downloads.some(d=>d.file==='club-signups-flawed.csv'));
  assert.equal(session('b3s4').activity.fields.length,4);
  const card=session('b3s5').activity.fields;
  assert.equal(card.length,6);
  for(const re of [/purpose/i,/collected/i,/volunteered.*observed.*inferred/i,/harm/i,/removed|fixed/i,/must not/i])assert.ok(card.some(f=>re.test(f)),`data card field ${re}`);
});

test('flawed CSV has the documented columns, rows and missing values',()=>{
  const d=dataset();
  assert.deepEqual(d.columns,COLUMNS);
  assert.ok(d.rows.length>=120,`rows ${d.rows.length}`);
  for(const r of d.rows)assert.equal(r.length,COLUMNS.length,'ragged row');
  assert.equal(d.col('club_choice').filter(v=>!v).length,9);
  assert.equal(d.col('year_group').filter(v=>!v).length,6);
  assert.equal(d.col('interests').filter(v=>!v).length,3);
});

test('flawed CSV has inconsistent formats, duplicates and suspicious values',()=>{
  const d=dataset();
  const dates=d.col('signup_date');
  assert.ok(dates.some(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)),'ISO dates');
  assert.ok(dates.some(v=>/^\d{2}\/\d{2}\/\d{4}$/.test(v)),'slash dates');
  assert.ok(dates.some(v=>/^\d{1,2} [A-Za-z]{3,4} \d{4}$/.test(v)),'written dates');
  const years=new Set(d.col('year_group'));
  for(const v of ['TY','4','Transition Year','ty'])assert.ok(years.has(v),`year_group ${v}`);
  const lines=d.rows.map(r=>r.join(''));
  const seen=new Set();let exact=0;for(const l of lines){if(seen.has(l))exact++;seen.add(l)}
  assert.equal(exact,4,'exact duplicate rows');
  const lower=new Set();let near=0;for(const r of d.rows){const k=r.slice(1).join('\u0001').toLowerCase();if(lower.has(k))near++;lower.add(k)}
  assert.equal(near-exact,2,'near-duplicate rows (case differences)');
  const att=new Set(d.col('attendance_pct'));
  for(const v of ['104','-5','n/a'])assert.ok(att.has(v),`attendance_pct ${v}`);
});

test('flawed CSV is imbalanced and carries sensitive or inferred fields',()=>{
  const d=dataset();
  const club=d.col('club_choice'),gender=d.col('gender'),year=d.col('year_group');
  const coding=gender.filter((_,i)=>club[i]==='Coding');
  assert.ok(coding.length>=8,'coding rows');
  const counts={};for(const g of coding)counts[g]=(counts[g]||0)+1;
  assert.ok(Math.max(...Object.values(counts))/coding.length>=0.8,'gender imbalance in Coding');
  const yc={};for(const y of year.filter(Boolean))yc[y]=(yc[y]||0)+1;
  assert.ok(Object.keys(yc).length>=2,'year-group imbalance is visible');
  for(const c of ['home_eircode','parent_phone','date_of_birth','inferred_income_band','notes'])assert.ok(d.col(c).some(Boolean),`${c} populated`);
  for(const v of d.col('home_eircode').filter(Boolean))assert.match(v,/^[A-Z]\d{2} [A-Z]{2}\d{2}$/,`synthetic Eircode ${v}`);
  const readme=read('docs/teacher/club-signups-flawed.KEY.txt');
  for(const re of [/missing/i,/format/i,/duplicate/i,/attendance/i,/imbalance|bias/i,/eircode|phone|income|notes/i])assert.match(readme,re);
  const template=parseCSV(read('public/datasets/club-signups-cleaned-template.csv'));
  assert.deepEqual(template.columns,COLUMNS.filter(c=>!['home_eircode','parent_phone','date_of_birth','inferred_income_band','notes'].includes(c)));
  assert.ok(template.rows.every(r=>Object.values(r).every(v=>!String(v||'').trim())),'template rows are blank');
  const card=read('public/datasets/responsible-data-card-template.md');
  assert.ok((card.match(/^#+ /gm)||[]).length>=6,'six card headings');
});

test('student UI renders the dataset activity and enforces the findings rule',()=>{
  const app=read('app.js');
  assert.match(app,/const DATASETS=new Map\(\)/);
  assert.match(app,/function parseCSV\(text\)/);
  assert.match(app,/fetch\(`\/datasets\/\$\{file\}`\)/);
  assert.match(app,/if\(a\.kind==='dataset'\)return `<div class="dataset" data-dataset=/);
  assert.match(app,/function datasetHTML\(s,d,readOnly=false\)\{const a=s\.activity,rows=d\.rows;/);
  assert.match(app,/class="dataset-wrap"/);
  assert.match(app,/data-target="column:/);
  assert.match(app,/data-target="row:/);
  assert.match(app,/data-finding-form/);
  assert.match(app,/findings:\[\.\.\.\(cur\.findings\|\|\[\]\),\{target:tgt\.value,issue:iss\.value,note:text\}\]/);
  assert.match(app,/if\(a\.kind==='dataset'\)\{const f=\(Array\.isArray\(v\.findings\)\?v\.findings:\[\]\)\.filter\(x=>String\(x\?\.note\|\|''\)\.trim\(\)\.length>=12\);return f\.length>=\(a\.minFindings\|\|5\)&&new Set\(f\.map\(x=>x\.issue\)\)\.size>=3\}/);
  assert.match(app,/if\(ds\)wireDataset\(s,ds\)/);
  assert.match(read('styles.css'),/\.dataset-wrap\{overflow-x:auto/);
  const admin=read('admin.js');
  assert.match(admin,/activity\.kind === "dataset"/);
  assert.match(admin,/`Finding \$\{Number\(key\)\+1\}`/);
});

test('project workspace is generalised across unlocked projects',()=>{
  const ws=read('project-workspace.js');
  assert.match(ws,/function projectUnlocked\(/);
  assert.doesNotMatch(ws,/function chapter2Unlocked/);
  assert.doesNotMatch(ws,/req\('block2'/);
  assert.match(ws,/function labEvidenceItems\(state=\{\},blockId/);
  assert.match(ws,/dataset/);
  assert.match(ws,/CHAPTER \$\{/);
});

test('server requires the five Chapter 3 sessions before the capstone',()=>{
  const fn=read('functions/api/[[path]].js');
  assert.ok(fn.includes("block3:['b3s1','b3s2','b3s3','b3s4','b3s5']"));
  assert.match(fn,/const blockOrder=Object\.keys\(requiredSessions\)/);
});

test('block3 capstone and project brief follow the contract',()=>{
  const cap=CAPSTONES.block3;
  assert.equal(cap.id,'block3-capstone');
  assert.equal(cap.title,'Data Card review');
  assert.match(cap.brief,/library/i);
  assert.match(cap.brief,/search/i);
  assert.match(cap.brief,/reading.?level.*inferred|inferred.*reading.?level/is);
  assert.equal(cap.prompts.length,3);
  const brief=PROJECT_BRIEFS.block3;
  assert.equal(brief.id,'block3');
  assert.equal(brief.chapter,'Data Detective');
  assert.equal(brief.title,'Dataset Clean-up Investigation');
  assert.equal(brief.role,'Junior Data Analyst');
  assert.equal(brief.client,'School Activities Office');
  assert.ok(brief.objective.length>40);
  assert.equal(brief.acceptanceCriteria.length,6);
  assert.deepEqual(brief.deliverables.map(d=>d.toLowerCase()),['audit findings','cleaning plan','cleaned or annotated dataset','imbalance note','responsible data card','final recommendation']);
  assert.ok(brief.prompts.recommendation.length>40);
});

test('capstone scoring recognises data-detective vocabulary',()=>{
  const src=read('lib/chapter-capstone.mjs');
  for(const w of ['missing','duplicate','inconsistent','imbalance','sensitive','inferred','volunteered','observed'])assert.match(src,new RegExp(`hasConcept=.*\\|${w}\\|?`),`concept keyword ${w}`);
  for(const w of ['remove','collect','consent','anonymise'])assert.match(src,new RegExp(`hasAction=.*\\|${w}\\|?`),`action keyword ${w}`);
  const r=assessChapterCapstone({blockId:'block3',answers:{0:'The inferred column is sensitive and should be removed because nobody gave consent for it.'}});
  assert.equal(r.criteria.understanding>=1,true);
  assert.equal(r.criteria.reasoning,2);
});
