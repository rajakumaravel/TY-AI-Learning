import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Phase 9: Chapter 8 AI Innovation Project, Student Book pp. 36–41.
// The chapter adds no activity kind, so every assertion here is about reused renderers, the book's own
// wording and the two scoped additions the contract allows: the judging rubric and the programme-complete state.
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const app=read('app.js'),styles=read('styles.css'),html=read('index.html');
const course=JSON.parse(read('curriculum.json')),b=course.blocks.find(x=>x.id==='block8');
const session=id=>(b?.sessions||[]).find(s=>s.id===id)||{};
const ids=['b8s1','b8s2','b8s3','b8s4','b8s5','b8s6','b8s7','b8s8'];
// The book prints curly quotes; portal copy may use either, so wording is compared and typography is not.
const norm=v=>String(v).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
const keyWords=['problem framing','user need','success criteria','prototype','testing','iteration','risk','responsible AI','human oversight','value proposition','red-teaming'];
const PORTFOLIO=['Problem statement and user evidence','Three solution options, including the non-AI one','Responsible AI and data canvas','The prototype','Test record','Iteration log','Risk register','Final presentation','Individual reflection'];
const ROUTE=[['Hour 1','Sprint 1 · Problem hunt'],['Hour 2','Sprint 1 · Understand the user'],['Hour 3','Sprint 2 · Design options'],['Hour 4','Sprint 2 · Responsible design'],['Hour 5','Sprint 3 · Build the prototype'],['Hour 6','Sprint 3 · Test'],['Hour 7','Sprint 4 · Improve and red-team'],['Hour 8','Sprint 4 · Demo and reflection']];
const MYTHS=[
  ['The project has to use the most advanced AI.','The project has to solve a problem. The best answer is the least complex one that works. Sometimes that\'s a spreadsheet.'],
  ['A working demo proves the idea is useful.','A demo proves it runs. Test evidence from real users proves it\'s useful. They\'re different.'],
  ['Hide the limitations in the presentation.','Naming the limitations is one of the things you\'re being assessed on. Teams that hide them look like teams that didn\'t test.']
];
const SELF_CHECK={
  'Getting started':['I defined a problem and built a basic prototype','I can describe what it does'],
  'Getting there':['I used evidence from users','I tested, improved and identified key risks'],
  'Going further':['I compared AI and non-AI options','I set success criteria in advance','I red-teamed the solution and communicated uncertainty honestly']
};
const LEVEL_UP='Add a simple evaluation plan with one quantitative measure (a number) and one qualitative measure (what people say). Run a second test cycle and compare the results with the first.';
const MISSION='Solve a real school or community problem with a responsible, testable prototype. AI is optional: your team must justify whether it adds genuine value, and be ready to say "it doesn\'t" if that\'s what your evidence shows.';
const SAFETY=[
  'Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them.',
  'No accounts. DuckDuckGo AI Chat works without signing in; if a tool asks you to sign in, stop and use the fallback.',
  'The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked.',
  'Nothing typed into this portal is sent to the tool; copy across yourself and paste short extracts back here.'
];
const PRESENTATION=['The problem, and who experiences it','The evidence you gathered','The solution, and why AI is or isn\'t appropriate','A demonstration of the prototype','What happened during testing','One change you made because of evidence','One important risk, and its safeguard','What\'s still uncertain, or what you\'d test next'];
const DOWNLOADS=['innovation-project-canvas.md','innovation-problem-cards.txt','innovation-interview-guide.txt','innovation-responsible-canvas.md','innovation-prototype-starters.txt','innovation-peer-test-sheet.csv','innovation-risk-register.csv','innovation-presentation-guide.md','innovation-rubric.txt'];

// ---- the real app helpers, run as written ----
const lineFunction=(src,name)=>{const m=src.match(new RegExp(`^(?:const |function )${name}[=(].*$`,'m'));assert.ok(m,name);return m[0]};
const state={activity:{}};
const context=vm.createContext({state,COURSE:course,feedback:()=>{},scheduleSync:()=>{}});
vm.runInContext(app.match(/^const esc=.*$/m)[0],context);
vm.runInContext(app.slice(app.indexOf('function activityBodyHTML('),app.indexOf('function labEvidenceHTML(')),context);
for(const name of ['rubricHTML','activityReady'])vm.runInContext(lineFunction(app,name),context);
const fill=(id,value)=>{state.activity[id]=value};

