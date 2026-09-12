import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Phase 8: Chapter 7 Our AI Future, Student Book pp. 32–35.
// The decision graph is read back out of the binding contract, so the curriculum fixture, the
// renderer and the deterministic model are checked against one shared source rather than a copy.
// No live AI, network call or browser is needed: the simulator is entirely in-product.
const read=p=>fs.readFileSync(p,'utf8');
const contract=read('docs/product/phase-8-contract.md'),app=read('app.js'),styles=read('styles.css'),admin=read('admin.js');
const course=JSON.parse(read('curriculum.json')),b=course.blocks.find(x=>x.id==='block7');
const session=id=>(b?.sessions||[]).find(s=>s.id===id)||{};
const ids=['b7s1','b7s2','b7s3','b7s4','b7s5','b7s6','b7s7','b7s8'];
const keyWords=['Narrow AI','AGI','Automation','Augmentation','Scenario','Uncertainty','Trade-off','Accountability','Future skills','Societal impact'];
const stakeholders=['worker','customer','employer','regulator','excluded'];
const plain=v=>JSON.parse(JSON.stringify(v));

// ---- the fixed decision fixture, parsed from the contract's own tables ----
const cells=line=>line.replace(/^\|\s?/,'').replace(/\s?\|$/,'').split(' | ').map(c=>c.trim());
const tableRows=re=>contract.split('\n').filter(l=>re.test(l)).map(cells);
const arr=text=>JSON.parse(text.replace(/`/g,''));
const EVIDENCE=tableRows(/^\| (?:E1|E2|E3|E4|EP|EH|EF|EN) \| /).map(([id,status,text])=>({id,status,text}));
const START={id:'start',title:'Choose an adoption approach',evidenceIds:['E1','E2','E3','E4'],metrics:null,consequence:'Read the baseline and prototype evidence before choosing. What would this approach change, and what might it miss?',accountability:'The service manager owns the adoption decision.',uncertainty:'One small audit and a reused sandbox sample cannot predict 2035.',choices:[['pilot','Pilot','pilot-review'],['human','Human+AI','human-review'],['full','Full automation','full-review'],['none','No deployment','none-review']].map(([id,label,next])=>({id,label,next}))};
const MIDDLE=tableRows(/^\| (?:pilot|human|full|none)-review \/ /).map(([head,ev,metrics,consequence,accountability,uncertainty,choices])=>{
  const [id,title]=head.split(' / ');
  return {id,title,evidenceIds:[ev],metrics:arr(metrics),consequence,accountability,uncertainty,choices:choices.split(';').map(c=>arr(c)).map(([cid,label,next])=>({id:cid,label,next}))};
});
const TERMINALS=tableRows(/^\| (?:pilot-support|pilot-expand|human-resource|human-targets|full-audit|full-speed|none-train|none-wait) \| /).map(([id,metrics,consequence,accountability,uncertainty])=>{
  const parent=MIDDLE.find(n=>n.choices.some(c=>c.next===id));
  return {id,title:parent.choices.find(c=>c.next===id).label,evidenceIds:[parent.evidenceIds[0],'E4'],metrics:arr(metrics),consequence,accountability,uncertainty,choices:[]};
});
const NODES=[START,...MIDDLE,...TERMINALS];
const DECISION={...JSON.parse(contract.split('```json\n')[1].split('```')[0]),evidence:EVIDENCE,nodes:NODES};
const decSession={id:'b7s4',title:'Three futures',activity:DECISION};
const nodeById=id=>NODES.find(n=>n.id===id);

// Independent reference model, written from the contract's arithmetic rather than from app.js.
function reference(node){
  const m=Object.fromEntries(DECISION.metricKeys.map((k,i)=>[k,node.metrics[i]]));
  const hoursReleased=DECISION.scenario.baseline[0]-m.humanHours;
  return {...m,hoursReleased,capacityValueEUR:hoursReleased*DECISION.scenario.hourValueEUR-m.costEUR,manual:100-m.automated-m.assisted,wrongTotal:m.wrongA+m.wrongB,rateA:m.wrongA/80*100,rateB:m.wrongB/20*100,gap:Math.abs(m.wrongB/20*100-m.wrongA/80*100)};
}

// ---- the real app helpers, run as written ----
const lineFunction=(src,name)=>{const m=src.match(new RegExp(`^function ${name}\\(.*$`,'m'));assert.ok(m,name);return m[0]};
const state={activity:{}};
let feedbackSeen={},syncs=0;
const context=vm.createContext({state,COURSE:course,feedback:(id,text,kind)=>{feedbackSeen={id,text,kind}},scheduleSync:()=>{syncs++}});
vm.runInContext(app.match(/^const esc=.*$/m)[0],context);
vm.runInContext(app.slice(app.indexOf('function activityBodyHTML('),app.indexOf('function labEvidenceHTML(')),context);
for(const name of ['activityReady','wireDecision'])vm.runInContext(lineFunction(app,name),context);
vm.runInContext(admin.slice(admin.indexOf('function activityLabel('),admin.indexOf('function renderValue(')),context);

// Minimal DOM stand-in: the controls the renderer actually emitted, rebuilt on every repaint.
function makeHost(html){
  const host={html:'',focused:0,map:new Map(),lists:new Map()};
  const el=extra=>({value:'',dataset:{},focus(){host.focused++},...extra});
  const build=()=>{
    host.map=new Map();host.lists=new Map();
    for(const id of ['decisionChoose','decisionRecord','decisionRestart','decisionEvidence','decisionReason'])if(host.html.includes(`id="${id}"`))host.map.set('#'+id,el({disabled:new RegExp(`id="${id}"[^>]*disabled`).test(host.html)}));
    if(host.html.includes('id="decisionNode"'))host.map.set('#decisionNode h4',el());
    const list=(re,key)=>[...host.html.matchAll(re)].map(m=>{const e=el();e.dataset[key]=m[1];return e});
    host.lists.set('input[name="decisionChoice"]',[...host.html.matchAll(/data-choice="([^"]+)"/g)].map(m=>el({value:m[1],dataset:{choice:m[1]}})));
    host.lists.set('select[data-future]',list(/data-future="([^"]+)"/g,'future'));
    host.lists.set('textarea[data-scenario]',list(/data-scenario="([^"]+)"/g,'scenario'));
    host.lists.set('textarea[data-decision-field]',list(/data-decision-field="([^"]+)"/g,'decisionField'));
  };
  Object.defineProperty(host,'innerHTML',{get:()=>host.html,set(v){host.html=v;build()}});
  host.querySelector=sel=>host.map.get(sel)||null;
  host.querySelectorAll=sel=>host.lists.get(sel)||[];
  host.innerHTML=html;
  return host;
}
function openLab(){state.activity.b7s4=state.activity.b7s4||{};const host=makeHost(context.decisionInnerHTML(decSession));context.wireDecision(decSession,host);return host}
function choose(host,choiceId,evidenceId,reason){
  const radio=host.querySelectorAll('input[name="decisionChoice"]').find(x=>x.dataset.choice===choiceId);
  assert.ok(radio,`choice ${choiceId} is offered`);radio.onchange();
  const cite=host.querySelector('#decisionEvidence');cite.value=evidenceId;cite.onchange();
  const text=host.querySelector('#decisionReason');text.value=reason;text.oninput();
  host.querySelector('#decisionChoose').onclick();
}
function walk(host,first,firstCard,second,card,reasons=['Because the baseline audit shows where the time actually goes.','Because the new card shows who is still missing out.']){
  choose(host,first,firstCard,reasons[0]);
  choose(host,second,card,reasons[1]);
}

test('Chapter 7 metadata and verbatim book fields match the binding contract',()=>{
  assert.ok(b,'block7 exists in curriculum.json');
  assert.equal(b.number,'07');assert.equal(b.title,'Our AI Future');assert.equal(b.duration,'3 hours');assert.equal(b.badge,'Future Thinker');
  assert.deepEqual(b.outcomes,['LO4','LO8']);
  for(const name of ['description','mission','route','final','myths','selfCheck','levelUp']){
    const line=contract.split('\n').find(l=>l.startsWith(name+':')||l.startsWith(name+' ('));
    assert.deepEqual(b[name],JSON.parse(line.slice(line.indexOf(': ')+2)),name);
  }
  assert.equal(b.lab.title,'AI Adoption Decision Simulator');
  assert.deepEqual(b.lab.stages,[['DO','b7s3','Map the tasks before choosing AI'],['TEST','b7s1','Separate observation from prediction'],['MAKE','b7s4','Build three futures through branching choices'],['BREAK','b7s5','Challenge each future through five stakeholders'],['IMPROVE','b7s6','Defend and revise a governance choice'],['PROVE','b7s8','Justify the final recommendation']]);
  assert.equal(b.lab.stages.length,6);
  assert.deepEqual(b.sessions.map(s=>s.id),ids);
  assert.deepEqual(b.sessions.map(s=>s.title),b.route.map(r=>r[1]));
  assert.deepEqual(b.sessions.map(s=>s.minutes),[20,20,30,30,25,25,20,10]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),180);
  assert.deepEqual(b.sessions.map(s=>s.type),['PREDICT + TEST','DISCOVER','TRY + INVESTIGATE','MAKE + TEST','BREAK + QUESTION','QUESTION + IMPROVE','MAKE + REFLECT','REFLECT + EVIDENCE']);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['chain','quiz','chain','decision','chain','textfields','textfields','textfields']);
  const words=b.sessions.flatMap(s=>s.study.keywords);
  for(const word of keyWords)assert.ok(words.includes(word),word);
  for(const s of b.sessions){assert.equal(s.pageRef,'Student Book pp. 32–35');assert.ok(s.intro&&s.activity.title&&s.activity.instructions&&s.reflection);assert.equal(s.study.body.length,3);assert.ok(s.study.title&&s.study.example&&s.study.keywords.length>=3)}
  const reflections={b7s3:'Does the technology replace a task, or a whole job?',b7s4:'Which part of your scenario is evidence-based, and which is speculation?',b7s5:'Who benefits? Who carries the risk?',b7s7:'Which human capability becomes more important, not less?',b7s8:'Which future outcome depends most on human choices, rather than on the technology itself?'};
  for(const [id,value] of Object.entries(reflections))assert.equal(session(id).reflection,value,id);
  // No session opens an AI or external tool in this chapter, so no lab activity, tool link or acknowledgement exists.
  for(const s of b.sessions){assert.equal(s.activity.kind==='lab',false,s.id);assert.equal(s.activity.tool,undefined,s.id);assert.equal(s.activity.privacy,undefined,s.id);assert.equal(s.activity.url,undefined,s.id)}
});

test('reused chain, quiz and textfields sessions keep the contract shapes and evidence labels',()=>{
  const quiz=session('b7s2').activity;
  assert.equal(quiz.title,'A task, a general capability, or a forecast?');
  assert.deepEqual(quiz.options,['Narrow AI','AGI (hypothetical)','Uncertain forecast']);
  assert.deepEqual(quiz.items,[
    ['A system trained to sort product messages into request types','Narrow AI'],
    ['A model trained to recognise plant disease in images','Narrow AI'],
    ['An assistant generating text for a particular task','Narrow AI'],
    ['A hypothetical system with broad, human-like capability across many tasks','AGI (hypothetical)'],
    ['By 2035 every retail job will disappear','Uncertain forecast'],
    ['General AI will definitely arrive in a particular year','Uncertain forecast']
  ]);
  assert.equal(session('b7s1').activity.rows,4);assert.equal(session('b7s1').activity.minRows,4);
  assert.equal(session('b7s1').activity.head,'CAPABILITY → OBSERVATION OR PREDICTION → BASIS → LIMIT');
  assert.deepEqual(session('b7s1').activity.columns,[['claim','Capability or change'],['status','Observed now / possible in 2035'],['basis','What I observed or which evidence card I used; what I am assuming'],['check','What this does not prove, and what would change my view']]);
  assert.equal(session('b7s3').activity.head,'TASK → POSSIBLE CHANGE → EVIDENCE AND ASSUMPTION → HUMAN ROLE');
  assert.deepEqual(session('b7s3').activity.columns,[['task','Task within the retail job'],['change','Automated / augmented / strongly human'],['basis','Evidence card and assumption behind this judgement'],['human','Human capability and responsibility that remain']]);
  assert.equal(session('b7s5').activity.head,'STAKEHOLDER → THREE FUTURES → EVIDENCE → CONFLICT AND SAFEGUARD');
  assert.deepEqual(session('b7s5').activity.columns,[['stakeholder','Stakeholder'],['impact','Benefits and risks across my three futures, with run ids'],['evidence','A case card or result with its count or stated limitation'],['clash','Whose interests clash, and which safeguard leaves a trade-off']]);
  for(const id of ['b7s3','b7s5'])for(const key of ['rows','minRows'])assert.equal(session(id).activity[key],5,`${id}.${key}`);
  assert.deepEqual(b.sessions.map(s=>(s.activity.fields||[]).length),[0,0,0,1,0,4,4,3]);
  for(const id of ['b7s6','b7s7','b7s8']){
    const section=contract.split(`**${id} `)[1].split(/\n\n\*\*b7s|\n\nReused kinds/)[0];
    assert.deepEqual(session(id).activity.fields,[...section.matchAll(/"([^"\n]*…[^"\n]*)"/g)].map(m=>m[1]),id);
  }
  for(const id of ids.filter(x=>x!=='b7s4')){
    const section=contract.split(`**${id} `)[1].split(/\n\n\*\*b7s|\n\nReused kinds/)[0];
    const label=section.match(/Evidence label "([^"]+)"/);
    if(label)assert.ok(session(id).activity.instructions.includes(`Evidence: ${label[1]}.`),id);
  }
  // The stakeholder task names all five book lenses; the scenario task keeps the book's three requirements verbatim.
  const lens=(session('b7s5').activity.instructions+' '+JSON.stringify(session('b7s5').activity)).toLowerCase();
  for(const who of stakeholders)assert.match(lens,new RegExp(who),who);
  assert.ok(session('b7s4').activity.instructions.startsWith(DECISION.instructions),'b7s4 keeps the fixed instructions');
  const canvas=JSON.stringify(session('b7s4'));
  for(const re of [/technology change/i,/human response/i,/unintended consequence/i,/evidence/i])assert.match(canvas,re);
  assert.match(JSON.stringify(b),/Each scenario needs a technology change, a human response, and an unintended consequence\. No scenario is allowed to be “everything's fine” or “everything's ruined”\./);
});

test('the decision fixture in curriculum.json is exactly the contract graph',()=>{
  const a=session('b7s4').activity;
  assert.equal(a.kind,'decision');
  for(const key of ['title','scenario','metricKeys','start','minRuns','requiredStarts','futureLabels','fields','downloads'])assert.deepEqual(plain(a[key]),DECISION[key],key);
  assert.equal(a.evidence.length,8);assert.equal(a.nodes.length,13);
  for(const card of EVIDENCE)assert.deepEqual(plain(a.evidence.find(e=>e.id===card.id)),card,card.id);
  for(const node of NODES)assert.deepEqual(plain(a.nodes.find(n=>n.id===node.id)),node,node.id);
});

test('the fixed graph has four starting options, distinct follow-ups and eight terminals',()=>{
  assert.equal(EVIDENCE.length,8);
  assert.deepEqual(EVIDENCE.map(e=>e.id),['E1','E2','E3','E4','EP','EH','EF','EN']);
  for(const card of EVIDENCE){assert.ok(card.status&&card.text);assert.match(card.status,/observation|assumption|evidence/i)}
  assert.equal(NODES.length,13);
  assert.equal(new Set(NODES.map(n=>n.id)).size,13);
  for(const node of NODES)assert.deepEqual(Object.keys(node).sort(),['accountability','choices','consequence','evidenceIds','id','metrics','title','uncertainty'],node.id);
  assert.equal(START.choices.length,4);
  assert.deepEqual(START.choices.map(c=>c.id),['pilot','human','full','none']);
  assert.equal(MIDDLE.length,4);assert.equal(TERMINALS.length,8);
  const edges=NODES.flatMap(n=>n.choices.map(c=>[n.id,c.id,c.next]));
  assert.equal(edges.length,12);
  assert.equal(new Set(edges.map(e=>e.join('>'))).size,12);
  for(const [,,next] of edges)assert.ok(nodeById(next),next);
  for(const node of MIDDLE){
    assert.equal(node.choices.length,2);
    assert.equal(new Set(node.choices.map(c=>c.id)).size,2);
    assert.ok(node.choices.every(c=>TERMINALS.some(t=>t.id===c.next)),node.id);
  }
  // The follow-up choices actually differ by starting route; a static four-option form would not.
  const followUps=MIDDLE.map(n=>n.choices.map(c=>c.label).join('|'));
  assert.equal(new Set(followUps).size,4);
  assert.equal(new Set(MIDDLE.flatMap(n=>n.choices.map(c=>c.id))).size,8);
  // No cycle and no dead end other than the eight terminals: every node is reached in exactly two edges.
  const reached=new Set(['start']);
  for(const node of [START,...MIDDLE])for(const c of node.choices)reached.add(c.next);
  assert.equal(reached.size,13);
  for(const node of TERMINALS){assert.equal(node.choices.length,0);assert.equal(node.evidenceIds.length,2);assert.equal(node.evidenceIds[1],'E4')}
  assert.equal(START.metrics,null);
  for(const node of [...MIDDLE,...TERMINALS])assert.equal(node.metrics.length,8);
  assert.deepEqual(DECISION.metricKeys,['humanHours','costEUR','automated','assisted','wrongA','wrongB','retentionDays','energyUnits']);
  assert.equal(DECISION.minRuns,3);assert.deepEqual(DECISION.requiredStarts,['none']);
  assert.deepEqual(DECISION.futureLabels.map(f=>f[0]),['optimistic','concerning','balanced']);
  // Nothing in the fixture ranks, scores or recommends a terminal outcome.
  assert.doesNotMatch(JSON.stringify(NODES),/"score"|"rank"|"correct"|"best"|"winner"|"recommended"/i);
});

test('the deterministic model reproduces every terminal outcome and the contract worked examples',()=>{
  const derive=context.decDerive.bind(null,DECISION);
  const outcome=id=>derive(context.decVector(DECISION,nodeById(id)));
  for(const node of [...MIDDLE,...TERMINALS]){
    const expected=reference(node),actual=derive(context.decVector(DECISION,node));
    for(const key of Object.keys(expected))assert.equal(actual[key],expected[key],`${node.id}.${key}`);
    assert.equal(actual.automated+actual.assisted+actual.manual,100,`${node.id} allocation sums to 100`);
    assert.ok(actual.manual>=0&&actual.automated>=0&&actual.assisted>=0,node.id);
    assert.ok(actual.wrongA<=80&&actual.wrongB<=20,`${node.id} errors stay inside their group`);
    assert.ok(actual.wrongTotal<=100,node.id);
  }
  const base=derive(context.decBaseline(DECISION));
  assert.equal(base.wrongTotal,8);assert.equal(base.rateA.toFixed(2),'5.00');assert.equal(base.rateB.toFixed(2),'20.00');
  assert.equal(base.gap.toFixed(2),'15.00');assert.equal(base.capacityValueEUR.toFixed(2),'0.00');
  const none=outcome('none-wait');
  assert.equal(none.wrongTotal,8);assert.equal(none.capacityValueEUR.toFixed(2),'0.00');assert.equal(none.gap.toFixed(2),'15.00');
  const support=outcome('pilot-support');
  assert.equal(support.hoursReleased.toFixed(1),'0.5');assert.equal(support.capacityValueEUR.toFixed(2),'-30.00');
  assert.deepEqual([support.automated,support.assisted,support.manual],[10,10,80]);
  assert.equal(support.wrongTotal,5);assert.equal(support.rateA.toFixed(2),'3.75');assert.equal(support.rateB.toFixed(2),'10.00');
  assert.equal(support.gap.toFixed(2),'6.25');assert.equal(support.retentionDays,7);assert.equal(support.energyUnits,2);
  const resource=outcome('human-resource');
  assert.equal(resource.hoursReleased.toFixed(1),'2.0');assert.equal(resource.capacityValueEUR.toFixed(2),'-10.00');
  assert.equal(resource.wrongTotal,3);assert.equal(resource.rateA.toFixed(2),'1.25');assert.equal(resource.rateB.toFixed(2),'10.00');assert.equal(resource.gap.toFixed(2),'8.75');
  const speed=outcome('full-speed');
  assert.equal(speed.hoursReleased.toFixed(1),'8.0');assert.equal(speed.capacityValueEUR.toFixed(2),'100.00');
  assert.equal(speed.wrongTotal,14);assert.equal(speed.rateA.toFixed(2),'5.00');assert.equal(speed.rateB.toFixed(2),'50.00');
  assert.equal(speed.gap.toFixed(2),'45.00');assert.equal(speed.retentionDays,90);assert.equal(speed.energyUnits,8);
  const train=outcome('none-train');
  assert.equal(train.hoursReleased.toFixed(1),'1.0');assert.equal(train.capacityValueEUR.toFixed(2),'-10.00');
  assert.equal(train.wrongTotal,6);assert.equal(train.rateA.toFixed(2),'3.75');assert.equal(train.rateB.toFixed(2),'15.00');assert.equal(train.gap.toFixed(2),'11.25');
  // A negative capacity value is a valid outcome, and the highest value is not the safest path.
  assert.ok(TERMINALS.map(t=>outcome(t.id).capacityValueEUR).some(v=>v<0));
  const best=TERMINALS.map(t=>({id:t.id,...outcome(t.id)})).sort((x,y)=>y.capacityValueEUR-x.capacityValueEUR)[0];
  assert.equal(best.id,'full-speed');assert.equal(best.wrongTotal,14);
});

test('the decision renderer shows the case, evidence, node, all eight dimensions and no preselected choice',()=>{
  state.activity.b7s4={};
  const html=context.activityBodyHTML(decSession);
  assert.match(html,/class="decision-lab"/);
  assert.match(html,/Harbour Co-op: routine customer requests/);
  assert.match(html,/AI Adoption Adviser/);
  assert.match(html,/synthetic teaching data/);
  for(const id of ['E1','E2','E3','E4'])assert.match(html,new RegExp(`data-evidence="${id}"`),id);
  for(const id of ['EP','EH','EF','EN'])assert.doesNotMatch(html,new RegExp(`data-evidence="${id}"`),`${id} is not visible before its route is taken`);
  assert.match(html,/id="decisionNode"[^>]*aria-live="polite"/);
  assert.match(html,/Choose an adoption approach/);
  assert.match(html,/The service manager owns the adoption decision\./);
  for(const [key] of [['value'],['tasks'],['safety'],['fairness'],['privacy'],['accountability'],['uncertainty'],['sustainability']])assert.match(html,new RegExp(`data-metric="${key}"`),key);
  assert.match(html,/Baseline · E1 observation/);assert.match(html,/Now · Baseline observation/);
  assert.match(html,/4\/80 = 5\.00% · B 4\/20 = 20\.00% · gap 15\.00 percentage points/);
  assert.match(html,/0 automatic · 0 assisted · 100 manual of 100/);
  assert.match(html,/0\.0 h released · €0\.00 extra cost · net capacity value €0\.00/);
  assert.match(html,/percentage points/);assert.match(html,/index units/);assert.match(html,/days/);
  assert.equal((html.match(/name="decisionChoice"/g)||[]).length,4);
  assert.doesNotMatch(html,/name="decisionChoice"[^>]*checked/);
  assert.match(html,/id="decisionEvidence"><option value=""/);
  assert.match(html,/id="decisionReason"/);assert.match(html,/id="decisionChoose"/);
  assert.doesNotMatch(html,/id="decisionRecord"|id="decisionRestart"/);
  assert.match(html,/class="decision-path"/);
  for(const [key,label] of DECISION.futureLabels){assert.match(html,new RegExp(`data-future="${key}"`),key);assert.match(html,new RegExp(`data-scenario="${key}"`),key);assert.match(html,new RegExp(label))}
  assert.match(html,/data-decision-field="comparison"/);
  // The new kind never writes through the generic numeric field handlers.
  assert.doesNotMatch(html,/data-i="/);assert.doesNotMatch(html,/data-f="/);
  assert.ok(styles.includes('.block-7{background:'));
  assert.ok(styles.includes('.decision-lab{'));
  assert.match(styles,/@media\(max-width:620px\)\{[^}]*decision-metrics/);
  assert.match(styles,/focus-visible/);
});

test('choosing, revealing, recording and restarting drive the saved path',()=>{
  state.activity.b7s4={};syncs=0;
  const host=openLab();
  // A choice without a reason or a citation cannot commit an edge.
  host.querySelector('#decisionChoose').onclick();
  assert.match(feedbackSeen.text,/Choose one of the options/);
  const radio=host.querySelectorAll('input[name="decisionChoice"]').find(x=>x.dataset.choice==='pilot');radio.onchange();
  host.querySelector('#decisionChoose').onclick();assert.match(feedbackSeen.text,/evidence cards you can actually see/);
  const cite=host.querySelector('#decisionEvidence');cite.value='EP';cite.onchange();
  host.querySelector('#decisionChoose').onclick();assert.match(feedbackSeen.text,/evidence cards you can actually see/,'EP is not available at the root');
  cite.value='E1';cite.onchange();
  const reason=host.querySelector('#decisionReason');reason.value='too short';reason.oninput();
  host.querySelector('#decisionChoose').onclick();assert.match(feedbackSeen.text,/at least 12 characters/);
  assert.equal(state.activity.b7s4.path.length,0);
  reason.value='Start small because E1 is one week of evidence only.';reason.oninput();
  host.querySelector('#decisionChoose').onclick();
  assert.equal(state.activity.b7s4.path.length,1);
  assert.equal(state.activity.b7s4.path[0].choiceId,'pilot');
  assert.deepEqual(plain(state.activity.b7s4.draft),{choiceId:'',evidenceId:'',reason:''});
  assert.ok(host.focused>0,'focus moves to the revealed node heading');
  assert.match(host.innerHTML,/The pilot exposes access gaps/);
  assert.match(host.innerHTML,/data-evidence="EP"/);
  assert.match(host.innerHTML,/Now · Fictional observation/);
  assert.match(host.innerHTML,/9\.0 h released|1\.0 h released/);
  assert.match(host.innerHTML,/id="decisionRestart"/);
  assert.deepEqual(host.querySelectorAll('input[name="decisionChoice"]').map(x=>x.dataset.choice),['support','expand']);
  // The second citation must be the card this route has just revealed.
  const cite2=host.querySelector('#decisionEvidence');cite2.value='E1';cite2.onchange();
  host.querySelectorAll('input[name="decisionChoice"]').find(x=>x.dataset.choice==='support').onchange();
  const reason2=host.querySelector('#decisionReason');reason2.value='The pilot still misses the support route, so fund it.';reason2.oninput();
  host.querySelector('#decisionChoose').onclick();
  assert.match(feedbackSeen.text,/Cite EP here/);
  assert.equal(state.activity.b7s4.path.length,1);
  cite2.value='EP';cite2.onchange();
  host.querySelector('#decisionChoose').onclick();
  assert.equal(state.activity.b7s4.path.length,2);
  assert.match(host.innerHTML,/Now · Modelled possibility/);
  assert.doesNotMatch(host.innerHTML,/id="decisionChoose"/);
  assert.match(host.innerHTML,/id="decisionRecord"/);
  assert.match(host.innerHTML,/0\.5 h released · €40\.00 extra cost · net capacity value €-30\.00/);
  host.querySelector('#decisionRecord').onclick();
  assert.equal(state.activity.b7s4.runs.length,1);
  assert.equal(state.activity.b7s4.runs[0].terminalId,'pilot-support');
  assert.match(host.innerHTML,/Run 1: Pilot → Keep the pilot small and fund access support/);
  assert.match(host.innerHTML,/wrong 5\/100 \(A 3\/80, B 2\/20\)/);
  assert.match(host.innerHTML,/retention 7 days/);
  // Recording the same path twice is refused; restarting keeps the recorded runs.
  host.querySelector('#decisionRecord').onclick();
  assert.match(feedbackSeen.text,/already recorded this exact path/);
  assert.equal(state.activity.b7s4.runs.length,1);
  host.querySelector('#decisionRestart').onclick();
  assert.deepEqual(plain(state.activity.b7s4.path),[]);
  assert.equal(state.activity.b7s4.runs.length,1);
  assert.match(host.innerHTML,/Choose an adoption approach/);
  assert.match(host.innerHTML,/Run 1: Pilot/);
  assert.ok(syncs>0,'every change is persisted through the existing sync');
  assert.deepEqual(Object.keys(state.activity.b7s4).sort(),['draft','fields','futures','modelVersion','path','runs','scenarioId'].sort());
});

test('an unfinished draft and completed runs survive a reload',()=>{
  state.activity.b7s4={};
  const host=openLab();
  walk(host,'none','E1','train','EN');
  host.querySelector('#decisionRecord').onclick();
  host.querySelector('#decisionRestart').onclick();
  choose(host,'full','E2','The sandbox replay is not independent evidence at all.');
  const cite=host.querySelector('#decisionEvidence');cite.value='EF';cite.onchange();
  host.querySelectorAll('input[name="decisionChoice"]').find(x=>x.dataset.choice==='audit').onchange();
  const reason=host.querySelector('#decisionReason');reason.value='Appeals need an owner before wider use.';reason.oninput();
  const saved=JSON.parse(JSON.stringify(state.activity.b7s4));
  assert.equal(saved.path.length,1);assert.equal(saved.draft.choiceId,'audit');assert.equal(saved.draft.evidenceId,'EF');
  // Reload: the same stored value is re-rendered from scratch.
  state.activity.b7s4=saved;
  const reopened=openLab();
  assert.match(reopened.innerHTML,/Complaints need an owner/);
  assert.match(reopened.innerHTML,/data-choice="audit" value="audit" checked/);
  assert.match(reopened.innerHTML,/Appeals need an owner before wider use\./);
  assert.match(reopened.innerHTML,/Run 1: No deployment → Improve scripts and train staff without AI/);
});

test('readiness needs three distinct valid starts including none, three linked futures and a comparison',()=>{
  state.activity.b7s4={};
  const host=openLab();
  const record=(first,second,card)=>{walk(host,first,'E1',second,card);host.querySelector('#decisionRecord').onclick();host.querySelector('#decisionRestart').onclick()};
  assert.equal(context.activityReady(decSession),false);
  record('pilot','support','EP');
  assert.equal(context.activityReady(decSession),false,'one run is not enough');
  record('full','speed','EF');
  record('human','resource','EH');
  assert.equal(state.activity.b7s4.runs.length,3);
  assert.equal(context.activityReady(decSession),false,'three runs without the no-deployment route');
  record('none','train','EN');
  const runs=state.activity.b7s4.runs;
  const futures={optimistic:{runId:1,text:'Technology change, human response and an unintended consequence for the supported customers.'},concerning:{runId:2,text:'Automatic replies release time while the support route carries the error, which nobody owns.'},balanced:{runId:4,text:'No deployment keeps the queue, so the service trains staff and the access gap stays visible.'}};
  state.activity.b7s4.futures=JSON.parse(JSON.stringify(futures));
  state.activity.b7s4.fields={comparison:'The starting choice changed who carried the risk.'};
  assert.equal(context.activityReady(decSession),true);
  // A future that reuses a run, a short narrative, a missing comparison or a dropped no-deployment route all fail.
  state.activity.b7s4.futures.balanced.runId=1;
  assert.equal(context.activityReady(decSession),false,'reused run id');
  state.activity.b7s4.futures.balanced.runId=4;
  state.activity.b7s4.futures.balanced.text='Too short.';
  assert.equal(context.activityReady(decSession),false,'narrative under 40 characters');
  state.activity.b7s4.futures.balanced.text=futures.balanced.text;
  state.activity.b7s4.fields.comparison='short';
  assert.equal(context.activityReady(decSession),false,'comparison under 12 characters');
  state.activity.b7s4.fields.comparison='The starting choice changed who carried the risk.';
  state.activity.b7s4.futures.balanced.runId=3;
  assert.equal(context.activityReady(decSession),false,'the three futures must include the no-deployment route');
  state.activity.b7s4.futures.balanced.runId=4;
  assert.equal(context.activityReady(decSession),true);
  // Changing to a different defensible recommendation does not invalidate the evidence.
  state.activity.b7s4.futures.optimistic.text='I would now defend the human+AI route instead, because reviewers can correct the reply.';
  assert.equal(context.activityReady(decSession),true);
  // Tampered or partial saved data is never counted.
  const good=JSON.parse(JSON.stringify(state.activity.b7s4));
  for(const damage of [
    v=>{v.runs[0].path[1].choiceId='expand'},
    v=>{v.runs[0].terminalId='full-speed'},
    v=>{v.runs[0].path=[v.runs[0].path[0]]},
    v=>{v.runs[0].path[0].evidenceId='EP'},
    v=>{v.runs[0].path[1].evidenceId='E1'},
    v=>{v.runs[0].path[1].reason='too short'},
    v=>{v.runs[0].path[0].nodeId='pilot-review'},
    v=>{v.runs[0].id='1'}
  ]){const copy=JSON.parse(JSON.stringify(good));damage(copy);state.activity.b7s4=copy;assert.equal(context.activityReady(decSession),false)}
  // Recorded metrics are recomputed from the graph, so edited numbers change nothing.
  const tampered=JSON.parse(JSON.stringify(good));
  tampered.runs[0].metrics={humanHours:0,costEUR:0,automated:100,assisted:0,wrongA:0,wrongB:0,retentionDays:0,energyUnits:0};
  state.activity.b7s4=tampered;
  assert.equal(context.activityReady(decSession),true);
  const shown=context.decisionInnerHTML(decSession);
  assert.match(shown,/Run 1: Pilot → Keep the pilot small and fund access support → Keep the pilot small and fund access support · value €-30\.00/);
  state.activity.b7s4=good;
});

test('duplicate paths cannot pad completion and eight distinct paths is the limit',()=>{
  state.activity.b7s4={};
  const host=openLab();
  const every=[['pilot','support','EP'],['pilot','expand','EP'],['human','resource','EH'],['human','targets','EH'],['full','audit','EF'],['full','speed','EF'],['none','train','EN'],['none','wait','EN']];
  for(const [first,second,card] of every){walk(host,first,'E1',second,card);host.querySelector('#decisionRecord').onclick();host.querySelector('#decisionRestart').onclick()}
  assert.equal(state.activity.b7s4.runs.length,8);
  walk(host,'pilot','E1','support','EP');
  host.querySelector('#decisionRecord').onclick();
  assert.match(feedbackSeen.text,/already recorded this exact path/);
  assert.equal(state.activity.b7s4.runs.length,8);
  assert.equal(new Set(state.activity.b7s4.runs.map(r=>r.terminalId)).size,8);
  assert.equal(new Set(state.activity.b7s4.runs.map(r=>r.id)).size,8);
});

test('admin evidence labels and values read as choices, cards and units',()=>{
  const a=DECISION;
  assert.equal(context.activityLabel(a,'path'),'Current decision path');
  assert.equal(context.activityLabel(a,'draft'),'Unfinished choice');
  assert.equal(context.activityLabel(a,'runs'),'Recorded adoption paths');
  assert.equal(context.activityLabel(a,'futures'),'Three possible futures');
  assert.equal(context.activityLabel(a,'fields'),'Comparison and uncertainty');
  assert.equal(context.activityLabel(a,'0'),'AI adoption decision simulator');
  assert.doesNotMatch(context.activityLabel(a,'0'),/NaN/);
  const value={path:[{nodeId:'start',choiceId:'none',evidenceId:'E1',reason:'The baseline week is the only observation I have.'}],runs:[{id:1,path:[{nodeId:'start',choiceId:'none',evidenceId:'E1',reason:'The baseline week is the only observation I have.'},{nodeId:'none-review',choiceId:'train',evidenceId:'EN',reason:'Training is the change I can evidence today.'}],terminalId:'none-train',metrics:{humanHours:9,costEUR:30,automated:0,assisted:0,wrongA:3,wrongB:3,retentionDays:0,energyUnits:0}}],futures:{optimistic:{runId:1,text:'A trained team keeps the human route.'}},fields:{comparison:'The no-deployment route still leaves errors.'}};
  const shownPath=context.decisionDisplay(a,'path',value.path);
  assert.match(shownPath[0],/Choose an adoption approach → No deployment · cited E1 — Fictional baseline observation/);
  const shownRuns=context.decisionDisplay(a,'runs',value.runs);
  assert.match(shownRuns[0].Outcome,/Improve scripts and train staff without AI \(modelled possibility\)/);
  assert.match(shownRuns[0].Results,/9 staff hours/);
  assert.match(shownRuns[0].Results,/0 days of added AI transcript storage/);
  assert.match(shownRuns[0].Path,/The existing queue remains → Improve scripts and train staff without AI · cited EN/);
  assert.equal(context.decisionDisplay(a,'futures',value.futures).Optimistic,'Run 1: A trained team keeps the human route.');
  assert.equal(context.decisionDisplay(a,'fields',value.fields)['Comparison and uncertainty'],'The no-deployment route still leaves errors.');
  assert.deepEqual(context.decisionDisplay({kind:'textfields',fields:['x']},'0','answer'),'answer');
});

test('the chapter assessment evidence area shows the saved decision summary',()=>{
  state.activity.b7s4={};
  const host=openLab();
  walk(host,'none','E1','train','EN');
  host.querySelector('#decisionRecord').onclick();
  state.activity.b7s4.futures={optimistic:{runId:1,text:'The trained team keeps a human route and the queue shortens a little.'}};
  state.activity.b7s4.fields={comparison:'No deployment still leaves the access gap.'};
  const items=context.decisionEvidenceItems({sessions:[decSession]});
  assert.equal(items.length,3);
  assert.match(items[0][0],/Recorded adoption path 1/);
  assert.match(items[0][1],/No deployment → Improve scripts and train staff without AI/);
  assert.match(items[0][1],/EN: /);
  assert.match(items[1][0],/Optimistic future · run 1/);
  assert.equal(items[2][0],'Comparison and uncertainty');
  assert.match(app,/function labEvidenceHTML\(b\)\{const items=\[\.\.\.b\.sessions\.filter\(s=>s\.activity\.kind==='lab'\)/,'the existing lab evidence rendering is preserved');
});

test('Chapter 7 downloads exist on disk and the teacher key never reaches the students',()=>{
  const files=['ai-future-evidence-cards.txt','ai-future-career-cards.txt','ai-future-career-map.csv','ai-future-branch-cards.txt','ai-future-decision-log.csv','ai-future-scenario-canvas.md','ai-future-stakeholder-analysis.csv','ai-future-policy-cards.txt','ai-future-skills-card.md'];
  for(const file of files)assert.ok(fs.existsSync(`public/datasets/${file}`),file);
  for(const s of b.sessions)for(const d of s.activity.downloads||[]){assert.ok(d.label&&d.note,d.file);assert.ok(fs.existsSync(`public/datasets/${d.file}`),d.file);assert.doesNotMatch(d.file,/KEY/)}
  assert.deepEqual((session('b7s4').activity.downloads||[]).map(d=>d.file),['ai-future-evidence-cards.txt','ai-future-branch-cards.txt','ai-future-scenario-canvas.md','ai-future-decision-log.csv']);
  const key='docs/teacher/ai-future-adoption.KEY.txt';
  assert.ok(fs.existsSync(key));
  assert.equal(path.relative(path.resolve('public'),path.resolve(key)).startsWith('../'),true);
  const walkDir=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walkDir(path.join(dir,e.name)):[path.join(dir,e.name)]);
  assert.deepEqual(walkDir('public').filter(f=>/KEY/i.test(f)),[]);
  const cards=read('public/datasets/ai-future-evidence-cards.txt');
  for(const card of EVIDENCE){assert.ok(cards.includes(card.id),card.id);assert.ok(cards.includes(card.status),card.status)}
  const branches=read('public/datasets/ai-future-branch-cards.txt');
  for(const node of NODES)assert.ok(branches.includes(node.id),node.id);
  const canvas=read('public/datasets/ai-future-scenario-canvas.md');
  for(const [,label] of DECISION.futureLabels)assert.ok(canvas.includes(label),label);
  assert.doesNotMatch(canvas,/I recommend|my recommendation is/i);
  const keyText=read(key);
  for(const node of TERMINALS)assert.ok(keyText.includes(node.id),node.id);
  for(const item of session('b7s2').activity.items)assert.ok(keyText.includes(item[0]),item[0]);
});

test('the Chapter 7 server list gates the chapter behind Chapter 6',()=>{
  const api=read('functions/api/[[path]].js');
  assert.ok(api.includes("block7:['b7s1','b7s2','b7s3','b7s4','b7s5','b7s6','b7s7','b7s8']"));
  assert.match(api,/const blockOrder=Object\.keys\(requiredSessions\)/);
  const server=vm.createContext({});
  vm.runInContext(api.match(/^const requiredSessions=.*$/m)[0]+'\nglobalThis.sessions=requiredSessions;',server);
  assert.deepEqual(Object.keys(server.sessions).slice(0,7),['block1','block2','block3','block4','block5','block6','block7']);
  assert.deepEqual(plain(server.sessions.block7),ids);
});

test('Chapter 7 project brief and capstone follow the contract',()=>{
  const brief=PROJECT_BRIEFS.block7;
  assert.equal(brief.title,'AI Adoption Decision Pack');
  assert.equal(brief.role,'AI Adoption Adviser');
  assert.equal(brief.client,'Training centre futures team');
  assert.equal(brief.objective,b?.mission??brief.objective);
  assert.deepEqual(brief.deliverables,['2035 scenario canvas','Career transformation map','Stakeholder analysis','Future skills card','Debate reflection','Adoption decision log','Final recommendation']);
  const criteria=brief.acceptanceCriteria.join(' ');
  for(const re of [/plausible AI-related change/i,/three possible futures|three different adoption paths/i,/trade.offs/i,/future skills/i,/stakeholder/i,/governance choice/i,/evidence from speculation/i])assert.match(criteria,re);
  assert.match(brief.prompts.recommendation,/accountable role/);
  assert.match(brief.prompts.recommendation,/stop trigger/);
  assert.match(brief.prompts.recommendation,/highest capacity value is not automatically the right answer/);
  const cap=CAPSTONES.block7;
  assert.equal(cap.id,'block7-capstone');assert.equal(cap.title,'Future Thinker review');assert.equal(cap.prompts.length,3);
  assert.doesNotMatch(cap.brief,/Harbour Co-op|retail/i,'the capstone uses a second, different scenario');
  // A fully developed no-deployment recommendation earns the same formative level as a supported pilot.
  const noDeployment={0:'A booking clerk still allocates unusual requests, so narrow AI would only automate the standard bookings while a driver is augmented on the rest; AGI is not on the table, and the risk is that phone-assisted passengers lose the staffed route.',1:'My three futures are a pilot, human review and no deployment: the sandbox served 48 of 50 standard bookings but only 12 of 20 phone-assisted bookings, therefore the trade-off is carried by passengers who need help, and judgement and communication become the future skills that matter.',2:'I recommend no deployment for now and would retrain drivers instead, because the four-hour estimate excludes appeals and winter demand is unevidenced; the service manager stays accountable, any passenger can reach a person, and I would review this if independent evidence showed the phone-assisted gap closing.'};
  const pilot={0:noDeployment[0],1:noDeployment[1],2:'I recommend a supported pilot because the booking evidence shows a real gap for phone-assisted passengers, so the service manager stays accountable, drivers can override a suggestion, passengers keep a staffed phone route, and I would stop the pilot if phone-assisted errors rise.'};
  const a=assessChapterCapstone({blockId:'block7',answers:noDeployment}),c=assessChapterCapstone({blockId:'block7',answers:pilot});
  assert.equal(a.level,c.level);
  assert.equal(a.criteria.evidence,2);assert.equal(c.criteria.evidence,2);
  assert.ok(['Getting there','Going further'].includes(a.level));
});
