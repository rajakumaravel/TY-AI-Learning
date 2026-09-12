import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computePilotAnalytics, computeCompletion, computeImprovement, computeDropoff, computeAgreement, computeLabCompletion, computeFeedback, SUPPRESSED_LABEL } from '../lib/pilot-analytics.mjs';

function learner(completed=[],activity={}){ return {completed,activity}; }

test('completion buckets learners by number of fully completed chapters, suppressing small cells',()=>{
  const block1=['b1s1','b1lab','b1s2','b1s3','b1s4'];
  const states=[...Array(5)].map(()=>learner(block1)).concat([...Array(2)].map(()=>learner([])));
  const {buckets}=computeCompletion(states);
  assert.equal(buckets[0].suppressed,true);
  assert.equal(buckets[0].label,SUPPRESSED_LABEL);
  assert.equal(buckets[1].suppressed,false);
  assert.equal(buckets[1].count,5);
});

test('a cohort of four suppresses and a cohort of five does not',()=>{
  const four=computeCompletion([...Array(4)].map(()=>learner([])));
  const five=computeCompletion([...Array(5)].map(()=>learner([])));
  assert.equal(four.buckets[0].suppressed,true);
  assert.equal(five.buckets[0].suppressed,false);
  assert.equal(five.buckets[0].count,5);
});

