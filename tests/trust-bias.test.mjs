import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Phase 6: Chapter 5 Trust, Bias & Misinformation, Student Book pp. 23–27 (docs/product/phase-6-contract.md).
// Files owned by other Phase 6 agents are read lazily so a missing or stale file fails only its own case.
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const course=()=>JSON.parse(read('curriculum.json'));
const block5=()=>{const b=course().blocks.find(b=>b.id==='block5');assert.ok(b,'curriculum.json has block5');return b};
const session=id=>{const s=block5().sessions.find(s=>s.id===id);assert.ok(s,`block5 has ${id}`);return s};
// Book quotations are compared with straight quotes and single spaces so PDF line breaks and curly punctuation do not matter.
const norm=s=>String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
// The page's own one-line helpers, executed as written so the test runs the real model and the real sentence split.
const fn=name=>{const app=read('app.js');const m=app.match(new RegExp(`^function ${name}\\(.*$`,'m'));assert.ok(m,`app.js defines ${name}`);return new Function(`${m[0]};return ${name}`)()};
const SESSION_IDS=['b5s1','b5s2','b5s3','b5s4','b5s5','b5s6','b5s7','b5s8','b5s9'];
const KEY_WORDS=['misinformation','disinformation','hallucination','bias','selection bias','representation bias','framing','automation bias','synthetic media','provenance','lateral reading'];
const ROUTE=['The confidence trap','Discover: the trust checklist','AI News Detective','Lateral verification','Bias stations','Improve the output','Synthetic media','Reflection'];
const HABITS=['Stop','Investigate the source','Find better coverage','Trace the claim'];
const MARK_TYPES=['Factual claim','Emotional framing','Missing source','Unsupported certainty'];
const DATASETS=['claim-cards.txt','news-detective-article.txt','annotation-sheet.csv','bias-station-cards.txt','bias-simulator-worksheet.csv','corrected-version-template.md','synthetic-media-checklist.txt','verification-log-A2.csv'];

test('block5 chapter shape follows the Student Book',()=>{
  const b=block5();
  assert.equal(b.number,'05');
  assert.equal(b.title,'Trust, Bias & Misinformation');
  assert.equal(b.badge,'AI Investigator');
  assert.equal(b.duration,'3 hours');
  assert.deepEqual(b.outcomes,['LO4','LO6','LO9']);
  assert.match(norm(b.description),/Fluent is not the same as true\./);
  assert.match(norm(b.description),/trustworthy\.$/);
  assert.equal(norm(b.mission),'Investigate one AI-generated article or set of claims. Produce an evidence table, identify at least one bias risk, and publish a corrected version with the uncertain parts clearly marked.');
  assert.equal(norm(b.final),'Your annotated AI output, your verification table (Sheet A2), your bias analysis from the stations and the simulator, your corrected version, and your personal three-step trust rule.');
  const labels=b.route.map(r=>norm(r[1]));
  let at=0;for(const l of ROUTE){const i=labels.indexOf(l,at);assert.ok(i>=0,`route label "${l}" in book order`);at=i+1}
  assert.deepEqual(b.sessions.map(s=>s.id),SESSION_IDS);
  assert.deepEqual(b.sessions.map(s=>s.minutes),[15,20,30,30,20,20,25,10,10]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),180);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['chain','quiz','annotate','chain','simulator','chain','textfields','textfields','textfields']);
  assert.equal(b.lab.title,'Create, detect and reduce bias');
  assert.deepEqual(b.lab.stages.map(x=>[x[0],x[1]]),[['DO','b5s3'],['TEST','b5s1'],['MAKE','b5s5'],['BREAK','b5s6'],['IMPROVE','b5s7'],['PROVE','b5s4']]);
  for(const s of b.sessions){
    assert.equal(s.pageRef,'Student Book pp. 23–27',`${s.id} pageRef`);
    assert.ok(s.intro&&s.reflection&&s.activity?.title&&s.activity?.instructions,`${s.id} text`);
    assert.ok(s.study?.title&&s.study.body.length===3&&s.study.example&&s.study.keywords.length>=1,`${s.id} study`);
  }
  const sift=norm(session('b5s2').study.body.join(' '));
  for(const h of HABITS)assert.ok(sift.includes(h),`b5s2 study names the habit "${h}"`);
  const lifecycle=norm(session('b5s5').study.body.join(' '));
  for(const n of [/18(?:\/| out of )20/,/11(?:\/| out of )20/,/72\.5%/])assert.match(lifecycle,n,`b5s5 study carries ${n}`);
  for(const re of [/before/i,/collect/i,/label/i,/proxy/i,/training/i,/evaluat/i,/deploy/i,/trust/i])assert.match(lifecycle,re,`b5s5 lifecycle stage ${re}`);
  assert.equal(norm(session('b5s1').reflection),'What would change your mind about this claim?');
  assert.equal(norm(session('b5s4').reflection),'Is this source independent of the original claim, or just repeating it?');
  assert.equal(norm(session('b5s3').reflection),"What's missing from the framing? What's not being said?");
  assert.equal(norm(session('b5s7').reflection),'Could a statement be accurate and still be misleading?');
  assert.equal(norm(session('b5s9').reflection),'Which step of your rule would you be most tempted to skip when you are in a hurry, and why?');
  assert.match(session('b5s9').type,/REFLECT/);assert.match(session('b5s9').type,/EVIDENCE/);
});