test('Chapter 8 metadata and verbatim book fields match the binding contract',()=>{
  assert.ok(b,'block8 exists in curriculum.json');
  assert.equal(b.number,'08');assert.equal(b.title,'AI Innovation Project');assert.equal(b.duration,'8 hours');assert.equal(b.badge,'AI Innovator');
  assert.deepEqual(b.outcomes,['LO1','LO2','LO3','LO4','LO5','LO6','LO7','LO8','LO9']);
  assert.equal(norm(b.mission),norm(MISSION));
  assert.deepEqual(b.route,ROUTE);
  assert.deepEqual(b.myths.map(p=>p.map(norm)),MYTHS.map(p=>p.map(norm)));
  assert.deepEqual(Object.fromEntries(Object.entries(b.selfCheck).map(([k,v])=>[k,v.map(norm)])),Object.fromEntries(Object.entries(SELF_CHECK).map(([k,v])=>[k,v.map(norm)])));
  assert.equal(norm(b.levelUp),norm(LEVEL_UP));
  assert.match(norm(b.description),/AI is optional\. Part of the project is deciding whether it genuinely helps\.$/);
  assert.equal(norm(b.description).split('. ').length,2,'description is two sentences');
  for(const item of ['problem statement and user evidence','solution options','non-AI one','responsible AI and data canvas','prototype','test record','iteration log','risk register','final presentation','individual reflection'])assert.ok(norm(b.final).includes(item),item);
  assert.equal(b.lab.title,'AI Innovation Project');
  assert.deepEqual(b.lab.stages,[['DO','b8s1','Find a problem worth solving'],['TEST','b8s6','Watch real people use it'],['MAKE','b8s5','Build the smallest prototype'],['BREAK','b8s7','Red-team your own solution'],['IMPROVE','b8s7','Change one thing because of evidence'],['PROVE','b8s8','Present the evidence, including what failed']]);
  assert.deepEqual(b.sessions.map(s=>s.id),ids);
  assert.deepEqual(b.sessions.map(s=>s.title),ROUTE.map(r=>r[1]));
  assert.deepEqual(b.sessions.map(s=>s.minutes),[60,60,60,60,60,60,60,60]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),480);
  assert.deepEqual(b.sessions.map(s=>s.type),['DISCOVER + QUESTION','INVESTIGATE','PREDICT + TRY','QUESTION + MAKE','MAKE','TEST','IMPROVE + BREAK','REFLECT + EVIDENCE']);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['chain','textfields','chain','textfields','lab','testlog','chain','textfields']);
  const words=b.sessions.flatMap(s=>s.study.keywords.map(w=>w.toLowerCase()));
  for(const word of keyWords)assert.ok(words.includes(word.toLowerCase()),word);
  for(const s of b.sessions){assert.equal(s.pageRef,'Student Book pp. 36–41');assert.ok(s.intro&&s.activity.title&&s.activity.instructions&&s.reflection);assert.equal(s.study.body.length,3);assert.ok(s.study.title&&s.study.example&&s.study.keywords.length>=3)}
  const reflections={
    b8s1:'Which of your five problems did you reject, and which of the five tests did it fail?',
    b8s2:'What did the person actually need, as opposed to what they first asked for?',
    b8s3:'Would this problem still be worth solving without AI?',
    b8s4:'What happens when the AI is wrong?',
    b8s5:'What\'s the smallest prototype that can test your biggest assumption?',
    b8s6:'What evidence shows your change actually improved things?',
    b8s7:'Which decision must stay with a human?',
    b8s8:'What is still uncertain about your solution, and what would you test next?'
  };
  for(const [id,value] of Object.entries(reflections))assert.equal(norm(session(id).reflection),norm(value),id);
});

