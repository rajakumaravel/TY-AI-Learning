import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS } from '../lib/project-briefs.mjs';

// Phase 5: Chapter 4 Generative AI & Prompting, Student Book pp. 18–22 (docs/product/phase-5-contract.md).
// Files owned by other Phase 5 agents are read lazily so a missing or stale file fails only its own case.
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const course=()=>JSON.parse(read('curriculum.json'));
const block4=()=>{const b=course().blocks.find(b=>b.id==='block4');assert.ok(b,'curriculum.json has block4');return b};
const session=id=>{const s=block4().sessions.find(s=>s.id===id);assert.ok(s,`block4 has ${id}`);return s};
// Book quotations are compared with straight quotes and single spaces so PDF line breaks and curly punctuation do not matter.
const norm=s=>String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
const SESSION_IDS=['b4s1','b4s2','b4s3','b4s4','b4s5','b4s6','b4s7','b4s8','b4s9','b4s10'];
const KEY_WORDS=['generative AI','large language model (LLM)','pattern prediction','prompt','context','constraint','output format','iteration','hallucination','verification','source quality'];
const ROUTE=['Same task, different prompts','Discover: what an LLM actually does','Prompt Lab 1: C-T-C-F','Prompt Lab 2: iterate','Four useful roles','Verification challenge','Injecting doubt','Build a reusable prompt','Peer red-team','Exit rule'];
const SAFETY=['Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them.','No accounts. DuckDuckGo AI Chat works without signing in; if a tool asks you to sign in, stop and use the fallback.','The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked in the verification log.','Nothing typed into this portal is sent to the AI tool; copy your prompt across yourself and paste short extracts of the output back here.'];
const A4_FIELDS=[['prompt','The prompt, exactly as sent'],['change','What I changed'],['output','What the output did (short extract or summary)'],['better','Was it better? Why?']];
const DATASETS=['genai-weak-question-card.txt','genai-sample-outputs.txt','genai-verification-topics.txt','genai-red-team-prompts.txt','prompt-experiment-sheet-A4.csv','verification-log-A2.csv','reusable-prompt-template.md'];

test('block4 chapter shape follows the Student Book',()=>{
  const b=block4();
  assert.equal(b.number,'04');
  assert.equal(b.title,'Generative AI & Prompting');
  assert.equal(b.badge,'Prompt Engineer');
  assert.equal(b.duration,'4 hours');
  assert.deepEqual(b.outcomes,['LO7','LO9']);
  assert.equal(norm(b.mission),'Run a three-version prompt experiment: v1 weak, v2 improved, v3 tested and revised. Keep the outputs. Then produce a verification log for at least three factual claims the AI made.');
  assert.equal(norm(b.final),'Prompts v1, v2, v3 with their outputs (Sheet A4), your output comparison notes, your three-claim verification log (Sheet A2), your reusable prompt template, your reflection and exit rule.');
  const labels=b.route.map(r=>norm(r[1]));
  let at=0;for(const l of ROUTE){const i=labels.indexOf(l,at);assert.ok(i>=0,`route label "${l}" in book order`);at=i+1}
  assert.deepEqual(b.sessions.map(s=>s.id),SESSION_IDS);
  assert.deepEqual(b.sessions.map(s=>s.minutes),[20,20,30,30,30,30,25,30,20,5]);
  assert.equal(b.sessions.reduce((n,s)=>n+s.minutes,0),240);
  assert.deepEqual(b.sessions.map(s=>s.activity.kind),['lab','quiz','prompt','prompt','chain','chain','textfields','textfields','textfields','textfields']);
  assert.equal(b.lab.title,'Make prompts compete');
  assert.deepEqual(b.lab.stages.map(x=>[x[0],x[1]]),[['DO','b4s3'],['TEST','b4s1'],['MAKE','b4s8'],['BREAK','b4s7'],['IMPROVE','b4s4'],['PROVE','b4s6']]);
  for(const s of b.sessions){
    assert.equal(s.pageRef,'Student Book pp. 18–22',`${s.id} pageRef`);
    assert.ok(s.intro&&s.reflection&&s.activity?.title&&s.activity?.instructions,`${s.id} text`);
    assert.ok(s.study?.title&&s.study.body.length===3&&s.study.example&&s.study.keywords.length>=1,`${s.id} study`);
  }
  assert.ok(session('b4s2').study.body.some(p=>norm(p).includes('Confident wording is not confident truth.')),'b4s2 keeps the book sentence');
  assert.equal(norm(session('b4s3').reflection),'What changed because of your prompt, and what changed just randomly between runs?');
  assert.equal(norm(session('b4s5').reflection),'Which parts of the answer need evidence from outside the AI?');
  assert.equal(norm(session('b4s6').reflection),'Are you asking the model to think for you, or to help you think?');
  assert.equal(norm(session('b4s7').reflection),'What would make this prompt safer or fairer for other people?');
  assert.equal(norm(session('b4s10').reflection),"Finish this sentence: 'I should never trust an AI answer just because…'");
  assert.match(session('b4s10').type,/REFLECT/);
});

