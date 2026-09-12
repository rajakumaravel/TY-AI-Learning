import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS, projectReadyForSubmission } from '../lib/project-briefs.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const course=JSON.parse(read('curriculum.json')),b=course.blocks.find(b=>b.id==='block6');
const contract=read('docs/product/phase-7-contract.md'),app=read('app.js');
const session=id=>b.sessions.find(s=>s.id===id);
const ids=['b6s1','b6s2','b6s3','b6s4','b6s5','b6s6','b6s7','b6s8'];
const toolIds=['b6s1','b6s2','b6s4','b6s6'];
const stages=['Preserve','Profile','Define rules','Clean','Validate','Analyse','AI assist','Human review'];
const files=['tutor-cards.txt','workplace-brief.txt','event-budget-raw.csv','data-dictionary.csv','cleaning-log.csv','validation-checklist.csv','human-review-checklist.csv','sample-outputs.txt','briefing-template.md','disclosure-cards.txt','learning-contract.md'].map(f=>'ai-work-'+f);
const teacher='docs/teacher/ai-work-event-budget.KEY.txt';
const key=read(teacher);
const lineFunction=(source,name)=>{const m=source.match(new RegExp(`^function ${name}\\(.*$`,'m'));assert.ok(m,name);return m[0]};
const state={activity:{}};
const context=vm.createContext({state,COURSE:course});
vm.runInContext(app.match(/^const esc=.*$/m)[0],context);
for(const name of ['activityReady','safetyHTML','parseCSV','datasetSummary','datasetHTML'])vm.runInContext(lineFunction(app,name),context);
vm.runInContext(app.slice(app.indexOf('function activityBodyHTML('),app.indexOf('function labEvidenceHTML(')),context);
const workspace=read('project-workspace.js');
for(const name of ['summariseActivity','labEvidenceItems'])vm.runInContext(lineFunction(workspace,name),context);
const plain=v=>JSON.parse(JSON.stringify(v));
// Read only the inert Chapter 6 acceptance fixtures; never import live auth helpers or run acceptance here.
const acceptance=read('tests/acceptance/lib.mjs');
vm.runInContext(acceptance.slice(acceptance.indexOf('export const CHAPTER6_SESSIONS'),acceptance.indexOf('// Real clicks and typing for all eight sessions')).replaceAll('export const ','var '),context);
const {CHAPTER6_FIELDS:answers,CHAPTER6_DISCLOSURE:disclosures,CAPSTONE6_ANSWERS:capAnswers}=context;

test('Chapter 6 metadata and verbatim book fields match the binding contract',()=>{
  assert.ok(b);assert.equal(b.number,'06');assert.equal(b.title,'AI for Learning & Work');assert.equal(b.duration,'3 hours');assert.equal(b.badge,'Digital Collaborator');assert.deepEqual(b.outcomes,['LO7']);
  for(const name of ['description','mission','route','final','myths','selfCheck','levelUp']){
    const line=contract.split('\n').find(l=>l.startsWith(name+':')||l.startsWith(name+' ('));
    assert.deepEqual(b[name],JSON.parse(line.slice(line.indexOf(': ')+2)),name);
  }
  assert.deepEqual(b.sessions.map(s=>s.id),ids);
  assert.deepEqual(b.sessions.map(s=>s.title),b.route.map(r=>r[1]));
  assert.deepEqual(b.sessions.map(s=>s.minutes),[20,30,20,30,25,25,20,10]);
  assert.equal(b.sessions.reduce((sum,s)=>sum+s.minutes,0),180);
  assert.deepEqual(b.sessions.map(s=>s.type),['PREDICT + TEST','TRY + LEARN','TEST + REFLECT','MAKE + INVESTIGATE','TEST + IMPROVE','MAKE + IMPROVE','QUESTION','REFLECT + EVIDENCE']);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['lab','lab','textfields','lab','textfields','lab','chain','textfields']);
  assert.deepEqual(b.sessions.map(s=>s.activity.fields?.length||0),[4,4,3,7,4,4,0,3]);
  assert.equal(b.lab.title,'AI-assisted Workplace Task');
  assert.deepEqual(b.lab.stages.map(r=>r.slice(0,2)),[['DO','b6s2'],['TEST','b6s3'],['MAKE','b6s4'],['BREAK','b6s5'],['IMPROVE','b6s6'],['PROVE','b6s8']]);
  const words=b.sessions.flatMap(s=>s.study.keywords);
  for(const word of ['AI tutor','scaffolding','metacognition','drafting','critique','workflow','human-in-the-loop','disclosure','authorship','digital productivity'])assert.ok(words.includes(word),word);
  for(const s of b.sessions){assert.equal(s.pageRef,'Student Book pp. 28–31');assert.ok(s.intro&&s.activity.title&&s.activity.instructions&&s.reflection);assert.equal(s.study.body.length,3);assert.ok(s.study.title&&s.study.example&&s.study.keywords.length>=3);assert.doesNotMatch(s.study.example,/249|35\.57|€300/)}
  const reflections={b6s3:"What did you understand today that you couldn't explain before?",b6s5:'Which part of this work are you personally accountable for?',b6s6:'Which AI suggestion did you reject, and why?',b6s7:'Would you be comfortable explaining your AI use to the training centre or an employer?',b6s8:'Where in your workflow must a person stop, check or approve before the next step, and why?'};
  for(const [id,value] of Object.entries(reflections))assert.equal(session(id).reflection,value);
});