test('the book sentences the contract marks verbatim appear in the sessions that carry them',()=>{
  const body=session('b8s1').study.body.join(' ');
  for(const word of ['real','understandable','useful','testable','safe'])assert.ok(new RegExp(`\\b${word}\\b`).test(body),`b8s1 five tests: ${word}`);
  assert.match(norm(body),/real, understandable, useful, testable, safe/);
  assert.match(norm(session('b8s3').study.body.join(' ')),/at least one must not use AI/);
  assert.match(norm(session('b8s5').study.body.join(' ')),/Rough is fine\. Rough is the point\./);
  const s8=norm(session('b8s8').study.body.join(' '));
  let at=-1;
  for(const point of PRESENTATION){const i=s8.indexOf(norm(point));assert.ok(i>at,`b8s8 presentation point in order: ${point}`);at=i}
  // The worked examples must not hand over a problem a student is likely to choose.
  for(const s of b.sessions)assert.ok(!/school FAQ|lost.property|study.planning|career exploration assistant/i.test(s.study.example),s.id);
});

test('b8s1, b8s3 and b8s7 reuse the chain shape with this chapter columns',()=>{
  const one=session('b8s1').activity;
  assert.deepEqual(one.columns,[['problem','Problem I noticed'],['who','Who has it, and where I saw it'],['tests','Which of the five tests it passes: real, understandable, useful, testable, safe'],['verdict','Chosen, or rejected because…']]);
  assert.equal(one.rows,5);assert.equal(one.minRows,5);
  assert.equal(one.head,'PROBLEM → WHO HAS IT → FIVE TESTS → CHOSEN OR REJECTED');
  assert.match(norm(one.instructions),/exactly one row/i);
  assert.deepEqual(one.downloads.map(d=>d.file).sort(),['innovation-problem-cards.txt','innovation-project-canvas.md']);
  const three=session('b8s3').activity;
  assert.deepEqual(three.columns,[['option','Solution option'],['ai','Uses AI / no AI'],['fit','Why it fits the problem, and what it costs in complexity'],['verdict','Chosen, or rejected because…']]);
  assert.equal(three.rows,3);assert.equal(three.minRows,3);
  assert.equal(three.head,'OPTION → AI OR NOT → FIT AND COST → VERDICT');
  assert.match(norm(three.instructions),/no AI/);assert.match(norm(three.instructions),/exactly one/i);
  assert.match(norm(three.instructions),/genuine value|adds complexity|just complexity/i);
  const seven=session('b8s7').activity;
  assert.deepEqual(seven.columns,[['item','The change I made, or the risk I found'],['evidence','The test evidence or the attack that found it'],['safeguard','What I changed, or the safeguard I added'],['residual','What is still wrong, or still possible, after that']]);
  assert.equal(seven.rows,5);assert.equal(seven.minRows,5);
  assert.equal(seven.head,'CHANGE OR RISK → EVIDENCE → SAFEGUARD → WHAT REMAINS');
  assert.match(norm(seven.instructions),/at least three/i);
  for(const attack of ['hallucinat','bias','private data','misus','over.rel'])assert.match(norm(seven.instructions),new RegExp(attack,'i'),attack);
  assert.ok(seven.downloads.some(d=>d.file==='innovation-risk-register.csv'));
});

