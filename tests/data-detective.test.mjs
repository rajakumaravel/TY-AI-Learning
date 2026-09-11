import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Phase 4b: Chapter 3 realigned to Student Book pp. 14–17 (docs/product/phase-4b-contract.md).
// Files owned by other Phase 4b agents are read lazily so a missing or stale file fails only its own case.
const read=p=>fs.readFileSync(p,'utf8');
const course=()=>JSON.parse(read('curriculum.json'));
const block3=()=>{const b=course().blocks.find(b=>b.id==='block3');assert.ok(b,'curriculum.json has block3');return b};
const session=id=>{const s=block3().sessions.find(s=>s.id===id);assert.ok(s,`block3 has ${id}`);return s};
// Book quotations are compared with straight quotes and single spaces so PDF line breaks and curly punctuation do not matter.
const norm=s=>String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
const SESSION_IDS=['b3s1','b3s2','b3s3','b3s4','b3s5','b3s6'];
const KEY_WORDS=['personal data','volunteered data','observed data','inferred data','cookies','tracking','web scraping','public / private data','data minimisation','consent','GDPR','EU AI Act','representativeness'];
const ISSUE_TYPES=['Missing value','Inconsistent format','Duplicate','Sensitive or unnecessary field','Inferred, not collected','Who is missing (representation)','Suspicious value'];
const A5=['What data is collected?','What is observed rather than typed?','What might be inferred?','Why is it needed?','What could go wrong?','Who might be missing or misrepresented?','What should be removed or minimised?','What needs human review?'];
const ROUTE=['Data trail warm-up','Data Tracking Sherlock','Why collect it?','Cookie and scraping mini-lab','Dataset fairness challenge','Discover: your rights and the safeguards','Design a better data plan','Reflection'];

test('block3 chapter shape follows the Student Book',()=>{
  const b=block3();
  assert.equal(b.number,'03');
  assert.equal(b.title,'Data Detective');
  assert.equal(b.badge,'Data Detective');
  assert.equal(b.duration,'3 hours');
  assert.deepEqual(b.outcomes,['LO5','LO6','LO9']);
  assert.equal(norm(b.mission),'Audit one digital service at category level, then design a Responsible Data Card for it: what is collected, why, what is inferred, the risks, what controls users have, and what should not be collected at all.');
  assert.equal(norm(b.final),'Your data category audit of one service, your Responsible Data Card (Sheet A5), your dataset fairness redesign: before and after, and your reflection.');
  assert.deepEqual(b.route.map(r=>norm(r[1])),ROUTE,'eight timed segments with the book labels');
  assert.deepEqual(b.sessions.map(s=>s.id),SESSION_IDS);
  assert.deepEqual(b.sessions.map(s=>s.minutes),[15,25,25,45,25,45]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),180);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['quiz','lab','chain','dataset','textfields','textfields']);
  assert.equal(b.lab.title,'Fix a bad dataset');
  assert.deepEqual(b.lab.stages.map(x=>[x[0],x[1]]),[['DO','b3s2'],['TEST','b3s3'],['MAKE','b3s6'],['BREAK','b3s4'],['IMPROVE','b3s6'],['PROVE','b3s6']]);
  for(const s of b.sessions){
    assert.equal(s.pageRef,'Student Book pp. 14–17',`${s.id} pageRef`);
    assert.ok(s.intro&&s.reflection&&s.activity?.title&&s.activity?.instructions,`${s.id} text`);
    assert.ok(s.study?.title&&s.study.body.length===3&&s.study.example&&s.study.keywords.length>=1,`${s.id} study`);
  }
  assert.equal(norm(session('b3s6').reflection),'Just because data is available, does that mean it should be used? Take a position and back it with one concrete example from today.');
});

test('every Student Book key word appears in the chapter study keywords',()=>{
  const all=block3().sessions.flatMap(s=>s.study.keywords).map(k=>norm(k).toLowerCase());
  for(const w of KEY_WORDS)assert.ok(all.some(k=>k.includes(w.toLowerCase())),`key word "${w}"`);
});