test('every Student Book key word appears in the chapter study keywords',()=>{
  const all=block5().sessions.flatMap(s=>s.study.keywords).map(k=>norm(k).toLowerCase());
  for(const w of KEY_WORDS)assert.ok(all.some(k=>k.includes(w.toLowerCase())),`key word "${w}"`);
  assert.ok(all.some(k=>/deepfake/.test(k)),'key word "deepfake"');
});

test('block5 carries the book myth-busters, self-check and level-up',()=>{
  const b=block5();
  assert.equal(b.myths.length,3);
  for(const m of b.myths)assert.ok(Array.isArray(m)&&m.length===2&&m[0]&&m[1],'myth pair');
  assert.deepEqual(b.myths.map(m=>norm(m[0])),['Bias means the model has opinions.',"Fake information looks unprofessional, so it's easy to spot.",'Lots of websites say it, so lots of sources confirm it.']);
  assert.deepEqual(b.myths.map(m=>norm(m[1])),["Models don't have opinions. Bias is a skew in the data, the design or the use. It can exist with nobody meaning it.",'Generative AI produces polished, well-formatted, confident text and images on demand. Looking professional now costs nothing.','Ten sites copying one original claim is one source, not ten. Trace it back.']);
  assert.deepEqual(Object.keys(b.selfCheck),['Getting started','Getting there','Going further']);
  assert.deepEqual(b.selfCheck['Getting started'].map(norm),['I can spot unsupported claims or possible bias, with prompts']);
  assert.deepEqual(b.selfCheck['Getting there'].map(norm),['I use independent sources to verify claims','I can improve misleading content']);
  assert.deepEqual(b.selfCheck['Going further'].map(norm),['I trace evidence back to its origin','I can tell different kinds of bias apart',"I can explain what's still uncertain after checking"]);
  assert.equal(norm(b.levelUp),'Take one claim that\'s repeated widely online. Trace it back towards its earliest available source. Show where along the way context was lost or changed.');
});

test('no session opens an AI tool: no lab kind, no tool, no safety notes, no chatbot link',()=>{
  const b=block5();
  assert.ok(Array.isArray(b.lab?.stages)&&b.lab.stages.length===6,'the block keeps a six-stage Experience Lab field');
  for(const s of b.sessions){
    assert.notEqual(s.activity.kind,'lab',`${s.id} is not a lab`);
    assert.equal(s.activity.tool,undefined,`${s.id} names no tool`);
    assert.equal(s.activity.privacy,undefined,`${s.id} renders no safety notes`);
  }
  const json=JSON.stringify(b);
  for(const host of ['duck.ai','chatgpt.com','chat.openai.com','claude.ai','gemini.google.com','copilot.microsoft.com'])assert.ok(!json.includes(host),`${host} not linked`);
  assert.ok(norm(session('b5s4').activity.instructions).includes("Do not fact-check by asking another chatbot. That's just asking a second pattern-predictor."),'b5s4 quotes the book rule verbatim');
  assert.match(session('b5s4').activity.instructions,/new tab/i);
});

