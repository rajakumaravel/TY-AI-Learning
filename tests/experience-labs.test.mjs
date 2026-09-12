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
    if(b.id==='block5'||b.id==='block7')assert.ok(!b.sessions.some(s=>s.activity.kind==='lab'||s.activity.tool),`${b.id} opens no external tool, so it has no lab-kind session (Phase 6 and Phase 8 contracts)`);
    else assert.ok(b.sessions.some(s=>s.activity.kind==='lab'),`${b.id} has a lab session`);
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
  assert.match(lab.activity.tool.name,/data safety page/);
  assert.match(lab.activity.privacy[0],/^Investigate at category level only\./);
  assert.equal(lab.activity.fallback.title,'No policy to hand?');
  assert.ok(lab.activity.downloads.some(d=>d.file==='privacy-policy-extracts.txt'));
  assert.deepEqual(b.lab.stages.map(x=>x[1]),['b3s2','b3s3','b3s6','b3s4','b3s6','b3s6']);
});

test('chapter 4 lab runs the weak question through DuckDuckGo AI Chat with the four safety notes, the Copilot and sample-output fallback, and the sample downloads',()=>{
  const b=course.blocks[3];
  const lab=b.sessions.find(s=>s.id==='b4s1');
  assert.equal(lab.activity.kind,'lab');
  assert.deepEqual(lab.activity.tool,{name:'DuckDuckGo AI Chat',url:'https://duck.ai',free:true});
  assert.deepEqual(lab.activity.privacy,[
    'Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them.',
    'No accounts. DuckDuckGo AI Chat works without signing in; if a tool asks you to sign in, stop and use the fallback.',
    'The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked in the verification log.',
    'Nothing typed into this portal is sent to the AI tool; copy your prompt across yourself and paste short extracts of the output back here.'
  ]);
  assert.equal(lab.activity.steps.length,5);
  assert.equal(lab.activity.fallback.title,'Tool blocked?');
  assert.match(lab.activity.fallback.steps.join(' '),/copilot\.microsoft\.com/);
  assert.match(lab.activity.fallback.steps.join(' '),/sample outputs/);
  assert.equal(lab.activity.fields.length,4);
  assert.deepEqual(lab.activity.downloads.map(d=>d.file),['genai-weak-question-card.txt','genai-sample-outputs.txt']);
  assert.equal(b.lab.title,'Make prompts compete');
  assert.deepEqual(b.lab.stages.map(x=>x[1]),['b4s3','b4s1','b4s8','b4s7','b4s4','b4s6']);
  for(const id of ['b4s3','b4s4','b4s5','b4s6','b4s7','b4s8'])assert.ok(Array.isArray(b.sessions.find(s=>s.id===id).activity.privacy)&&b.sessions.find(s=>s.id===id).activity.privacy.length===4&&b.sessions.find(s=>s.id===id).activity.tool?.url==='https://duck.ai',`${id} repeats the safety rules`);
});