test('block3 carries the book myth-busters, self-check and level-up',()=>{
  const b=block3();
  assert.equal(b.myths.length,3);
  for(const m of b.myths)assert.ok(Array.isArray(m)&&m.length===2&&m[0]&&m[1],'myth pair');
  assert.deepEqual(b.myths.map(m=>norm(m[0])),['If data is public, any use of it is ethical.','Anonymous data can never cause harm.','Consent makes any data use OK.']);
  assert.equal(norm(b.myths[0][1]),"Public means visible. It doesn't mean the person agreed to every possible reuse. Context matters.");
  assert.equal(norm(b.myths[1][1]),'Combine a few "anonymous" facts (postcode, age, school) and you can often identify a person. And group-level data can still be used unfairly against a whole group.');
  assert.equal(norm(b.myths[2][1]),"Consent buried in 40 pages nobody reads isn't real consent. And even genuine consent doesn't make a harmful or unfair use acceptable.");
  assert.deepEqual(Object.keys(b.selfCheck),['Getting started','Getting there','Going further']);
  assert.deepEqual(b.selfCheck['Getting started'].map(norm),['I can name categories of data a service collects']);
  assert.deepEqual(b.selfCheck['Getting there'].map(norm),['I can tell collected data from inferred data','I can explain purpose, risk and minimisation for my service']);
  assert.deepEqual(b.selfCheck['Going further'].map(norm),["I can evaluate who's represented and propose safeguards","I can justify why some available data shouldn't be used"]);
  assert.equal(norm(b.levelUp),"Compare two services that do a similar job. Using only publicly available information, explain which one appears to take the more data-minimising approach, and what evidence you're relying on.");
  for(const other of course().blocks.filter(x=>x.id!=='block3'))assert.ok(!other.myths&&!other.selfCheck&&!other.levelUp,`${other.id} unchanged in Phase 4b`);
});