test('block5 sessions carry the contracted activities',()=>{
  const trap=session('b5s1').activity;
  assert.deepEqual(trap.columns,[['statement','Statement (copy the card)'],['before','My confidence before checking (1–5)'],['verdict','After checking: true / false / can\'t be verified'],['fooled','What fooled me, or what tipped me off']]);
  assert.equal(trap.rows,3);assert.equal(trap.minRows,3);
  assert.equal(trap.head,'STATEMENT → CONFIDENCE BEFORE → VERDICT → WHY');
  assert.ok(trap.downloads.some(d=>d.file==='claim-cards.txt'));
  for(const re of [/Transition Year was introduced in Irish schools in 1974/,/River Shannon is the longest river in Europe/,/AI tutor than from a teacher/])assert.match(trap.instructions,re,`b5s1 repeats the card ${re}`);
  const quiz=session('b5s2').activity;
  assert.equal(quiz.title,'Which habit comes first?');
  assert.equal(quiz.items.length,8);
  assert.deepEqual(quiz.options,HABITS);
  for(const it of quiz.items)assert.ok(quiz.options.includes(it[1]),`quiz answer "${it[1]}" is an option`);
  const an=session('b5s3').activity;
  assert.equal(an.kind,'annotate');
  assert.equal(an.title,'AI News Detective');
  assert.equal(an.file,'news-detective-article.txt');
  assert.deepEqual(an.markTypes,MARK_TYPES);
  assert.equal(an.minMarks,6);
  assert.deepEqual(an.requiredMarks,['Factual claim','Unsupported certainty']);
  for(const f of ['news-detective-article.txt','annotation-sheet.csv'])assert.ok(an.downloads.some(d=>d.file===f),`b5s3 download ${f}`);
  assert.match(an.instructions,/Chapter 4 tool/);
  const verify=session('b5s4').activity;
  assert.deepEqual(verify.columns,[['claim','Claim from the article'],['source','Independent source I found (name and where)'],['independent','Independent of the original, or repeating it?'],['verdict','Supported / uncertain / wrong']]);
  assert.equal(verify.rows,5);assert.equal(verify.minRows,3);
  assert.equal(verify.head,'CLAIM → SOURCE → INDEPENDENT? → VERDICT');
  for(const f of ['news-detective-article.txt','verification-log-A2.csv'])assert.ok(verify.downloads.some(d=>d.file===f),`b5s4 download ${f}`);
  const sim=session('b5s5').activity;
  assert.equal(sim.kind,'simulator');
  assert.equal(sim.title,'Bias simulator: a shortlisting model');
  assert.match(sim.scenario,/^A model shortlists applicants for a training-centre placement\./);
  assert.deepEqual(sim.controls,[['shareB','Share of Group B in the training data (%)',5,50,5,10],['proxy','How strongly a proxy feature (postcode) stands in for the group (%)',0,100,10,80]]);
  assert.deepEqual(sim.toggle,['removed','Remove the sensitive field from the model']);
  assert.equal(sim.minRuns,2);
  assert.deepEqual(sim.fields.map(f=>f[0]),['changed','entered','affected']);
  assert.ok(sim.downloads.some(d=>d.file==='bias-simulator-worksheet.csv'));
  const st=session('b5s6').activity;
  assert.deepEqual(st.columns,[['station','Station'],['enters','Where could bias enter (the data? the design? how people use it?)'],['affected','Who would be affected'],['kind','Which kind of bias (selection, representation, framing, automation, proxy)']]);
  assert.equal(st.rows,4);assert.equal(st.minRows,4);
  assert.equal(st.head,'HIRING · IMAGES · DISCIPLINE · FEEDS');
  assert.ok(st.downloads.some(d=>d.file==='bias-station-cards.txt'));
  const fix=session('b5s7').activity;
  assert.equal(fix.fields.length,3);
  assert.match(fix.fields.join(' '),/corrected version.*verified claims.*uncertain.*real sources.*took out.*less exciting and more trustworthy/is);
  assert.deepEqual(fix.minLengths,[120,20,20],'b5s7 ready rule: first field >= 120, others >= 20 (activity.minLengths)');
  for(const f of ['news-detective-article.txt','corrected-version-template.md'])assert.ok(fix.downloads.some(d=>d.file===f),`b5s7 download ${f}`);
  const media=session('b5s8').activity;
  assert.equal(media.fields.length,2);
  assert.match(media.fields.join(' '),/clip that made you angry.*provenance.*other coverage.*who gains.*seeing is believing/is);
  assert.deepEqual(media.minLengths,[20,20],'b5s8 ready rule: each >= 20 (activity.minLengths)');
  assert.ok(media.downloads.some(d=>d.file==='synthetic-media-checklist.txt'));
  const rule=session('b5s9').activity;
  assert.deepEqual(rule.fields.map(norm),['Step 1…','Step 2…','Step 3…']);
  assert.deepEqual(rule.minLengths,[8,8,8],'b5s9 ready rule: each >= 8 (activity.minLengths)');
  assert.ok(norm(rule.instructions).includes('Make it short enough to actually use.'),'b5s9 quotes the book');
});