test('improvement classifies the change between suggested and teacher level',()=>{
  const formative=[...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Getting started',teacherLevel:'Getting there'}))
    .concat([...Array(6)].map((_,i)=>({learnerId:`L${i}-b`,suggestedLevel:'Getting there',teacherLevel:'Getting there'})))
    .concat([...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Going further',teacherLevel:'Getting there'})));
  const {categories}=computeImprovement(formative,[]);
  const byChange=Object.fromEntries(categories.map((c)=>[c.change,c]));
  assert.equal(byChange.improved.count,5);
  assert.equal(byChange.same.count,6);
  assert.equal(byChange.declined.count,5);
});

test('improvement ignores unreviewed assessments and pools formative and chapter assessments',()=>{
  const formative=[...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Getting started',teacherLevel:'Getting there'}));
  const unreviewed=[...Array(9)].map(()=>({suggestedLevel:'Getting started',teacherLevel:null}));
  const chapters=[...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Getting started',teacherLevel:'Getting there'}));
  const {categories}=computeImprovement([...formative,...unreviewed],chapters);
  const improved=categories.find((c)=>c.change==='improved');
  assert.equal(improved.count,10);
});

test('drop-off maps each learner to the chapter of their last completed session',()=>{
  const block1=['b1s1','b1lab','b1s2','b1s3','b1s4'];
  const states=[...Array(5)].map(()=>learner(block1)).concat([...Array(5)].map(()=>learner([])));
  const {chapters}=computeDropoff(states);
  const block1cell=chapters.find((c)=>c.blockId==='block1');
  const noneCell=chapters.find((c)=>c.blockId==='none');
  assert.equal(block1cell.count,5);
  assert.equal(noneCell.count,5);
});

test('agreement matrix has no reviewed_by and covers every level pair',()=>{
  const chapters=[...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Getting there',teacherLevel:'Going further'}));
  const {matrix}=computeAgreement([],chapters);
  assert.equal(matrix.length,9);
  const cell=matrix.find((m)=>m.suggestedLevel==='Getting there'&&m.teacherLevel==='Going further');
  assert.equal(cell.count,5);
  assert.equal(JSON.stringify(matrix).includes('reviewed_by'),false);
  assert.equal(JSON.stringify(matrix).includes('reviewedBy'),false);
});

// The measure is the chapter's Experience Lab stages, not its lab-kind sessions. Chapters 5 and 7 have six stages
// and no lab-kind session at all, so measuring by kind dropped them and let a part-done Chapter 1 count as complete.
test('Experience Lab completion requires every stage of the chapter lab, in all eight chapters',async()=>{
  const { COURSE_SHAPE }=await import('../lib/course-shape.mjs');
  const stages=(id)=>COURSE_SHAPE.blocks.find((b)=>b.id===id).labStageSessionIds;
  const done=[...Array(5)].map(()=>learner(stages('block1')));
  const partial=[...Array(5)].map(()=>learner(['b1lab']));
  const {chapters}=computeLabCompletion([...done,...partial]);
  assert.equal(chapters.length,8,'every chapter has an Experience Lab');
  assert.equal(chapters.find((c)=>c.blockId==='block1').count,5,'only the learners who finished every stage count');
  for(const id of ['block5','block7'])assert.ok(chapters.some((c)=>c.blockId===id),`${id} has lab stages and must appear`);
});

test('qualitative feedback drops text with a likely name or number and is unattributed',()=>{
  const states=[...Array(5)].map(()=>learner([],{b8s8:{'8':'This programme changed how I think about evidence before I trust it'}}));
  const {quotes,suppressed}=computeFeedback(states);
  assert.equal(suppressed,false);
  assert.equal(quotes.length,5);
  const withName=[...Array(5)].map(()=>learner([],{b8s8:{'8':'My teacher Sarah helped me a lot with this project'}}));
  const filtered=computeFeedback(withName);
  assert.equal(filtered.suppressed,true);
  assert.equal(filtered.quotes.length,0);
});

test('feedback suppresses below five contributing learners',()=>{
  const four=[...Array(4)].map(()=>learner([],{b8s8:{'8':'I learned to check evidence before trusting an answer'}}));
  const {suppressed,quotes}=computeFeedback(four);
  assert.equal(suppressed,true);
  assert.equal(quotes.length,0);
});

test('no analytics output carries a learner id, display name or reviewed_by',()=>{
  const analytics=computePilotAnalytics({
    learnerStates:[...Array(5)].map((_,i)=>learner(['b1s1'],{b8s8:{'8':'I now double-check claims before I share them'}})),
    formativeAssessments:[...Array(5)].map((_,i)=>({learnerId:`L${i}-a`,suggestedLevel:'Getting started',teacherLevel:'Getting there'})),
    chapterAssessments:[]
  });
  const serialised=JSON.stringify(analytics);
  assert.equal(/displayName|display_name/i.test(serialised),false);
  assert.equal(/reviewed_by|reviewedBy/i.test(serialised),false);
  assert.equal(/learnerId|learner_id|user_id|userId/i.test(serialised),false);
});

test('deleting a learner changes the aggregate and leaves nothing behind',()=>{
  const before=computeCompletion([...Array(5)].map(()=>learner([])));
  const after=computeCompletion([...Array(4)].map(()=>learner([])));
  assert.equal(before.buckets[0].suppressed,false);
  assert.equal(before.buckets[0].count,5);
  assert.equal(after.buckets[0].suppressed,true);
});

test('computePilotAnalytics carries the suppression note once, at the top',()=>{
  const analytics=computePilotAnalytics({});
  assert.match(analytics.note,/fewer than five/i);
});

// course-shape.mjs is hand-maintained because neither JSON import form works in both Node and the Workers bundler.
// This test is what keeps it honest.
test('the server course shape matches curriculum.json',async()=>{
  const { COURSE_SHAPE }=await import('../lib/course-shape.mjs');
  const course=JSON.parse(readFileSync(new URL('../curriculum.json',import.meta.url),'utf8'));
  assert.deepEqual(COURSE_SHAPE.blocks.map(b=>b.id),course.blocks.map(b=>b.id));
  for(const block of course.blocks){
    const shape=COURSE_SHAPE.blocks.find(b=>b.id===block.id);
    assert.deepEqual(shape.sessionIds,block.sessions.map(s=>s.id),`${block.id} sessions`);
    assert.deepEqual(shape.labSessionIds,block.sessions.filter(s=>s.activity?.kind==='lab').map(s=>s.id),`${block.id} lab sessions`);
    assert.deepEqual(shape.labStageSessionIds,[...new Set((block.lab?.stages||[]).map(x=>x[1]))],`${block.id} lab stage sessions`);
  }
});