test('four AI sessions each repeat the exact notices, tool route and both fallbacks',()=>{
  const safety=[
    'Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them.',
    'No accounts. DuckDuckGo AI Chat works without signing in; if a tool asks you to sign in, stop and use the fallback.',
    'The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked.',
    'Nothing typed into this portal is sent to the tool; copy across yourself and paste short extracts back here.'
  ];
  assert.deepEqual(b.sessions.filter(s=>s.activity.tool).map(s=>s.id),toolIds);
  for(const id of toolIds){const a=session(id).activity;assert.deepEqual(a.tool,{name:'DuckDuckGo AI Chat',url:'https://duck.ai',free:true});assert.deepEqual(a.privacy,safety);assert.equal(a.fallback.title,'Tool blocked?');assert.match(a.fallback.steps.join(' '),/copilot\.microsoft\.com without signing in/);assert.match(a.fallback.steps.join(' '),new RegExp(`${id} sample in ai-work-sample-outputs.txt`));assert.match(a.fallback.steps.join(' '),/account, payment or an unavailable feature/);assert.ok(a.downloads.some(d=>d.file==='ai-work-sample-outputs.txt'));}
  for(const id of ['b6s3','b6s5','b6s7','b6s8'])assert.equal(session(id).activity.tool,undefined);
  assert.match(session('b6s3').activity.instructions,/Close the AI tool and hide the saved conversation first/);
  assert.match(session('b6s3').activity.instructions,/no improvement.*honestly.*prompt/);
  assert.match(session('b6s2').activity.instructions,/attempt each before reading the next turn/);
});