test('every Student Book key word appears in the chapter study keywords',()=>{
  const all=block4().sessions.flatMap(s=>s.study.keywords).map(k=>norm(k).toLowerCase());
  for(const w of KEY_WORDS)assert.ok(all.some(k=>k.includes(w.toLowerCase())),`key word "${w}"`);
});

test('block4 carries the book myth-busters, self-check and level-up',()=>{
  const b=block4();
  assert.equal(b.myths.length,4);
  for(const m of b.myths)assert.ok(Array.isArray(m)&&m.length===2&&m[0]&&m[1],'myth pair');
  assert.deepEqual(b.myths.map(m=>norm(m[0])),['Longer prompts are always better.','If it gives a citation, the source exists.','Good prompt engineering guarantees a true answer.','AI should give me the final answer.']);
  assert.deepEqual(b.myths.map(m=>norm(m[1])),['Your Lab 2 comparison probably showed some additions did nothing. Clear beats long.','LLMs generate citations the same way they generate everything else: by pattern. Some are real. Some are invented. Check.',"A better prompt gets a more useful answer. It doesn't turn a pattern-predictor into a fact-checker.",'For learning, the answer is the least useful thing it can give you. The questions, examples and critique are worth more.']);
  assert.deepEqual(Object.keys(b.selfCheck),['Getting started','Getting there','Going further']);
  assert.deepEqual(b.selfCheck['Getting started'].map(norm),['I can write a usable prompt','I notice when outputs differ']);
  assert.deepEqual(b.selfCheck['Getting there'].map(norm),['I improve prompts systematically','I verify important factual claims']);
  assert.deepEqual(b.selfCheck['Going further'].map(norm),['I build criteria to judge outputs','I compare outputs critically','I can explain how framing and confirmation bias affect results']);
  assert.equal(norm(b.levelUp),'Write an evaluation rubric with four criteria. Score two AI outputs against it. Then justify which one is better using the scores, not just which one you prefer.');
});

test('b4s1 lab opens DuckDuckGo AI Chat behind the four safety notes with the Copilot and sample-output fallbacks',()=>{
  const lab=session('b4s1').activity;
  assert.deepEqual(lab.tool,{name:'DuckDuckGo AI Chat',url:'https://duck.ai',free:true});
  assert.deepEqual(lab.privacy.map(norm),SAFETY);
  assert.equal(lab.steps.length,5);
  assert.equal(lab.fields.length,4);
  assert.equal(lab.fallback?.title,'Tool blocked?');
  assert.ok(lab.fallback.steps.some(s=>/copilot\.microsoft\.com/.test(s)),'Copilot fallback');
  assert.ok(lab.fallback.steps.some(s=>/sample outputs/i.test(s)),'sample outputs fallback');
  assert.ok(lab.downloads.some(d=>d.file==='genai-weak-question-card.txt'));
  assert.ok(lab.downloads.some(d=>d.file==='genai-sample-outputs.txt'));
  for(const host of ['chatgpt.com','chat.openai.com','claude.ai','gemini.google.com'])assert.ok(!JSON.stringify(block4()).includes(`https://${host}`),`${host} not offered as a tool`);
});