test('the risk register refuses a residual of none and the peer test log needs three testers',()=>{
  const seven=session('b8s7'),row=i=>({item:`Change ${i}`,evidence:'The tester could not find it',safeguard:'A person checks it first',residual:'It can still be missed at night'});
  const rows={};for(let i=0;i<5;i++)rows[i]=row(i);
  fill('b8s7',rows);
  assert.equal(context.activityReady(seven),true);
  for(const bad of ['none','None','none.','nothing','N/A','nil'])
    {rows[2].residual=bad;assert.equal(context.activityReady(seven),false,bad)}
  rows[2].residual='Someone could still upload the wrong photo';
  assert.equal(context.activityReady(seven),true);
  const six=session('b8s6'),a=six.activity;
  assert.equal(a.kind,'testlog');
  assert.deepEqual(a.columns.map(c=>c[0]),['tester','task','worked','confused','failed','unexpected']);
  assert.ok((a.minRows||a.rows)>=3,'at least three testers');
  assert.match(norm(a.instructions),/Don't help them while they use it\. Watch\./);
  assert.ok(a.downloads.some(d=>d.file==='innovation-peer-test-sheet.csv'));
  const log={};fill('b8s6',log);
  const entry=i=>({tester:`Person ${'ABC'[i]}`,task:'Find tonight event',worked:'Found it',confused:'The second screen',failed:'Nothing',unexpected:'They read it aloud'});
  for(let i=0;i<2;i++)log[i]=entry(i);
  assert.equal(context.activityReady(six),false,'two testers is not enough');
  log[2]=entry(2);
  assert.equal(context.activityReady(six),true);
  // Rendered with the selector contract's cells, not Chapter 2's class selects.
  const markup=context.activityBodyHTML(six);
  assert.match(markup,/data-i="0" data-f="tester"/);
  assert.match(markup,/data-i="2" data-f="unexpected"/);
});

test('b8s2 records user evidence without ever asking for an identity',()=>{
  const two=session('b8s2').activity;
  assert.equal(two.kind,'textfields');
  assert.equal(two.fields.length,5);
  for(const field of two.fields)assert.ok(!/\byour name\b|\btheir name\b|real name|phone number|email|address|contact detail/i.test(field),field);
  assert.match(norm(two.fields.join(' ')),/Person A/);
  assert.match(norm(two.instructions),/approved/i);
  assert.match(norm(two.instructions),/Chapter 3/);
  assert.match(norm(two.instructions),/Person A/);
  assert.match(norm(two.instructions),/no personal data|personal data you do not need|don't need/i);
  assert.ok(two.downloads.some(d=>d.file==='innovation-interview-guide.txt'));
  const four=session('b8s4').activity;
  assert.equal(four.fields.length,5);
  assert.match(norm(four.fields.join(' ')),/success criteria/i);
  assert.match(norm(four.instructions),/before/i);
  assert.match(norm(four.instructions),/not edited|do not edit|never edited/i);
  assert.ok(four.downloads.some(d=>d.file==='innovation-responsible-canvas.md'));
  const eight=session('b8s8').activity;
  assert.equal(eight.fields.length,9);
  assert.match(norm(eight.fields[8]),/reflection/i);
  assert.deepEqual(eight.downloads.map(d=>d.file).sort(),['innovation-presentation-guide.md','innovation-rubric.txt']);
});

test('b8s5 is the only tool session and its non-AI route is a full route',()=>{
  for(const s of b.sessions)if(s.id!=='b8s5'){assert.equal(s.activity.kind==='lab',false,s.id);assert.equal(s.activity.tool,undefined,s.id);assert.equal(s.activity.privacy,undefined,s.id)}
  const a=session('b8s5').activity;
  assert.deepEqual(a.tool,{name:'DuckDuckGo AI Chat',url:'https://duck.ai',free:true});
  assert.deepEqual(a.privacy.map(norm),SAFETY.map(norm));
  assert.equal(a.steps.length,5);
  assert.equal(a.fields.length,4);
  assert.match(norm(a.fallback.steps.join(' ')),/copilot\.microsoft\.com/);
  assert.match(norm(a.fallback.steps.join(' ')),/spreadsheet|paper mock-up|written workflow/i);
  assert.ok(!/sample/i.test(a.fallback.steps.join(' ')),'the second fallback is the non-AI build, not a sample download');
  // The contract: nothing in activityReady may require the tool to have been opened.
  const answers={0:'The biggest assumption is that people would read it',1:'A one page list built in a spreadsheet',2:'The dates fall out of order when I add a row',3:'It cannot send anything to anyone yet'};
  fill('b8s5',{...answers,mode:'fallback'});
  assert.equal(context.activityReady(session('b8s5')),true,'the fallback route completes with the tool never acknowledged');
  fill('b8s5',{...answers});
  assert.equal(context.activityReady(session('b8s5')),false,'the tool route still needs the acknowledgement');
  fill('b8s5',{...answers,ack:true});
  assert.equal(context.activityReady(session('b8s5')),true);
  // Chapters 4 and 6 keep the acknowledgement gate: their fallback is a sample download, not a build route.
  for(const block of course.blocks)for(const s of block.sessions)if(s.activity.kind==='lab'&&s.id!=='b8s5'){
    fill(s.id,{...Object.fromEntries(s.activity.fields.map((_,i)=>[i,'I checked it twice'])),mode:'fallback'});
    assert.equal(context.activityReady(s),false,`${s.id} sample route still needs the acknowledgement`);
  }
  assert.ok(a.downloads.some(d=>d.file==='innovation-prototype-starters.txt'));
});

test('the six judging criteria render before the student starts, and only for Chapter 8',()=>{
  assert.ok(b.rubric,'block8 sets rubric');
  const rows=Array.isArray(b.rubric)?b.rubric.map(x=>[x[0],x.slice(1)]):Object.entries(b.rubric);
  assert.deepEqual(rows.map(r=>r[0]),['Problem','Solution choice','Prototype','Testing','Responsible AI','Presentation']);
  for(const [name,levels] of rows)assert.equal(levels.filter(x=>String(x||'').trim()).length,3,name);
  for(const other of course.blocks)if(other.id!=='block8')assert.equal(other.rubric,undefined,other.id);
  const markup=context.rubricHTML(b);
  assert.match(markup,/class="rubric-table"/);
  assert.match(markup,/Getting started/);assert.match(markup,/Getting there/);assert.match(markup,/Going further/);
  for(const [name] of rows)assert.match(markup,new RegExp(`data-criterion="${name}"`),name);
  assert.equal((markup.match(/data-criterion=/g)||[]).length,6);
  assert.match(markup,/Read them before you start, not after/);
  for(const other of course.blocks)if(other.id!=='block8')assert.equal(context.rubricHTML(other),'',other.id);
  assert.match(html,/<div id="chapterRubric" class="chapter-rubric"><\/div>/);
  assert.match(app,/renderRubric\(\);renderLabBanner\(\);renderMyths\(\);renderSessionNav\(\)/);
  assert.ok(styles.includes('.chapter-rubric{'),'the rubric container is styled');
  assert.match(styles,/@media\(max-width:620px\)\{[^}]*\.rubric-table th,\.rubric-table td/,'the rubric table shrinks on phones');
});

test('Chapter 8 is the last chapter, so the portal reports the programme complete',()=>{
  assert.equal(course.blocks.length,8);
  assert.equal(course.blocks[course.blocks.length-1].id,'block8');
  assert.match(app,/last=i===COURSE\.blocks\.length-1/);
  assert.match(app,/Badge earned: \$\{b\.badge\} ✓ · Programme complete/);
  assert.match(app,/\$\{done&&last\?'programme-complete':''\}/);
  assert.match(app,/COURSE\.blocks\.every\(b=>blockQualified\(b\)\).*class="programme-complete"/);
  assert.ok(styles.includes('.programme-complete{'),'the programme-complete banner is styled');
  assert.ok(styles.includes('.block-8{background:'),'Chapter 8 has a card colour');
});

test('the Chapter 8 capstone reviews a different pack and gates its vocabulary to block8',()=>{
  const cap=CAPSTONES.block8;
  assert.equal(cap.id,'block8-capstone');
  assert.equal(cap.title,'AI Innovator review');
  assert.equal(cap.prompts.length,3);
  assert.match(norm(cap.brief),/community centre.*noticeboard.*three testers.*"good".*residual risk of "none".*no non-AI option/is);
  assert.ok(!norm(cap.brief).includes('bike rack'),'the capstone is a different scenario from the worked example');
  // A review that concludes the non-AI option is better must be able to reach the highest level.
  const nonAI=assessChapterCapstone({blockId:'block8',answers:{
    0:'The pack shows a demo and photos of the noticeboard at the community centre, but no user need is defined, so I would reject the assistant and build the simplest non-AI option, a shared events list on one page.',
    1:'Three testers saying good is not evidence, because a structured test would have recorded the task each tester was given, where they got confused and what failed, so the change the evidence justifies is a simpler reminder.',
    2:'Red-teaming the assistant, it could hallucinate an event, be biased about which events it suggests, leak a private photo, be misused or make people over-rely on it, therefore a person stays accountable and a residual risk of none is not honest.'}});
  const withAI=assessChapterCapstone({blockId:'block8',answers:{
    0:'The pack shows a demo and photos of the noticeboard at the community centre, but the user need is never defined, so I would keep the AI assistant only if it earns its complexity against a shared events list.',
    1:'Three testers saying good is not evidence, because a structured test would have recorded the task each tester was given, where they got confused and what failed, so the change the evidence justifies is a clearer suggestion screen.',
    2:'Red-teaming the assistant, it could hallucinate an event, be biased about which events it suggests, leak a private photo, be misused or make people over-rely on it, therefore a person approves what is sent and a residual risk of none is not honest.'}});
  assert.equal(nonAI.level,'Going further');
  assert.equal(nonAI.score,withAI.score,'the non-AI recommendation is not scored lower');
  // Earlier chapters are untouched by the block8 expressions.
  const unique='User need, success criteria, red-teaming, human oversight and value proposition with residual safeguards.';
  for(const id of ['block1','block2','block3','block4','block5','block6','block7'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:unique}}).criteria.understanding,0,id);
  assert.deepEqual(assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}}).criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
});