test('all eight workflow steps are visible and assessable across b6s4 and b6s5',()=>{
  const a=session('b6s4').activity,review=session('b6s5').activity;
  assert.equal(a.title,'Workplace workflow: clean a messy event budget');assert.equal(a.file,'ai-work-event-budget-raw.csv');
  assert.deepEqual(a.steps.map(s=>s.split(' — ')[0]),stages);
  assert.match(a.steps[7],/b6s5.*every numerical claim.*sign off/);
  assert.deepEqual(a.fields.map(f=>f.split(':')[0]),stages.slice(0,7));
  assert.ok(session('b6s4').study.body.includes('Never silently change the data. If a change cannot be justified, flag the value rather than inventing a correction.'));
  for(const pattern of [/LibreOffice Calc/,/raw, working, profile, rules, cleaning log, validation and analysis sheets/,/flag-only/,/not your personal name/,/not a spreadsheet editor/,/filename alone is not assessable/])assert.match(a.instructions,pattern);
  for(const pattern of [/every numerical and factual claim/,/at least one line by hand/,/formula ranges and excluded records/,/no error.*also check/,/human approval/])assert.match(review.instructions,pattern);
  const expected=[['ai-work-tutor-cards.txt','ai-work-sample-outputs.txt'],['ai-work-tutor-cards.txt','ai-work-sample-outputs.txt'],[],['ai-work-event-budget-raw.csv','ai-work-workplace-brief.txt','ai-work-data-dictionary.csv','ai-work-cleaning-log.csv','ai-work-validation-checklist.csv','ai-work-sample-outputs.txt'],['ai-work-human-review-checklist.csv','verification-log-A2.csv','ai-work-briefing-template.md','ai-work-sample-outputs.txt'],['ai-work-workplace-brief.txt','ai-work-briefing-template.md','ai-work-sample-outputs.txt'],['ai-work-disclosure-cards.txt'],['ai-work-learning-contract.md']];
  b.sessions.forEach((s,i)=>assert.deepEqual((s.activity.downloads||[]).map(d=>d.file),expected[i]));
  assert.equal(session('b6s7').activity.rows,5);assert.equal(session('b6s7').activity.minRows,5);
  assert.deepEqual(session('b6s7').activity.columns,[['scenario','Scenario'],['decision','Disclose / no disclosure needed / check expectations first'],['reason','Why: audience, expectations and authorship'],['wording','What I would say, or why no disclosure is needed']]);
  assert.equal(session('b6s7').activity.head,'SCENARIO → DISCLOSURE CHOICE → REASON → WORDING');
  assert.match(session('b6s7').activity.instructions,/reasonable disagreement/);
  assert.match(session('b6s8').activity.instructions,/specific enough.*repeatable sequence.*verifies, decides or approves/);
});

test('real reused renderers expose raw viewer, steps, fields, fallback and acknowledgement',()=>{
  for(const sid of toolIds){
    const s=session(sid);state.activity[sid]={};let html=context.activityBodyHTML(s);
    assert.match(html,/class="lab"/);assert.match(html,/data-ack/);assert.match(html,/aria-disabled="true"/);assert.match(html,/id="labFallback"[^>]*hidden/);
    assert.equal((html.match(/<textarea data-i=/g)||[]).length,s.activity.fields.length);
    assert.match(html,/class="steps"/);assert.ok(html.includes(vm.runInContext('esc',context)(s.activity.steps[0])));
    state.activity[sid]={mode:'fallback'};html=context.activityBodyHTML(s);assert.match(html,/id="labFallback" class="lab-fallback" >/);assert.match(html,/aria-disabled="true"/);
    state.activity[sid].ack=true;html=context.activityBodyHTML(s);assert.match(html,/data-ack checked/);assert.match(html,/aria-disabled="false"/);
  }
  assert.match(context.activityBodyHTML(session('b6s4')),/data-dataset="ai-work-event-budget-raw.csv" data-readonly/);
  const raw=context.parseCSV(read('public/datasets/ai-work-event-budget-raw.csv'));
  const html=context.datasetHTML(session('b6s4'),raw,true);
  assert.match(html,/dataset-summary/);assert.match(html,/dataset-table/);assert.match(html,/All 12 rows · 5 columns/);assert.match(html,/>materials <\/td>/);assert.doesNotMatch(html,/data-finding-form|datasetAdd/);
  assert.ok(read('styles.css').includes('.block-6{background:'));
});