test('block4 sessions carry the contracted activities',()=>{
  const quiz=session('b4s2').activity;
  assert.equal(quiz.title,'Pattern prediction or fact lookup?');
  assert.equal(quiz.items.length,8);
  assert.deepEqual(quiz.options,['Pattern prediction','Checked fact lookup','Neither']);
  for(const it of quiz.items)assert.ok(quiz.options.includes(it[1]),`quiz answer "${it[1]}" is an option`);
  const p1=session('b4s3').activity;
  assert.equal(p1.kind,'prompt');
  assert.equal(p1.title,'Prompt Lab 1: C-T-C-F');
  assert.equal(p1.builder,true);
  assert.deepEqual(p1.versions,[['v1','V1 – baseline (the weak prompt)'],['v2','V2 – rebuilt with C-T-C-F']]);
  assert.deepEqual(p1.fields,A4_FIELDS);
  assert.ok(Array.isArray(p1.downloads)&&p1.downloads.some(d=>d.file==='prompt-experiment-sheet-A4.csv'),'Sheet A4 download');
  const p2=session('b4s4').activity;
  assert.equal(p2.kind,'prompt');
  assert.equal(p2.builder,false);
  assert.deepEqual(p2.versions,[['v3','V3 – tested and revised']]);
  assert.deepEqual(p2.fields,A4_FIELDS);
  assert.equal(p2.extras.length,2);
  assert.match(p2.extras[0],/one at a time/i);
  assert.match(p2.extras[1],/actually helped/i);
  const roles=session('b4s5').activity;
  assert.deepEqual(roles.columns,[['role','Role (tutor, brainstorm partner, critic, transformer)'],['prompt','My prompt'],['did','What it did well'],['risk','The risk I saw']]);
  assert.equal(roles.rows,4);assert.equal(roles.minRows,4);
  assert.equal(roles.head,'TUTOR · BRAINSTORM PARTNER · CRITIC · TRANSFORMER');
  for(const re of [/explains something wrong/i,/stop generating your own/i,/too polite|invents problems/i,/drops or changes meaning/i])assert.match(roles.instructions,re,`four roles risk ${re}`);
  const verify=session('b4s6').activity;
  assert.deepEqual(verify.columns,[['claim','Claim the AI made'],['source','Source I checked (name and where)'],['verdict','Supported / uncertain / wrong'],['changed','What I changed because of it']]);
  assert.equal(verify.rows,3);assert.equal(verify.minRows,3);
  assert.equal(verify.head,'CLAIM → SOURCE → VERDICT → WHAT I CHANGED');
  for(const f of ['genai-verification-topics.txt','genai-sample-outputs.txt','verification-log-A2.csv'])assert.ok(verify.downloads.some(d=>d.file===f),`b4s6 download ${f}`);
  assert.equal(session('b4s7').activity.fields.length,4);
  assert.match(session('b4s7').activity.fields.join(' '),/leading question.*neutral version.*differed.*confirmation bias/is);
  const build=session('b4s8').activity;
  assert.equal(build.fields.length,4);
  assert.match(build.fields.join(' '),/real task.*\[placeholders\].*why each part.*check by hand/is);
  assert.ok(build.downloads.some(d=>d.file==='reusable-prompt-template.md'));
  const red=session('b4s9').activity;
  assert.equal(red.fields.length,3);
  assert.match(red.fields.join(' '),/ambiguity.*missing constraint.*need checking/is);
  assert.ok(red.downloads.some(d=>d.file==='genai-red-team-prompts.txt'));
  const exit=session('b4s10').activity;
  assert.equal(exit.fields.length,1);
  assert.match(norm(exit.fields[0]),/^I should never trust an AI answer just because/);
});