test('the Chapter 8 project brief carries the nine portfolio deliverables',()=>{
  const p=PROJECT_BRIEFS.block8;
  assert.ok(p,'block8 project brief exists');
  assert.equal(p.id,'block8');
  assert.equal(p.title,'AI Innovation Project');
  assert.equal(p.role,'Innovation Lead');
  assert.equal(p.client,'Training centre and the community around it');
  assert.match(norm(p.objective),/responsible, testable prototype/);
  assert.match(norm(p.objective),/AI is optional/);
  assert.deepEqual(p.deliverables,PORTFOLIO);
  assert.equal(p.acceptanceCriteria.length,6);
  assert.match(norm(p.acceptanceCriteria.join(' ')),/at least one of which does not use AI/);
  assert.match(norm(p.acceptanceCriteria.join(' ')),/before you build/);
  assert.ok(p.prompts.recommendation.length>=60);
  // Nine deliverables plus six imported lab stages stay inside the existing evidence cap.
  const api=read('functions/api/[[path]].js');
  const cap=Number(api.match(/evidence:Array\.isArray\(raw\.evidence\)\?raw\.evidence\.slice\(0,(\d+)\)/)[1]);
  assert.ok(cap>=PORTFOLIO.length+6,`evidence cap ${cap} holds nine deliverables and six imported stages`);
});