test('incomplete answers fail; samples require acknowledgement; short chain decisions pass',()=>{
  for(const s of b.sessions.filter(s=>s.activity.kind!=='chain')){
    state.activity[s.id]={};assert.equal(context.activityReady(s),false,s.id);
    state.activity[s.id]=Object.fromEntries(answers[s.id].map((v,i)=>[i,v]));
    if(s.activity.kind==='lab'){state.activity[s.id].mode='fallback';assert.equal(context.activityReady(s),false,`${s.id} sample still needs ack`);state.activity[s.id].ack=true}
    assert.equal(context.activityReady(s),true,s.id);
    for(let i=0;i<s.activity.fields.length;i++){const previous=state.activity[s.id][i];state.activity[s.id][i]='too short';assert.equal(context.activityReady(s),false,`${s.id} field ${i}`);state.activity[s.id][i]=previous}
  }
  const chain=session('b6s7');const rows=Object.fromEntries(disclosures.map((r,i)=>[i,Object.fromEntries(chain.activity.columns.map(([k],j)=>[k,r[j]]))]));
  state.activity.b6s7=rows;assert.equal(rows[0].decision,'no');assert.equal(context.activityReady(chain),true);
  delete rows[4];assert.equal(context.activityReady(chain),false);rows[4]={scenario:'creative',decision:'no',reason:' ',wording:'private'};assert.equal(context.activityReady(chain),false);
  const admin=read('admin.js');assert.match(admin,/activity\.kind === "lab"/);assert.match(admin,/Chain row/);
});