test('student UI renders the annotate activity with the selector contract and enforces its ready rule',()=>{
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='annotate'\)return `<div class="annotate-lab" data-annotate="\$\{esc\(a\.file\)\}">/);
  assert.match(app,/<button type="button" class="annotate-sentence \$\{types\.length\?'marked':''\}" data-sentence="\$\{n\}"/,'sentences button.annotate-sentence[data-sentence], marked when they carry a mark');
  assert.match(app,/<small class="annotate-tag">/,'marked sentences show a tag with the mark type');
  assert.match(app,/<p id="annotateTarget" class="annotate-target">/);
  assert.match(app,/target\.textContent=`Sentence \$\{sel\}: \$\{sentences\[sel-1\]\}`/,'#annotateTarget shows "Sentence n: …"');
  assert.match(app,/<select id="annotateMark" name="mark">\$\{\(a\.markTypes\|\|\[\]\)\.map\(/,'select#annotateMark lists markTypes');
  assert.match(app,/<textarea id="annotateNote" name="note"/);
  assert.match(app,/<button id="annotateAdd" type="submit" class="secondary">/);
  assert.match(app,/<div class="annotate-counts" aria-live="polite"><\/div><div class="findings annotate-findings"><strong>Your marks<\/strong><ol><\/ol><\/div>/);
  assert.match(app,/class="finding-remove" data-remove="\$\{i\}" aria-label="Remove mark/,'a remove button per mark');
  assert.match(app,/`<span><b>\$\{esc\(t\)\}<\/b> ×\$\{marks\.filter\(m=>m\.type===t\)\.length\}<\/span>`/,'a count per mark type');
  // State shape: state.activity[sid] = { marks:[{sentence,type,note}] }, updated without re-rendering the lesson.
  assert.match(app,/marks:\[\.\.\.annotateMarks\(s\),\{sentence:sel,type:mark\.value,note:text\}\]/);
  assert.match(app,/if\(text\.length<8\)\{note\.setCustomValidity\('Write at least 8 characters/);
  const wiring=app.slice(app.indexOf('function wireAnnotate(s,host)'),app.indexOf('// Bias simulator'));
  assert.ok(wiring.length>0&&!/renderLesson\(\)/.test(wiring),'annotate wiring updates the DOM only, no renderLesson per mark');
  assert.match(app,/const an=panel\.querySelector\('\[data-annotate\]'\);if\(an\)wireAnnotate\(s,an\)/);
  // Ready rule: marks >= minMarks, every requiredMarks type present, three distinct types, every note >= 8.
  assert.match(app,/if\(a\.kind==='annotate'\)\{const m=Array\.isArray\(v\.marks\)\?v\.marks:\[\];return m\.length>=\(a\.minMarks\|\|6\)&&m\.every\(x=>String\(x\?\.note\|\|''\)\.trim\(\)\.length>=8\)&&new Set\(m\.map\(x=>x\.type\)\)\.size>=3&&\(Array\.isArray\(a\.requiredMarks\)\?a\.requiredMarks:\[\]\)\.every\(t=>m\.some\(x=>x\.type===t\)\)\}/);
  assert.match(app,/if\(a\.kind==='chain'\)\{const keys=\(a\.columns\|\|\[\]\)\.map\(c=>c\[0\]\)/,'chain ready rule untouched');
  assert.match(app,/if\(a\.kind==='dataset'\)\{const f=\(Array\.isArray\(v\.findings\)/,'dataset ready rule untouched');
  const css=read('styles.css');
  for(const sel of ['.annotate-lab{','.annotate-sentence.marked{','.annotate-tag{','.annotate-counts{'])assert.ok(css.includes(sel),`css ${sel}`);
  assert.match(css,/@media\(max-width:620px\)\{\.annotate-form\{grid-template-columns:1fr\}/,'annotate form stacks on phones');
  assert.ok(css.includes('.block-5{background:'),'chapter 5 card colour');
  const admin=read('admin.js');
  assert.match(admin,/activity\.kind === "annotate"\) \{ if \(key === "marks"\) return "Annotated article";/);
});

test('the sentence split numbers the article stably and matches the teacher key',()=>{
  const splitSentences=fn('splitSentences');
  assert.deepEqual(splitSentences('One claim here. Another one!  A third?\nLast one.'),['One claim here.','Another one!','A third?','Last one.']);
  assert.deepEqual(splitSentences('  Spaces   inside  a sentence. '),['Spaces inside a sentence.']);
  const article=read('public/datasets/news-detective-article.txt');
  const sentences=splitSentences(article);
  assert.ok(sentences.length>=10&&sentences.length<=16,`article splits into 10–16 sentences (got ${sentences.length})`);
  assert.ok(sentences.every(s=>/[.!?]$/.test(s)),'every sentence ends with a full stop, question mark or exclamation mark');
  assert.ok(!/\b(Dr|Mr|Mrs|Ms|Prof|St|No|etc|e\.g|i\.e)\./.test(article),'no abbreviations with full stops inside sentences');
  assert.match(article,/synthetic/i);
});

test('bias simulator: model values, selector contract and ready rule',()=>{
  const simModel=fn('simModel');
  assert.deepEqual(simModel(10,80,false),{correctA:18,correctB:2,overall:0.5});
  assert.deepEqual(simModel(50,80,true),{correctA:18,correctB:13,overall:0.775});
  assert.deepEqual(simModel(50,0,true),{correctA:18,correctB:18,overall:0.9});
  assert.equal(simModel(50,100,true).correctB,12,'removing the field with a perfect proxy is the same as keeping it');
  assert.equal(simModel(5,0,false).correctB,1,'penalty applies in full while the field is kept');
  for(const shareB of [5,10,25,50])for(const proxy of [0,50,100])for(const removed of [false,true]){const r=simModel(shareB,proxy,removed);assert.equal(r.correctA,18);assert.ok(r.correctB>=0&&r.correctB<=20);assert.equal(r.overall,(18+r.correctB)/40)}
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='simulator'\)\{.*return `<div class="bias-sim"><p class="sim-scenario">\$\{esc\(a\.scenario\)\}<\/p>/);
  assert.match(app,/<input type="range" data-sim="\$\{esc\(k\)\}" min="\$\{min\}" max="\$\{max\}" step="\$\{step\}" value="\$\{val\}"/,'one range input per control');
  assert.match(app,/<input type="checkbox" data-sim="\$\{esc\(a\.toggle\[0\]\)\}"/);
  assert.match(app,/<td id="simAccA">18\/20 · 90%<\/td>/);
  assert.match(app,/<td id="simAccB"><\/td>/);assert.match(app,/<td id="simOverall"><\/td>/);
  assert.match(app,/<button id="simRecord" type="button" class="secondary">Record this run<\/button>/);
  assert.match(app,/<ol class="sim-runs">/);
  assert.match(app,/<textarea data-i="\$\{i\}" data-field="\$\{esc\(k\)\}"/,'fields textarea[data-i]');
  assert.match(app,/sim\.querySelector\('#simAccB'\)\.textContent=`\$\{r\.correctB\}\/20 · \$\{simPct\(r\.correctB\/20\)\}%`/);
  assert.match(app,/sim\.querySelector\('#simOverall'\)\.textContent=`\$\{r\.correctA\+r\.correctB\}\/40 · \$\{simPct\(r\.overall\)\}%`/);
  assert.match(app,/sim\.querySelectorAll\('input\[data-sim\]'\)\.forEach\(x=>x\.oninput=show\)/,'recomputed on every input change');
  // State shape: { runs:[{shareB,proxy,removed,correctA,correctB,overall}], fields:{changed,entered,affected} }, DOM-only updates.
  assert.match(app,/a\.runs=\[\.\.\.\(Array\.isArray\(a\.runs\)\?a\.runs:\[\]\),\{shareB:o\.shareB,proxy:o\.proxy,removed:o\.removed,correctA:r\.correctA,correctB:r\.correctB,overall:r\.overall\}\]/);
  assert.match(app,/a\.fields=\{\.\.\.\(a\.fields\|\|\{\}\),\[x\.dataset\.field\]:x\.value\};scheduleSync\(\)/);
  assert.match(app,/panel\.querySelectorAll\('\[data-i\]'\)\.forEach\(x=>!x\.closest\('\.bias-sim'\)&&x\.addEventListener\(/,'generic data-i wiring skips the simulator fields');
  const wiring=app.slice(app.indexOf("const sim=panel.querySelector('.bias-sim')"),app.indexOf("const ack=panel.querySelector('[data-ack]')"));
  assert.ok(wiring.length>0&&!/renderLesson\(\)/.test(wiring)&&!/Math\.random/.test(wiring),'simulator wiring is DOM-only and deterministic');
  assert.ok(!/Math\.random/.test(app.slice(app.indexOf('function simModel'),app.indexOf('function simRunsHTML'))),'no randomness in the model');
  // Ready rule: runs >= minRuns, two runs differ in shareB, proxy or removed, every field >= 12.
  assert.match(app,/if\(a\.kind==='simulator'\)\{const runs=Array\.isArray\(v\.runs\)\?v\.runs:\[\],f=v\.fields\|\|\{\};return runs\.length>=\(a\.minRuns\|\|2\)&&runs\.some\(r=>runs\.some\(q=>q\.shareB!==r\.shareB\|\|q\.proxy!==r\.proxy\|\|Boolean\(q\.removed\)!==Boolean\(r\.removed\)\)\)&&\(a\.fields\|\|\[\]\)\.every\(\(\[k\]\)=>String\(f\[k\]\|\|''\)\.trim\(\)\.length>=12\)\}/);
  const css=read('styles.css');
  for(const sel of ['.bias-sim{','.sim-controls{','.sim-results{','.sim-runs{'])assert.ok(css.includes(sel),`css ${sel}`);
  assert.match(css,/@media\(max-width:620px\)\{[^}]*\}\.sim-controls label\{grid-template-columns:1fr\}/,'simulator controls stack on phones');
  const admin=read('admin.js');
  assert.match(admin,/activity\.kind === "simulator"\) \{ if \(key === "runs"\) return "Bias simulator";/);
});