test('the server gates Chapter 8 behind Chapter 7',()=>{
  const api=read('functions/api/[[path]].js');
  assert.ok(api.includes("block8:['b8s1','b8s2','b8s3','b8s4','b8s5','b8s6','b8s7','b8s8']"));
  assert.match(api,/const blockOrder=Object\.keys\(requiredSessions\)/);
  const server=vm.createContext({});
  vm.runInContext(api.match(/^const requiredSessions=.*$/m)[0]+'\nglobalThis.sessions=requiredSessions;',server);
  assert.deepEqual(Object.keys(server.sessions).slice(-2),['block7','block8']);
});

test('the chapter downloads exist, and no student file hands over an answer',()=>{
  for(const file of DOWNLOADS)assert.ok(exists(`public/datasets/${file}`),file);
  assert.ok(exists('docs/teacher/innovation-project.KEY.txt'),'teacher key exists');
  assert.ok(!exists('public/datasets/innovation-project.KEY.txt'),'the teacher key is never published');
  assert.equal(read('public/datasets/innovation-peer-test-sheet.csv').split('\n')[0].trim(),'tester,task_given,what_worked,where_confused,what_failed,unexpected');
  assert.equal(read('public/datasets/innovation-risk-register.csv').split('\n')[0].trim(),'change_or_risk,evidence_or_attack,safeguard,what_remains');
  const canvas=read('public/datasets/innovation-project-canvas.md');
  assert.ok(!/bike rack/i.test(canvas),'the canvas ships blank, with no worked example');
  for(const file of DOWNLOADS){
    const text=read(`public/datasets/${file}`);
    assert.ok(!/noticeboard|community centre/i.test(text),`${file} leaks the capstone scenario`);
  }
  const starting=read('public/datasets/innovation-problem-cards.txt');
  assert.match(norm(starting),/A non-AI solution, because your team concluded AI adds no real value here/);
  for(const word of ['real','understandable','useful','testable','safe'])assert.ok(new RegExp(`\\b${word}\\b`,'i').test(starting),word);
});