test('block3 sessions carry the contracted activities',()=>{
  const quiz=session('b3s1').activity;
  assert.equal(quiz.items.length,8);
  assert.deepEqual(quiz.options,['Volunteered','Observed','Inferred']);
  assert.deepEqual([...new Set(quiz.items.map(i=>i[1]))].sort(),['Inferred','Observed','Volunteered'],'all three piles are used');
  const lab=session('b3s2').activity;
  assert.deepEqual(lab.tool,{name:"your chosen service's privacy policy or app-store listing",url:'https://www.google.com/search?q=privacy+policy',free:true});
  assert.equal(lab.privacy.length,4);
  assert.match(norm(lab.privacy[0]),/^Investigate at category level only/);
  assert.match(norm(lab.privacy[0]),/Never open, screenshot or share your own account data, and never anyone else's\. The point is the pattern, not your private life\./);
  assert.equal(lab.steps.length,5);
  assert.equal(lab.fields.length,4);
  assert.ok(lab.fallback?.title&&lab.fallback.steps.length>=1);
  assert.ok(lab.downloads.some(d=>d.file==='privacy-policy-extracts.txt'),'sample policy extracts');
  const chain=session('b3s3').activity;
  assert.deepEqual(chain,{kind:'chain',title:'Why collect it?',instructions:'For five data categories you found, complete the chain. Be fair: some collection is genuinely useful. Some isn\'t.',columns:[['category','Data category'],['purpose','Purpose'],['benefit','User benefit'],['risk','Possible risk']],rows:5,minRows:5,head:'COLLECTION → PURPOSE → USER BENEFIT → POSSIBLE RISK'});
  const ds=session('b3s4').activity;
  assert.equal(ds.file,'club-signups-flawed.csv');
  assert.deepEqual(ds.issueTypes,ISSUE_TYPES);
  assert.equal(ds.minFindings,6);
  assert.deepEqual(ds.requiredIssues,['Who is missing (representation)']);
  assert.ok(ds.downloads.some(d=>d.file==='club-signups-flawed.csv'));
  assert.ok(ds.downloads.some(d=>d.file==='fairness-scenario-cards.txt'));
  const rights=session('b3s5').activity.fields;
  assert.equal(rights.length,4);
  for(const re of [/clear purpose/i,/minimisation/i,/see it, correct it, delete it/i,/EU AI Act/])assert.ok(rights.some(f=>re.test(f)),`rights field ${re}`);
  const plan=session('b3s6').activity;
  assert.equal(plan.fields.length,9);
  assert.deepEqual(plan.fields.slice(0,8).map(norm),A5,'Sheet A5 questions verbatim, in order');
  assert.match(plan.fields[8],/before → after/);
  for(const re of [/fields removed/i,/representation check/i,/how long data is kept/i,/human/i])assert.match(plan.fields[8],re);
  assert.ok(plan.downloads.some(d=>d.file==='responsible-data-card-template.md'));
  assert.ok(plan.downloads.some(d=>d.file==='club-signups-cleaned-template.csv'));
});

test('student UI renders the chain activity and enforces its ready rule',()=>{
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='chain'\)\{const cols=a\.columns\|\|\[\];return `<div class="chain"/);
  assert.match(app,/cols\.map\(\(\[k,l\]\)=>`<input data-i="\$\{i\}" data-f="\$\{esc\(k\)\}" placeholder="\$\{esc\(l\)\}"/);
  assert.match(app,/esc\(a\.head\|\|cols\.map\(c=>c\[1\]\)\.join\(' → '\)\)/);
  assert.match(app,/if\(a\.kind==='chain'\)\{const keys=\(a\.columns\|\|\[\]\)\.map\(c=>c\[0\]\);const full=Object\.values\(v\)\.filter\(x=>x&&keys\.every\(k=>String\(x\[k\]\|\|''\)\.trim\(\)\)\);return full\.length>=\(a\.minRows\|\|a\.rows\|\|1\)\}/);
  assert.match(app,/if\(a\.kind==='daymap'\)return `<div class="daymap">/,'daymap untouched');
  assert.match(app,/if\(x\.dataset\.f\)\{const i=x\.dataset\.i;a\[i\]=a\[i\]\|\|\{\};a\[i\]\[x\.dataset\.f\]=x\.value\}/,'data-i/data-f inputs store state.activity[sid][row][key]');
  const css=read('styles.css');
  assert.match(css,/\.chainrow\{display:grid;grid-template-columns:repeat\(var\(--chain-cols,4\)/);
  assert.match(css,/@media\(max-width:620px\)\{\.chainrow\{grid-template-columns:1fr\}\}/,'chain stacks to one column on phones');
  const admin=read('admin.js');
  assert.match(admin,/activity\.kind === "chain"\) return `Chain row \$\{Number\(key\)\+1\}`/);
});

test('dataset ready rule enforces requiredIssues generically',()=>{
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='dataset'\)\{const f=\(Array\.isArray\(v\.findings\)\?v\.findings:\[\]\)\.filter\(x=>String\(x\?\.note\|\|''\)\.trim\(\)\.length>=12\);return f\.length>=\(a\.minFindings\|\|5\)&&new Set\(f\.map\(x=>x\.issue\)\)\.size>=3&&\(Array\.isArray\(a\.requiredIssues\)\?a\.requiredIssues:\[\]\)\.every\(t=>f\.some\(x=>x\.issue===t\)\)\}/);
  assert.match(app,/id="datasetTarget"/);assert.match(app,/id="datasetIssue"/);assert.match(app,/id="datasetNote"/);assert.match(app,/id="datasetAdd"/);assert.match(app,/class="findings dataset-findings"/);
  assert.match(app,/including at least one "\$\{esc\(a\.requiredIssues\.join/,'findings hint names the required issue');
});

test('chapter page renders myth-busters, self-check and level-up for blocks that have them',()=>{
  const app=read('app.js'),html=read('index.html'),css=read('styles.css');
  assert.match(html,/<div id="labBanner" class="lab-banner"><\/div>\s*<div id="mythBusters" class="myth-busters"><\/div>/,'myths container follows the lab banner');
  assert.match(app,/function renderMyths\(\)\{const el=document\.getElementById\('mythBusters'\),myths=activeBlock\?\.myths;if\(!el\)return;if\(!Array\.isArray\(myths\)\|\|!myths\.length\)\{el\.innerHTML='';return\}/);
  assert.match(app,/<b>People say<\/b><b>Actually<\/b>/);
  assert.match(app,/renderLabBanner\(\);renderMyths\(\);renderSessionNav\(\)/);
  assert.match(app,/function selfCheckHTML\(b\)\{const sc=b\?\.selfCheck;if\(!sc\|\|typeof sc!=='object'\|\|!Object\.keys\(sc\)\.length\)return '';return `<div class="self-check"><strong>How am I doing\?<\/strong>/);
  assert.match(app,/function levelUpHTML\(b\)\{return b\?\.levelUp\?`<p class="level-up"><b>Level up · optional challenge<\/b>/);
  assert.match(app,/\$\{selfCheckHTML\(activeBlock\)\}\$\{levelUpHTML\(activeBlock\)\}\$\{labEvidenceHTML\(activeBlock\)\}\$\{cap\.prompts\.map\(/,'self-check and level-up render before the capstone prompts');
  for(const sel of ['.myth-busters:empty{display:none}','.self-check{','.level-up{'])assert.ok(css.includes(sel),`css ${sel}`);
});

test('server requires the six Chapter 3 sessions before the capstone',()=>{
  const fn=read('functions/api/[[path]].js');
  assert.ok(fn.includes("block3:['b3s1','b3s2','b3s3','b3s4','b3s5','b3s6']"));
  assert.match(fn,/const blockOrder=Object\.keys\(requiredSessions\)/);
});

test('block3 capstone and project brief follow the contract',()=>{
  const cap=CAPSTONES.block3;
  assert.equal(cap.id,'block3-capstone');
  assert.equal(cap.title,'Responsible Data Card review');
  assert.match(cap.brief,/homework-help app/);
  assert.match(cap.brief,/every question/);
  assert.match(cap.brief,/infer.*ability band/is);
  assert.equal(cap.prompts.length,3);
  assert.match(cap.prompts[0],/collect.*observe.*infer/is);
  assert.match(cap.prompts[1],/missing or misrepresented.*go wrong/is);
  assert.match(cap.prompts[2],/not be collected at all.*human review.*public.*consented/is);
  const brief=PROJECT_BRIEFS.block3;
  assert.equal(brief.id,'block3');
  assert.equal(brief.chapter,'Data Detective');
  assert.equal(brief.title,'Responsible Data Investigation');
  assert.equal(brief.role,'Junior Data Analyst');
  assert.equal(brief.client,'School Activities Office');
  assert.match(brief.objective,/^Audit one digital service at category level, then design a Responsible Data Card for it/);
  assert.equal(brief.acceptanceCriteria.length,6);
  for(const re of [/categories of data/i,/inferred data.*minimisation/i,/represented.*safeguards/i,/should not be used/i,/before and after/i,/Sheet A5/])assert.ok(brief.acceptanceCriteria.some(c=>re.test(c)),`criterion ${re}`);
  assert.deepEqual(brief.deliverables,['Data category audit','Collection → purpose → benefit → risk chains','Dataset fairness findings','Better data plan: before and after','Responsible Data Card (Sheet A5)','Final recommendation']);
  assert.ok(brief.prompts.recommendation.length>40);
});

test('capstone scoring recognises the block3 vocabulary only for block3',()=>{
  const src=read('lib/chapter-capstone.mjs');
  for(const w of ['gdpr','consent','minimis','retention','cookie','tracking','scraping','represent','purpose','public'])assert.match(src,new RegExp(`hasConcept=.*blockId==='block3'.*\\|${w}`),`block3 concept keyword ${w}`);
  for(const w of ['inferred','volunteered','observed'])assert.match(src,new RegExp(`hasConcept=.*\\|${w}\\b`),`concept keyword ${w}`);
  const text='GDPR, consent, minimisation, retention, cookies, tracking, scraping and representativeness all matter for the purpose of public information.';
  assert.equal(assessChapterCapstone({blockId:'block3',answers:{0:text}}).criteria.understanding,1);
  assert.equal(assessChapterCapstone({blockId:'block2',answers:{0:text}}).criteria.understanding,0);
  assert.equal(assessChapterCapstone({blockId:'block1',answers:{0:text}}).criteria.understanding,0);
  const r=assessChapterCapstone({blockId:'block3',answers:{0:'The inferred ability band goes beyond the purpose, so it should be removed and the retention shortened because nobody gave real consent for it.'}});
  assert.equal(r.criteria.understanding,1);
  assert.equal(r.criteria.reasoning,2);
  assert.equal(r.criteria.evidence,1);
});