test('textfields ready rule honours per-field minimum lengths and keeps the 12-character default',()=>{
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='textfields'\)return a\.fields\.every\(\(_,i\)=>String\(v\[i\]\|\|''\)\.trim\(\)\.length>=\(Array\.isArray\(a\.minLengths\)&&Number\.isFinite\(a\.minLengths\[i\]\)\?a\.minLengths\[i\]:12\)\)/);
});

test('server requires the nine Chapter 5 sessions before the capstone',()=>{
  const api=read('functions/api/[[path]].js');
  assert.ok(api.includes("block5:['b5s1','b5s2','b5s3','b5s4','b5s5','b5s6','b5s7','b5s8','b5s9']"));
  assert.match(api,/const blockOrder=Object\.keys\(requiredSessions\)/);
});

test('project workspace summarises the annotate and simulator kinds',()=>{
  const pw=read('project-workspace.js');
  const fnSrc=pw.slice(pw.indexOf('function summariseActivity('));
  assert.match(fnSrc,/a\.kind==='annotate'/);
  assert.match(fnSrc,/a\.kind==='simulator'/);
});

test('block5 capstone and project brief follow the contract',()=>{
  const cap=CAPSTONES.block5;
  assert.equal(cap.id,'block5-capstone');
  assert.equal(cap.title,'AI Investigator review');
  assert.match(cap.brief,/group chat/);
  assert.match(cap.brief,/screenshot of a headline/);
  assert.match(cap.brief,/"discipline prediction" AI.*chain of training centres.*"likely to cause trouble"/s);
  assert.match(cap.brief,/"a study" with no link/);
  assert.match(cap.brief,/Forty accounts.*hour.*two news sites.*post as their source/is);
  assert.equal(cap.prompts.length,3);
  assert.match(cap.prompts[0],/unsupported.*bias risk/is);
  assert.match(cap.prompts[1],/verify.*independent sources.*rewrite.*trustworthy/is);
  assert.match(cap.prompts[2],/[Tt]race.*evidence.*kinds of bias.*stage.*uncertain/s);
  const brief=PROJECT_BRIEFS.block5;
  assert.equal(brief.id,'block5');
  assert.equal(brief.chapter,'Trust, Bias & Misinformation');
  assert.equal(brief.title,'AI News Detective Report');
  assert.equal(brief.role,'Junior Trust & Safety Analyst');
  assert.equal(brief.client,'Training centre communications team');
  assert.match(brief.objective,/^Investigate one AI-generated article or set of claims\. Produce an evidence table, identify at least one bias risk, and publish a corrected version with the uncertain parts clearly marked\./);
  assert.equal(brief.acceptanceCriteria.length,6);
  for(const re of [/unsupported claims|unsupported certainty/i,/independent sources.*Sheet A2/i,/trace.*origin/i,/kind of bias|kinds of bias/i,/improve|corrected version/i,/still uncertain/i])assert.ok(brief.acceptanceCriteria.some(c=>re.test(c)),`criterion ${re}`);
  assert.deepEqual(brief.deliverables,['Annotated AI output','Verification table (Sheet A2)','Bias analysis (stations and simulator)','Corrected version','Personal three-step trust rule','Final recommendation']);
  assert.ok(brief.prompts.recommendation.length>40);
});