test('chapter 5 lab is the in-product create-detect-reduce-bias sequence with no AI tool and no safety notes',()=>{
  const b=course.blocks[4];
  assert.equal(b.lab.title,'Create, detect and reduce bias');
  assert.match(b.lab.summary,/less exciting and more trustworthy/);
  assert.deepEqual(b.lab.stages,[['DO','b5s3','Mark up an AI news article'],['TEST','b5s1','The confidence trap'],['MAKE','b5s5','Create a biased outcome in the simulator'],['BREAK','b5s6','Find where bias enters at four stations'],['IMPROVE','b5s7','Publish a corrected version'],['PROVE','b5s4','Verify claims laterally']]);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['chain','quiz','annotate','chain','simulator','chain','textfields','textfields','textfields']);
  for(const s of b.sessions){assert.equal(s.activity.tool,undefined,`${s.id} has no tool`);assert.equal(s.activity.privacy,undefined,`${s.id} has no safety notes`);assert.doesNotMatch(JSON.stringify(s),/duck\.ai|copilot/i,`${s.id} links no AI product`)}
  assert.match(b.sessions.find(s=>s.id==='b5s4').activity.instructions,/open a new tab/i);
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

test('chapter 7 lab is the in-product AI Adoption Decision Simulator with no AI tool and no safety notes',()=>{
  const b=course.blocks[6];
  assert.equal(b.lab.title,'AI Adoption Decision Simulator');
  assert.match(b.lab.summary,/three possible futures/);
  assert.deepEqual(b.lab.stages,[['DO','b7s3','Map the tasks before choosing AI'],['TEST','b7s1','Separate observation from prediction'],['MAKE','b7s4','Build three futures through branching choices'],['BREAK','b7s5','Challenge each future through five stakeholders'],['IMPROVE','b7s6','Defend and revise a governance choice'],['PROVE','b7s8','Justify the final recommendation']]);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['chain','quiz','chain','decision','chain','textfields','textfields','textfields']);
  for(const s of b.sessions){assert.equal(s.activity.tool,undefined,`${s.id} has no tool`);assert.equal(s.activity.privacy,undefined,`${s.id} has no safety notes`);assert.equal(s.activity.fallback,undefined,`${s.id} needs no fallback`);assert.doesNotMatch(JSON.stringify(s),/duck\.ai|copilot|teachablemachine/i,`${s.id} links no AI product`)}
  const d=b.sessions.find(s=>s.id==='b7s4').activity;
  assert.equal(d.kind,'decision');
  assert.equal(d.scenario.id,'harbour-retail');
  assert.equal(d.scenario.role,'AI Adoption Adviser');
  assert.equal(d.start,'start');
  assert.equal(d.minRuns,3);
  assert.deepEqual(d.requiredStarts,['none']);
  assert.deepEqual(d.metricKeys,['humanHours','costEUR','automated','assisted','wrongA','wrongB','retentionDays','energyUnits']);
  assert.deepEqual(d.futureLabels.map(f=>f[0]),['optimistic','concerning','balanced']);
  assert.equal(d.evidence.length,8);
  assert.equal(d.nodes.length,13);
  const node=id=>d.nodes.find(n=>n.id===id);
  const ids=new Set(d.nodes.map(n=>n.id));
  assert.equal(ids.size,13,'node ids are unique');
  assert.equal(node('start').metrics,null);
  assert.equal(node('start').choices.length,4,'four starting options');
  const terminals=d.nodes.filter(n=>n.choices.length===0);
  assert.equal(terminals.length,8,'eight terminal outcomes');
  const cards=new Set(d.evidence.map(e=>e.id));
  let edges=0;
  for(const n of d.nodes){
    assert.ok(n.consequence&&n.accountability&&n.uncertainty,`${n.id} narrative`);
    for(const e of n.evidenceIds)assert.ok(cards.has(e),`${n.id} cites ${e}`);
    if(n.metrics!==null)assert.equal(n.metrics.length,8,`${n.id} vector length`);
    for(const c of n.choices){edges++;assert.ok(ids.has(c.next),`${n.id}/${c.id} resolves`);assert.notEqual(c.next,n.id,'no self edge')}
  }
  assert.equal(edges,12,'twelve edges');
  for(const start of node('start').choices){
    const mid=node(start.next);
    assert.equal(mid.choices.length,2,`${mid.id} offers two further choices`);
    assert.equal(mid.evidenceIds.length,1,`${mid.id} reveals one new card`);
    for(const c of mid.choices){const t=node(c.next);assert.equal(t.choices.length,0,`${t.id} is terminal`);assert.equal(t.title,c.label,`${t.id} titled by its incoming choice`);assert.deepEqual(t.evidenceIds,[mid.evidenceIds[0],'E4'],`${t.id} cards`)}
  }
  const follow=new Set(node('start').choices.flatMap(c=>node(c.next).choices.map(x=>x.id)));
  assert.equal(follow.size,8,'the further choices differ by starting route');
  const result=n=>{const m=Object.fromEntries(d.metricKeys.map((k,i)=>[k,n.metrics[i]]));const released=d.scenario.baseline[0]-m.humanHours;return{...m,released,value:released*d.scenario.hourValueEUR-m.costEUR,manual:100-m.automated-m.assisted,wrong:m.wrongA+m.wrongB,rateA:m.wrongA/80*100,rateB:m.wrongB/20*100,gap:Math.abs(m.wrongB/20*100-m.wrongA/80*100)}};
  for(const t of terminals){
    const r=result(t);
    assert.equal(r.manual,100-r.automated-r.assisted);
    assert.ok(r.manual>=0&&r.automated>=0&&r.assisted>=0,`${t.id} counts are disjoint and non-negative`);
    assert.ok(r.wrongA<=80&&r.wrongB<=20,`${t.id} errors stay within their group denominators`);
    assert.equal(t.metrics.length,8);
  }
  const worked={'pilot-support':[0.5,-30,5,3.75,10,6.25,7,2],'human-resource':[2,-10,3,1.25,10,8.75,7,6],'full-speed':[8,100,14,5,50,45,90,8],'none-train':[1,-10,6,3.75,15,11.25,0,0]};
  for(const [id,[released,value,wrong,rateA,rateB,gap,retention,energy]] of Object.entries(worked)){
    const r=result(node(id));
    assert.equal(r.released,released,`${id} hours released`);
    assert.equal(r.value,value,`${id} capacity value`);
    assert.equal(r.wrong,wrong,`${id} wrong of 100`);
    assert.equal(Number(r.rateA.toFixed(2)),rateA);
    assert.equal(Number(r.rateB.toFixed(2)),rateB);
    assert.equal(Number(r.gap.toFixed(2)),gap);
    assert.equal(r.retentionDays,retention);
    assert.equal(r.energyUnits,energy);
  }
  const base=result({metrics:d.scenario.baseline});
  assert.equal(base.wrong,8);assert.equal(base.value,0);assert.equal(Number(base.gap.toFixed(2)),15);
  assert.ok(Object.keys(d.nodes[0]).every(k=>k!=='score'),'no combined score');
  assert.doesNotMatch(JSON.stringify(d.nodes),/"correct"|"best"|"winner"|"score"/i,'no correct terminal');
});