test('student UI renders the prompt activity with the selector contract and enforces its ready rule',()=>{
  const app=read('app.js');
  assert.match(app,/if\(a\.kind==='prompt'\)\{const b=v\.builder\|\|\{\},vs=v\.versions\|\|\{\},ex=v\.extras\|\|\{\};return `<div class="prompt-lab">/);
  assert.match(app,/<input data-builder="\$\{k\}" placeholder="\$\{esc\(hint\)\}"/,'builder inputs input[data-builder]');
  assert.match(app,/<button id="composeV2" type="button"/);
  assert.match(app,/\$\{a\.builder\?`<div class="prompt-builder">/,'builder only when activity.builder is true');
  assert.match(app,/<textarea data-version="\$\{esc\(key\)\}" data-field="\$\{esc\(f\)\}"/,'version fields textarea[data-version][data-field]');
  assert.match(app,/<textarea data-extra="\$\{i\}"/,'extras textarea[data-extra]');
  // C-T-C-F hints are the Student Book p.20 boxes.
  assert.match(app,/\['context','Context','Who you are, what this is for, what you already know'\]/);
  assert.match(app,/\['task','Task','The one clear thing you want it to do\. One verb\.'\]/);
  assert.match(app,/\['constraints','Constraints','Length, level, what to avoid, what must be included'\]/);
  assert.match(app,/\['format','Format','Table\? Bullets\? Three options\? Questions first\?'\]/);
  // State shape: state.activity[sid] = { builder:{…}, versions:{v1:{…}}, extras:{0:…} }, updated in place without re-rendering the lesson.
  assert.match(app,/a\.builder=\{\.\.\.\(a\.builder\|\|\{\}\),\[x\.dataset\.builder\]:x\.value\};scheduleSync\(\)/);
  assert.match(app,/a\.versions\[k\]=\{\.\.\.\(a\.versions\[k\]\|\|\{\}\),\[x\.dataset\.field\]:x\.value\};scheduleSync\(\)/);
  assert.match(app,/a\.extras=\{\.\.\.\(a\.extras\|\|\{\}\),\[x\.dataset\.extra\]:x\.value\};scheduleSync\(\)/);
  const wiring=app.slice(app.indexOf("const pl=panel.querySelector('.prompt-lab')"),app.indexOf("const single=panel.querySelector('[data-single]')"));
  assert.ok(wiring.length>0&&!/renderLesson\(\)/.test(wiring),'prompt wiring updates the DOM only, no renderLesson per keystroke');
  // Ready rule: every version prompt ≥20, output ≥20, better ≥12 (change may be empty); every extra ≥12.
  assert.match(app,/if\(a\.kind==='prompt'\)\{const vs=v\.versions\|\|\{\},ex=v\.extras\|\|\{\};const len=\(r,k\)=>String\(r\?\.\[k\]\|\|''\)\.trim\(\)\.length;return \(a\.versions\|\|\[\]\)\.every\(\(\[k\]\)=>len\(vs\[k\],'prompt'\)>=20&&len\(vs\[k\],'output'\)>=20&&len\(vs\[k\],'better'\)>=12\)&&\(Array\.isArray\(a\.extras\)\?a\.extras:\[\]\)\.every\(\(_,i\)=>String\(ex\[i\]\|\|''\)\.trim\(\)\.length>=12\)\}/);
  assert.match(app,/if\(a\.kind==='chain'\)\{const keys=\(a\.columns\|\|\[\]\)\.map\(c=>c\[0\]\)/,'chain ready rule untouched');
  const css=read('styles.css');
  assert.match(css,/\.prompt-builder-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.prompt-lab textarea\{min-width:0;width:100%\}/);
  assert.match(css,/@media\(max-width:620px\)\{\.prompt-builder-grid\{grid-template-columns:1fr\}\}/,'builder stacks to one column on phones');
  assert.ok(css.includes('.prompt-version'),'version block style');
  const admin=read('admin.js');
  assert.match(admin,/activity\.kind === "prompt"\) \{ if \(key === "builder"\) return "C-T-C-F builder";/);
  assert.match(admin,/return `Prompt \$\{key\}`/);
  assert.match(admin,/return `Extra \$\{Number\(key\)\+1\}`/);
});

test('Compose v2 writes the four C-T-C-F parts, joined by blank lines, into the v2 prompt field',()=>{
  const app=read('app.js');
  const compose=app.slice(app.indexOf("const compose=pl.querySelector('#composeV2')"),app.indexOf("const single=panel.querySelector('[data-single]')"));
  assert.match(compose,/PROMPT_BUILDER\.map\(\(\[k\]\)=>String\(b\[k\]\|\|''\)\.trim\(\)\)\.filter\(Boolean\)\.join\('\\n\\n'\)/);
  assert.match(compose,/pl\.querySelector\('textarea\[data-version="v2"\]\[data-field="prompt"\]'\)/);
  assert.match(compose,/ta\.value=text;a\.versions=a\.versions\|\|\{\};a\.versions\.v2=\{\.\.\.\(a\.versions\.v2\|\|\{\}\),prompt:text\}/);
  assert.match(compose,/scheduleSync\(\)/);
  // The join itself, run the same way the page runs it.
  const b={context:'I am a TY student preparing a talk.',task:'List the main renewable sources in Ireland.',constraints:'',format:'A table with a source column.'};
  const text=['context','task','constraints','format'].map(k=>String(b[k]||'').trim()).filter(Boolean).join('\n\n');
  assert.equal(text,'I am a TY student preparing a talk.\n\nList the main renewable sources in Ireland.\n\nA table with a source column.');
});

test('home page heading counts the chapters from the curriculum',()=>{
  assert.match(read('index.html'),/<h2 id="chaptersHeading">/);
  assert.ok(!read('index.html').includes('Chapters 1–2'),'stale static heading removed');
  assert.match(read('app.js'),/document\.getElementById\('chaptersHeading'\)\.textContent=`Chapters 1–\$\{COURSE\.blocks\.length\}`/);
});

test('server requires the ten Chapter 4 sessions before the capstone',()=>{
  const fn=read('functions/api/[[path]].js');
  assert.ok(fn.includes("block4:['b4s1','b4s2','b4s3','b4s4','b4s5','b4s6','b4s7','b4s8','b4s9','b4s10']"));
  assert.match(fn,/const blockOrder=Object\.keys\(requiredSessions\)/);
});

test('block4 capstone and project brief follow the contract',()=>{
  const cap=CAPSTONES.block4;
  assert.equal(cap.id,'block4-capstone');
  assert.equal(cap.title,'Prompt Lab review');
  assert.match(cap.brief,/one weak prompt/);
  assert.match(cap.brief,/talk on renewable energy in Ireland/);
  assert.match(cap.brief,/fluent.*two figures.*citation/is);
  assert.equal(cap.prompts.length,3);
  assert.match(cap.prompts[0],/C-T-C-F.*each.*part.*adds/is);
  assert.match(cap.prompts[1],/need verification.*check.*hallucination/is);
  assert.match(cap.prompts[2],/Why is wind better than solar\?.*Compare wind and solar.*responsibility/is);
  const brief=PROJECT_BRIEFS.block4;
  assert.equal(brief.id,'block4');
  assert.equal(brief.chapter,'Generative AI & Prompting');
  assert.equal(brief.title,'Prompt Experiment Report');
  assert.equal(brief.role,'Junior AI Research Assistant');
  assert.equal(brief.client,'Training centre learning team');
  assert.match(brief.objective,/^Run a three-version prompt experiment: v1 weak, v2 improved, v3 tested and revised\./);
  assert.equal(brief.acceptanceCriteria.length,6);
  for(const re of [/usable prompt.*outputs differ/i,/systematically.*Sheet A4/i,/verif.*three factual claims.*Sheet A2/i,/tutor, brainstorm partner, critic and transformer/i,/criteria.*compare.*critically.*framing.*confirmation bias/i,/recommendation.*check by hand/i])assert.ok(brief.acceptanceCriteria.some(c=>re.test(c)),`criterion ${re}`);
  assert.deepEqual(brief.deliverables,['Prompts v1, v2, v3 with outputs (Sheet A4)','Output comparison notes','Three-claim verification log (Sheet A2)','Four-roles record','Reusable prompt template','Final recommendation']);
  assert.ok(brief.prompts.recommendation.length>40);
});

test('capstone scoring recognises the block4 vocabulary only for block4',()=>{
  const src=read('lib/chapter-capstone.mjs');
  for(const w of ['prompt','context','constraint','format','iteration','hallucinat','verif','source','framing','confirmation bias','pattern','llm','generative'])assert.match(src,new RegExp(`hasConcept=.*blockId==='block4'.*\\|${w}`),`block4 concept keyword ${w}`);
  for(const w of ['rebuild','check','verify','compare','cite','ask questions'])assert.match(src,new RegExp(`hasAction=.*blockId==='block4'.*\\|${w}`),`block4 action keyword ${w}`);
  const text='Framing, iteration, hallucination and verification: an LLM is generative and confirmation bias shapes the source it cites.';
  assert.equal(assessChapterCapstone({blockId:'block4',answers:{0:text}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:text}}).criteria.understanding,0,`${id} unchanged`);
  const r=assessChapterCapstone({blockId:'block4',answers:{0:'I would rebuild the prompt with a constraint and cite the report, because the wind figure is a claim that needs verification.'}});
  assert.equal(r.criteria.understanding,1);
  assert.equal(r.criteria.reasoning,2);
  assert.equal(r.criteria.evidence,1);
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  assert.deepEqual(weak.criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0},'Chapter 2 scoring unchanged');
});