test('raw CSV exactly preserves the contract fixture and independent reference calculation',()=>{
  const rawText=read('public/datasets/ai-work-event-budget-raw.csv');
  assert.equal(rawText,contract.split('```csv\n')[1].split('```')[0]);
  const raw=plain(context.parseCSV(rawText));assert.deepEqual(raw.columns,['item_id','category','item','quantity','unit_cost_eur']);assert.equal(raw.rows.length,12);assert.ok(raw.rows.every(r=>r.length===5));
  assert.equal(raw.rows[1][1],'materials ');assert.equal(raw.rows[8][3],'');assert.equal(raw.rows[9][3],'-1');assert.equal(raw.rows[3][4],'€1.50');assert.deepEqual(raw.rows[10],raw.rows[2]);assert.equal(raw.rows[11][3],'20');
  const snapshot=JSON.stringify(raw.rows),seen=new Set(),removed=[];
  const retained=raw.rows.map((r,i)=>({r:[...r],source:i+1})).filter(x=>{const sig=JSON.stringify(x.r);if(seen.has(sig)){removed.push(x.source);return false}seen.add(sig);return true});
  const conflicts=retained.filter(x=>retained.some(y=>x.source!==y.source&&x.r[0]===y.r[0]));assert.deepEqual(conflicts.map(x=>x.source),[7,12]);assert.deepEqual(removed,[11]);
  const held=retained.filter(x=>conflicts.includes(x)||!/^\d+$/.test(x.r[3])||Number(x.r[3])<1||Number(x.r[3])>100);assert.deepEqual(held.map(x=>x.source),[7,9,10,12]);
  const eligible=retained.filter(x=>!held.includes(x));assert.deepEqual(eligible.map(x=>x.source),[1,2,3,4,5,6,8]);
  const totals={Venue:0,Materials:0,Catering:0,Transport:0};let normalisations=0,currency=0;
  for(const x of retained){const before=x.r[1];x.r[1]=({materials:'Materials',transport:'Transport',Vneue:'Venue'})[before.trim()]||before.trim();if(x.r[1]!==before)normalisations++;if(x.r[4].startsWith('€')){currency++;x.r[4]=x.r[4].slice(1)}}
  assert.equal(normalisations,3);assert.equal(currency,1);
  for(const x of eligible)totals[x.r[1]]+=Number(x.r[3])*Number(x.r[4]);
  assert.deepEqual(totals,{Venue:100,Materials:35,Catering:54,Transport:60});const subtotal=Object.values(totals).reduce((a,b)=>a+b,0);assert.equal(subtotal.toFixed(2),'249.00');assert.equal((subtotal/eligible.length).toFixed(2),'35.57');
  assert.equal(JSON.stringify(raw.rows),snapshot,'working-copy transformations preserve raw');assert.equal(held.find(x=>x.source===9).r[3],'');assert.equal(held.find(x=>x.source===10).r[3],'-1');
  for(const re of [/12 rows, 5 fields, 1 blank cell, 1 surplus exact-duplicate row, 2 repeated-ID groups of which 1 is conflicting, 1 invalid quantity, 3 category-normalisation cells and 1 currency-format cell/,/11 retained rows/,/7, 9, 10, 12/,/1, 2, 3, 4, 5, 6, 8/,/249\.00/,/35\.57/,/SUM\(/,/COUNTIF\(/,/SUMIF\(/,/Do not claim zero outstanding issues/])assert.match(key,re);
});

test('downloads and templates are complete, unfilled and never expose the teacher answer',()=>{
  const manifest=JSON.parse(read('public/datasets/manifest.json'));
  for(const f of files){assert.ok(fs.existsSync(`public/datasets/${f}`));assert.equal(manifest[f],fs.statSync(`public/datasets/${f}`).size);const text=read(`public/datasets/${f}`);assert.doesNotMatch(text,/249(?:\.00)?|35\.57|TEACHER KEY|\[(?:SUPPORTED|UNCERTAIN|WRONG|ACCEPTED|REJECTED)\]/,f)}
  for(const s of b.sessions)for(const d of s.activity.downloads||[]){assert.ok(d.label&&d.note);assert.ok(fs.existsSync(`public/datasets/${d.file}`));assert.doesNotMatch(d.file,/KEY/)}
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  assert.deepEqual(walk('public').filter(f=>/KEY/i.test(f)),[]);
  const csv=f=>plain(context.parseCSV(read(`public/datasets/ai-work-${f}.csv`)));
  assert.deepEqual(csv('data-dictionary').columns,['field','meaning','type','unit','allowed_values_or_range','missing_or_conflict_rule','source']);assert.equal(csv('data-dictionary').rows.length,5);assert.ok(csv('data-dictionary').rows.every(r=>r.slice(1).every(v=>v==='')));
  assert.deepEqual(csv('cleaning-log').columns,['Row / field','Original','Issue','Action','Reason','Verified by']);assert.ok(csv('cleaning-log').rows.every(r=>r.every(v=>v==='')));
  assert.deepEqual(csv('validation-checklist').columns,['check','before','after','evidence_or_formula','unresolved_action']);assert.ok(csv('validation-checklist').rows.every(r=>r.slice(1).every(v=>v==='')));
  assert.deepEqual(csv('human-review-checklist').columns,['claim','spreadsheet_cell_or_source','formula_or_independent_check','verdict','change_or_removal','human_sign_off']);assert.ok(csv('human-review-checklist').rows.every(r=>r.every(v=>v==='')));
  const samples=read('public/datasets/ai-work-sample-outputs.txt');assert.match(samples,/^SYNTHETIC SAMPLES/);
  for(const id of toolIds)assert.match(samples,new RegExp(`=== ${id}:`));
  for(const re of [/Eligible line costs total €300\./,/Attendance will rise by 20%\./,/Recorded venue costs are €100\./,/STUDENT-ATTEMPT PAUSE/,/figures are complete and ready for approval/])assert.match(samples,re);
  assert.match(key,/\[WRONG\] Eligible line costs total €300/);assert.match(key,/\[UNCERTAIN\] Attendance will rise by 20%.*Unsupported prediction/);assert.match(key,/\[REJECTED\] The figures are complete.*caveat/);
  assert.doesNotMatch(read('public/datasets/ai-work-learning-contract.md'),/Appendix|Sheet A\d/);
});

test('Chapter 6 generation is repeatable and matches the checked-in downloads and teacher key',()=>{
  const src=read('scripts/generate-datasets.mjs');const part=src.slice(src.indexOf('// ---------- Chapter 6:'),src.indexOf('rmSync(WORK, { recursive: true, force: true });\nconst manifest'));
  assert.ok(part.length>10000);const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-work-generation-'));
  const run=()=>{const output=new Map();const sandbox={OUT:'public/datasets',join:path.join,writeFileSync:(name,value)=>{const target=path.join(temp,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);output.set(name,fs.readFileSync(target))}};vm.runInNewContext(part,sandbox);return output};
  try{const first=run(),second=run();assert.equal(first.size,files.length+1);for(const [name,bytes] of first){assert.deepEqual(second.get(name),bytes,name);assert.deepEqual(fs.readFileSync(name),bytes,`${name} committed content`)}}finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('Chapter 6 project and server gate use existing progression and imported evidence shapes',()=>{
  const api=read('functions/api/[[path]].js');assert.ok(api.includes("block6:['b6s1','b6s2','b6s3','b6s4','b6s5','b6s6','b6s7','b6s8']"));assert.match(api,/const blockOrder=Object\.keys\(requiredSessions\)/);
  const brief=PROJECT_BRIEFS.block6;assert.equal(brief.title,'AI-assisted Workplace Briefing');assert.equal(brief.role,'Junior Operations Assistant');assert.equal(brief.client,'Training centre events team');assert.equal(brief.objective,b.mission);
  assert.deepEqual(brief.deliverables,['AI tutor prompt and learning note','Spreadsheet, document or presentation','Data Cleaning Log and validation evidence','Filled human-review checklist','Professional briefing and editing decisions','Disclosure choices','AI-use learning contract','Final recommendation']);
  for(const re of [/tutor prompt/,/claim checks/,/responsibility/,/repeatable workflow/,/human checkpoints/,/rejected AI suggestions/,/disclosure/i])assert.match(brief.acceptanceCriteria.join(' '),re);
  const activity=Object.fromEntries(Object.entries(answers).map(([sid,fields])=>[sid,Object.fromEntries(fields.map((v,i)=>[i,v]))]));
  const evidence=plain(context.labEvidenceItems({activity},'block6'));assert.equal(evidence.length,6);assert.ok(evidence.every(e=>e.note.length<=4000));
  assert.match(evidence.find(e=>/Workplace workflow/.test(e.label)).note,/Row \/ field.*11 retained.*249\.00/s);
  assert.match(evidence.find(e=>/Human review/.test(e.label)).note,/Removed attendance.*events lead/s);
  const values=Object.fromEntries(disclosures.map((row,i)=>[i,Object.fromEntries(session('b6s7').activity.columns.map(([k],j)=>[k,row[j]]))]));
  const disclosure=context.summariseActivity(session('b6s7'),values);assert.match(disclosure,/Private brainstorming → no →/);
  evidence.push({label:'Disclosure choices',url:'',note:disclosure});
  assert.equal(projectReadyForSubmission({workLog:[{did:'Preserved and cleaned the raw budget with an auditable log.',result:'Seven eligible lines; four held records.'}],evidence,finalRecommendation:context.CHAPTER6_RECOMMENDATION}),true);
});

test('Chapter 6 capstone rewards feedback-specific evidence and gates vocabulary to block6',()=>{
  const cap=CAPSTONES.block6;assert.equal(cap.id,'block6-capstone');assert.equal(cap.title,'Digital Collaborator review');assert.equal(cap.prompts.length,3);
  for(const re of [/placement team/,/12 returned forms/,/one exact duplicate/,/two unanswered rating cells/,/every attendee was satisfied/,/next workshop will be more popular/])assert.match(cap.brief,re);
  const score=assessChapterCapstone({blockId:'block6',answers:capAnswers});assert.equal(score.score,8);assert.equal(score.criteria.evidence,2);
  for(const text of ['Because my result is an example of a benefit, I check the data and explain the risk.','My eligible event budget is €249.00, Venue €100.00, Materials €35.00, Catering €54.00 and Transport €60.00, mean €35.57.'])assert.equal(assessChapterCapstone({blockId:'block6',answers:{q1:text}}).criteria.evidence,0);
  const unique='Scaffolding and metacognition support authorship and productivity.';
  assert.equal(assessChapterCapstone({blockId:'block6',answers:{q1:unique}}).criteria.understanding,1);
  for(const blockId of ['block1','block2','block3','block4','block5'])assert.equal(assessChapterCapstone({blockId,answers:{q1:unique}}).criteria.understanding,0,blockId);
  assert.deepEqual(assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}}).criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
  assert.equal(assessChapterCapstone({blockId:'block5',answers:{q1:'Provenance and lateral reading show the proxy entered at deployment; the automation bias is a lifecycle problem.'}}).criteria.understanding,1);
});