test('capstone scoring recognises the block5 vocabulary only for block5',()=>{
  const src=read('lib/chapter-capstone.mjs');
  for(const w of ['misinformation','disinformation','hallucinat','bias','selection','representation','framing','automation','provenance','lateral','independent','source','proxy','synthetic','deepfake','uncertain','lifecycle','label','deploy'])assert.match(src,new RegExp(`hasConcept=.*blockId==='block5'.*\\|${w}`),`block5 concept keyword ${w}`);
  for(const w of ['stop','investigate','find','trace','verify','check','label','rewrite','remove','mark','cite','compare','wait'])assert.match(src,new RegExp(`hasAction=.*blockId==='block5'.*\\|${w}`),`block5 action keyword ${w}`);
  for(const w of ['post','screenshot','headline','study','claim','discipline','flag','students?','repost','news site','original','group chat','training centre'])assert.match(src,new RegExp(`hasEvidence=.*blockId==='block5'.*\\|${w}`),`block5 evidence keyword ${w}`);
  const text='Provenance and lateral reading show the proxy entered at deployment; the automation bias is a lifecycle problem.';
  assert.equal(assessChapterCapstone({blockId:'block5',answers:{0:text}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3','block4'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:text}}).criteria.understanding,0,`${id} unchanged`);
  const r=assessChapterCapstone({blockId:'block5',answers:{0:'I would trace the screenshot back to the original post and wait before sharing, because the headline is uncertain until an independent source confirms it.'}});
  assert.equal(r.criteria.understanding,1);
  assert.equal(r.criteria.reasoning,2);
  assert.equal(r.criteria.evidence,1);
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  assert.deepEqual(weak.criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0},'Chapter 2 scoring unchanged');
  const genai='Framing, iteration, hallucination and verification: an LLM is generative and confirmation bias shapes the source it cites.';
  assert.equal(assessChapterCapstone({blockId:'block4',answers:{0:genai}}).criteria.understanding,1,'Chapter 4 scoring unchanged');
});

test('Chapter 5 downloads exist under public/datasets and the teacher key stays outside public',()=>{
  for(const f of DATASETS)assert.ok(exists(`public/datasets/${f}`),`public/datasets/${f}`);
  assert.ok(exists('docs/teacher/news-detective-article.KEY.txt'),'teacher key');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${d}/${e.name}`):[`${d}/${e.name}`]);
  assert.deepEqual(walk('public').filter(p=>/KEY/i.test(p)),[],'no teacher key under public/');
  const cards=read('public/datasets/claim-cards.txt');
  for(const re of [/Transition Year was introduced in Irish schools in 1974/,/River Shannon is the longest river in Europe/,/AI tutor than from a teacher/])assert.match(cards,re);
  assert.ok(cards.split(/=== Card \d+ ===/).slice(1).every(card=>!/\b(true|false|cannot be verified|can't be verified)\b/i.test(card.split(/\n\s*\n/)[0].replace(/rank|before checking/gi,''))),'claim cards are unlabelled');
  assert.equal(read('public/datasets/annotation-sheet.csv').split(/\r?\n/)[0].trim(),'sentence,mark_type,note');
  assert.equal(read('public/datasets/bias-simulator-worksheet.csv').split(/\r?\n/)[0].trim(),'run,shareB,proxy,removed,groupA,groupB,overall,note');
  const stations=read('public/datasets/bias-station-cards.txt');
  for(const re of [/hiring/i,/image generation/i,/discipline analytics/i,/recommendation feed/i,/proxy/i])assert.match(stations,re);
  const tpl=read('public/datasets/corrected-version-template.md');
  for(const re of [/verified/i,/uncertain/i,/sources/i,/removed|took out/i])assert.match(tpl,re);
  const checklist=read('public/datasets/synthetic-media-checklist.txt');
  for(const re of [/provenance/i,/coverage/i,/who gains/i,/original/i,/wait/i])assert.match(checklist,re);
});

test('the article contains a sentence the key marks wrong and one it marks unsupported certainty',()=>{
  const article=read('public/datasets/news-detective-article.txt'),key=read('docs/teacher/news-detective-article.KEY.txt');
  assert.match(article,/AI tutors in every Irish secondary classroom by 2028/i);
  const wrongLines=key.split(/\r?\n/).filter(l=>/\bwrong\b/i.test(l));
  assert.ok(wrongLines.length>=2,'key marks at least two claims wrong');
  const tokens=wrongLines.flatMap(l=>[...l.matchAll(/\b\d{4}\b|National AI Tutoring Act/g)].map(m=>m[0]));
  assert.ok(tokens.some(t=>article.includes(t)),`a wrong claim from the key (${tokens.join(', ')||'no tokens'}) appears in the article`);
  assert.ok(key.split(/\r?\n/).some(l=>/unsupported certainty/i.test(l)),'key marks unsupported certainty');
  assert.ok(/Experts agree/.test(article)&&/beyond doubt/i.test(article),'the article carries the two unbacked-certainty sentences');
  assert.ok(key.split(/\r?\n/).some(l=>/emotional framing/i.test(l)),'key marks emotional framing');
  assert.ok(key.split(/\r?\n/).some(l=>/missing source/i.test(l)),'key marks a missing source');
});