test('Chapter 4 downloads exist under public/datasets and the teacher key stays outside public',()=>{
  for(const f of DATASETS)assert.ok(exists(`public/datasets/${f}`),`public/datasets/${f}`);
  assert.ok(exists('docs/teacher/genai-sample-outputs.KEY.txt'),'teacher key');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${d}/${e.name}`):[`${d}/${e.name}`]);
  assert.deepEqual(walk('public').filter(p=>/KEY/i.test(p)),[],'no teacher key under public/');
  const card=read('public/datasets/genai-weak-question-card.txt');
  assert.match(card,/Tell me about the River Shannon\./);
  const sheet=read('public/datasets/prompt-experiment-sheet-A4.csv').split(/\r?\n/)[0];
  for(const h of ['Version','Prompt change','What changed in output','Was it better? Why?'])assert.ok(sheet.includes(h),`A4 header ${h}`);
  const log=read('public/datasets/verification-log-A2.csv').split(/\r?\n/)[0];
  for(const h of ['Claim','Source checked','Supported / uncertain / wrong','What I changed'])assert.ok(log.includes(h),`A2 header ${h}`);
});

test('sample outputs are labelled synthetic and contain at least one claim the teacher key marks wrong',()=>{
  const sample=read('public/datasets/genai-sample-outputs.txt'),key=read('docs/teacher/genai-sample-outputs.KEY.txt');
  assert.match(sample,/synthetic|sample/i);
  assert.match(sample,/Shannon/);
  const wrongLines=key.split(/\r?\n/).filter(l=>/\bwrong\b/i.test(l));
  assert.ok(wrongLines.length>=1,'key marks at least one claim wrong');
  // A planted wrong claim carries a checkable token (a figure, a year or a named Act) that must also appear in the student-facing sample.
  const tokens=wrongLines.flatMap(l=>[...l.matchAll(/\b\d{3,}(?:\.\d+)?\b|Shannon Bridge Act/g)].map(m=>m[0]));
  assert.ok(tokens.some(t=>sample.includes(t)),`a wrong claim from the key (${tokens.join(', ')||'no tokens'}) appears in the sample outputs`);
});
