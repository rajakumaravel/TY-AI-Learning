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
  assert.match(fs.readFileSync('public/datasets/prompt-experiment-sheet-A4.csv','utf8'),/^Version,Prompt,Prompt change,What changed in output,Was it better\? Why\?\nV1 - baseline,,,,\nV2,,,,\nV3,,,,\n$/);
  assert.match(fs.readFileSync('public/datasets/verification-log-A2.csv','utf8'),/^Claim,Source checked,Supported \/ uncertain \/ wrong,What I changed\n(,,,\n){3}$/);
  const template=fs.readFileSync('public/datasets/reusable-prompt-template.md','utf8');
  for(const h of ['## Context','## Task','## Constraints','## Format'])assert.ok(template.includes(h),h);
  assert.match(template,/\[unsure\]/);
});

test('chapter 5 downloads are generated, in the manifest and offered in the right sessions; the teacher key stays outside public/',()=>{
  const files=['claim-cards.txt','news-detective-article.txt','annotation-sheet.csv','bias-station-cards.txt','bias-simulator-worksheet.csv','corrected-version-template.md','synthetic-media-checklist.txt'];
  for(const file of files){
    assert.ok(fs.existsSync(`public/datasets/${file}`),`${file} missing`);
    assert.ok(manifest[file]>0,`${file} not in manifest`);
  }
  assert.ok(fs.existsSync('docs/teacher/news-detective-article.KEY.txt'),'teacher key generated outside public/');
  assert.ok(!fs.readdirSync('public/datasets').some(f=>/KEY/i.test(f)),'teacher key is never served');
  assert.ok(!downloads.some(d=>/KEY/i.test(d.file)),'the teacher key is not offered to students');
  assert.ok(downloads.some(d=>d.session==='b5s1'&&d.file==='claim-cards.txt'),'b5s1 claim cards');
  for(const file of ['news-detective-article.txt','annotation-sheet.csv'])assert.ok(downloads.some(d=>d.session==='b5s3'&&d.file===file),`b5s3 ${file}`);
  for(const file of ['news-detective-article.txt','verification-log-A2.csv'])assert.ok(downloads.some(d=>d.session==='b5s4'&&d.file===file),`b5s4 ${file}`);
  assert.equal(course.blocks[4].sessions.find(s=>s.id==='b5s3').activity.file,'news-detective-article.txt','the annotate renderer fetches the same article');
  assert.ok(downloads.some(d=>d.session==='b5s5'&&d.file==='bias-simulator-worksheet.csv'),'b5s5 worksheet');
  assert.ok(downloads.some(d=>d.session==='b5s6'&&d.file==='bias-station-cards.txt'),'b5s6 station cards');
  for(const file of ['news-detective-article.txt','corrected-version-template.md'])assert.ok(downloads.some(d=>d.session==='b5s7'&&d.file===file),`b5s7 ${file}`);
  assert.ok(downloads.some(d=>d.session==='b5s8'&&d.file==='synthetic-media-checklist.txt'),'b5s8 checklist');
  assert.equal(downloads.filter(d=>d.file==='verification-log-A2.csv').length,3,'Sheet A2 is reused by Chapters 4, 5 and 6, not generated again');
});

test('chapter 5 article is labelled synthetic, splits cleanly into sentences, mixes claims and framing, and every sentence is marked in the teacher key',()=>{
  const article=fs.readFileSync('public/datasets/news-detective-article.txt','utf8');
  assert.match(article,/^SYNTHETIC ARTICLE/);
  assert.match(article,/AI tutors in every Irish secondary classroom by 2028/);
  const body=article.trim().split('\n\n').pop();
  const sentences=body.split('. ');
  assert.ok(sentences.length>=10&&sentences.length<=12,`10–12 sentences, got ${sentences.length}`);
  for(const s of sentences)assert.ok(!s.replace(/\.$/,'').includes('.'),`no full stop inside a sentence: ${s}`);
  assert.doesNotMatch(article,/\[(FACTUAL CLAIM|EMOTIONAL FRAMING|MISSING SOURCE|UNSUPPORTED CERTAINTY|SUPPORTED|UNCERTAIN|WRONG)/,'marks are not shown to students');
  for(const re of [/Transition Year/,/Department of Education/,/Leaving Certificate/,/National AI Tutoring Act 2025/,/recent survey/,/Experts agree/,/It is beyond doubt/,/Classrooms of Tomorrow/])assert.match(body,re);
  const key=fs.readFileSync('docs/teacher/news-detective-article.KEY.txt','utf8');
  const marked=[...key.matchAll(/^(\d+)\. \[([A-Z +]+)\](?: \[(SUPPORTED|UNCERTAIN|WRONG)\])? (.+)$/gm)];
  assert.equal(marked.length,sentences.length,'every sentence is in the key');
  marked.forEach((m,i)=>{assert.equal(Number(m[1]),i+1);assert.equal(m[4].replace(/\.$/,''),sentences[i].replace(/\.$/,''),`key sentence ${i+1} matches the article`)});
  const types=t=>marked.filter(m=>m[2].split(' + ').includes(t));
  assert.ok(types('FACTUAL CLAIM').length>=4,'at least four factual claims');
  assert.ok(types('EMOTIONAL FRAMING').length>=2,'at least two emotionally framed sentences');
  assert.ok(types('UNSUPPORTED CERTAINTY').length>=2,'at least two unsupported certainty sentences');
  assert.ok(types('MISSING SOURCE').length>=1);
  for(const m of marked)assert.equal(Boolean(m[3]),m[2].includes('FACTUAL CLAIM'),`verdict only on factual claims: ${m[1]}`);
  assert.ok(marked.filter(m=>m[3]==='SUPPORTED').length>=3,'some claims are real-world supported');
  assert.ok(marked.filter(m=>m[3]==='WRONG').length>=2,'at least two wrong claims');
  assert.ok(marked.some(m=>m[3]==='UNCERTAIN'),'at least one uncertain claim');
  assert.match(key,/Fabricated citation/);
  assert.match(key,/Confidence trap: claim cards/);
  for(const re of [/TRUE\./,/FALSE\./,/CANNOT BE VERIFIED\./])assert.match(key,re);
  assert.match(key,/Bias stations: intended mechanisms/);
  assert.match(key,/Group B 2\/20/);assert.match(key,/Group B 13\/20/);assert.match(key,/Group B 18\/20/);
  const cards=fs.readFileSync('public/datasets/claim-cards.txt','utf8');
  assert.equal((cards.match(/^=== Card \d ===/gm)||[]).length,3);
  for(const re of [/Transition Year was introduced in Irish schools in 1974/,/The River Shannon is the longest river in Europe/,/Most Irish teenagers would rather learn from an AI tutor than from a teacher/,/rank how confident you are/i])assert.match(cards,re);
  assert.doesNotMatch(cards,/TRUE|FALSE|CANNOT BE VERIFIED/,'claim cards are unlabelled');
  const stations=fs.readFileSync('public/datasets/bias-station-cards.txt','utf8');
  assert.equal((stations.match(/^=== Station \d: /gm)||[]).length,4);
  for(const re of [/Hiring data/,/Image generation and stereotypes/,/Discipline analytics/,/Recommendation feeds/,/lifecycle map/,/Proxy bias/,/Automation bias/])assert.match(stations,re);
  assert.match(fs.readFileSync('public/datasets/annotation-sheet.csv','utf8'),/^sentence,mark_type,note\n(,,\n)+$/);
  assert.match(fs.readFileSync('public/datasets/bias-simulator-worksheet.csv','utf8'),/^run,shareB,proxy,removed,groupA,groupB,overall,note\n(,,,,,,,\n)+$/);
  const template=fs.readFileSync('public/datasets/corrected-version-template.md','utf8');
  for(const h of ['## Verified claims','## Uncertain claims','## Sources','## What was removed'])assert.ok(template.includes(h),h);
  const checklist=fs.readFileSync('public/datasets/synthetic-media-checklist.txt','utf8');
  for(const re of [/Provenance/,/Other coverage/,/Who gains/,/Look for the original/,/Wait/])assert.match(checklist,re);
});

test('chapter 7 downloads are generated, in the manifest and offered in the right sessions; the teacher key stays outside public/',()=>{
  const files=['ai-future-evidence-cards.txt','ai-future-career-cards.txt','ai-future-career-map.csv','ai-future-branch-cards.txt','ai-future-decision-log.csv','ai-future-scenario-canvas.md','ai-future-stakeholder-analysis.csv','ai-future-policy-cards.txt','ai-future-skills-card.md'];
  for(const file of files){
    assert.ok(fs.existsSync(`public/datasets/${file}`),`${file} missing`);
    assert.ok(manifest[file]>0,`${file} not in manifest`);
  }
  assert.ok(fs.existsSync('docs/teacher/ai-future-adoption.KEY.txt'),'teacher key generated outside public/');
  assert.ok(!fs.readdirSync('public/datasets').some(f=>/KEY/i.test(f)),'teacher key is never served');
  assert.ok(!downloads.some(d=>/KEY/i.test(d.file)),'the teacher key is not offered to students');
  for(const file of ['ai-future-evidence-cards.txt','ai-future-career-cards.txt'])assert.ok(downloads.some(d=>d.session==='b7s1'&&d.file===file),`b7s1 ${file}`);
  assert.ok(downloads.some(d=>d.session==='b7s2'&&d.file==='ai-future-career-cards.txt'),'b7s2 career cards');
  for(const file of ['ai-future-career-cards.txt','ai-future-evidence-cards.txt','ai-future-career-map.csv'])assert.ok(downloads.some(d=>d.session==='b7s3'&&d.file===file),`b7s3 ${file}`);
  assert.deepEqual(downloads.filter(d=>d.session==='b7s4').map(d=>d.file),['ai-future-evidence-cards.txt','ai-future-branch-cards.txt','ai-future-scenario-canvas.md','ai-future-decision-log.csv']);
  for(const file of ['ai-future-evidence-cards.txt','ai-future-stakeholder-analysis.csv'])assert.ok(downloads.some(d=>d.session==='b7s5'&&d.file===file),`b7s5 ${file}`);
  assert.ok(downloads.some(d=>d.session==='b7s6'&&d.file==='ai-future-policy-cards.txt'),'b7s6 policy cards');
  assert.ok(downloads.some(d=>d.session==='b7s7'&&d.file==='ai-future-skills-card.md'),'b7s7 skills card');
  assert.ok(downloads.some(d=>d.session==='b7s8'&&d.file==='ai-future-scenario-canvas.md'),'b7s8 scenario canvas');
});

test('chapter 7 branch and evidence downloads match the curriculum fixture, the worksheets stay blank and no public file names a recommended route',()=>{
  const d=course.blocks[6].sessions.find(s=>s.id==='b7s4').activity;
  const cards=fs.readFileSync('public/datasets/ai-future-evidence-cards.txt','utf8');
  for(const e of d.evidence){assert.ok(cards.includes(e.text),`${e.id} text`);assert.ok(cards.includes(`${e.id} [${e.status}]`),`${e.id} status label`)}
  assert.match(cards,/synthetic/i);
  const branch=fs.readFileSync('public/datasets/ai-future-branch-cards.txt','utf8');
  for(const n of d.nodes){
    assert.ok(branch.includes(n.id)&&branch.includes(n.title),`${n.id} in the walkthrough`);
    assert.ok(branch.includes(n.consequence)&&branch.includes(n.accountability)&&branch.includes(n.uncertainty),`${n.id} narrative`);
    if(n.metrics)assert.ok(branch.includes(n.metrics.join(', ')),`${n.id} vector`);
    for(const c of n.choices)assert.ok(branch.includes(`[${c.id}] ${c.label} → go to ${c.next}`),`${n.id}/${c.id} edge`);
  }
  for(const re of [/hoursReleased = 10 − humanHours/,/capacityValueEUR = hoursReleased × 20 − costEUR/,/percentage points/,/no correct route, no winner and no score/])assert.match(branch,re);
  assert.match(branch,/with no recommended route/);
  assert.doesNotMatch(branch,/best option|best route|highest score|ranked|we recommend/i,'no ranked outcome');
  const canvas=fs.readFileSync('public/datasets/ai-future-scenario-canvas.md','utf8');
  for(const h of ['## Optimistic','## Concerning','## Balanced','## Stakeholder impacts','## Future skills','## Governance choice','## Final recommendation'])assert.ok(canvas.includes(h),h);
  assert.ok(canvas.includes('Each scenario needs a technology change, a human response, and an unintended consequence.'),'book requirement');
  assert.ok(canvas.includes('No scenario is allowed to be “everything\'s fine” or “everything\'s ruined”.'),'book requirement, second half');
  for(const re of [/- Prediction:/,/- Attempt:/,/- Result:/,/- Surprise:/,/- Change:/,/- Transfer:/])assert.match(canvas,re);
  assert.doesNotMatch(canvas,/pilot-support|full-speed|none-train/,'no filled scenario pack');
  const careers=fs.readFileSync('public/datasets/ai-future-career-cards.txt','utf8');
  for(const t of ['checking order status','drafting a routine reply','interpreting an unclear return request','explaining a refusal','resolving an unusual complaint','correcting a wrong record','supporting a customer without digital access','deciding an exception'])assert.ok(careers.includes(t),t);
  for(const c of ['teacher','doctor','farmer','architect','engineer','journalist','tradesperson','designer','accountant'])assert.ok(careers.includes(c),c);
  assert.match(careers,/Do not transplant the Harbour Co-op counts/);
  const policy=fs.readFileSync('public/datasets/ai-future-policy-cards.txt','utf8');
  assert.match(policy,/"High-stakes AI decisions must always have human review\."/);
  assert.match(policy,/not a description of current law/);
  assert.ok(policy.includes(d.evidence.find(e=>e.id==='EH').text),'the EH counterpoint');
  assert.match(fs.readFileSync('public/datasets/ai-future-career-map.csv','utf8'),/^task,possible_change,evidence_and_assumption,human_capability_and_responsibility\n(,,,\n){5}$/);
  assert.match(fs.readFileSync('public/datasets/ai-future-decision-log.csv','utf8'),/^run,node,choice,evidence_available,alternatives_considered,reason_chosen,consequence,would_I_decide_differently_now\n(,,,,,,,\n)+$/);
  const stake=fs.readFileSync('public/datasets/ai-future-stakeholder-analysis.csv','utf8').trim().split('\n');
  assert.equal(stake[0],'stakeholder,three_future_impacts,evidence_and_limit,conflict_and_safeguard');
  assert.equal(stake.length,6,'five stakeholder rows');
  for(const row of stake.slice(1))assert.match(row,/,,,$/,`only the name is filled: ${row}`);
  const skills=fs.readFileSync('public/datasets/ai-future-skills-card.md','utf8');
  for(const c of ['critical judgement','communication','empathy','domain knowledge','negotiating priorities'])assert.ok(skills.includes(c),c);
  assert.equal((skills.match(/^## Capability \d$/gm)||[]).length,3);
  assert.match(skills,/^## One concrete action during TY$/m);
});

test('the chapter 7 teacher key computes all eight outcomes and the quiz key, and refuses a single correct future',()=>{
  const d=course.blocks[6].sessions.find(s=>s.id==='b7s4').activity;
  const key=fs.readFileSync('docs/teacher/ai-future-adoption.KEY.txt','utf8');
  const terminals=d.nodes.filter(n=>n.choices.length===0);
  assert.equal(terminals.length,8);
  for(const t of terminals)assert.ok(key.includes(`terminal ${t.id}`),`${t.id} outcome`);
  for(const re of [/capacity value −€30\.00/,/gap 6\.25 points/,/A 1\/80 = 1\.25%/,/B 10\/20 = 50\.00%/,/gap 45\.00 points/,/gap 11\.25 points/,/gap 15\.00 points, capacity value €0\.00/])assert.match(key,re);
  for(const [q,a] of course.blocks[6].sessions.find(s=>s.id==='b7s2').activity.items)assert.ok(key.includes(`${q} → ${a}`),q);
  assert.match(key,/NO TERMINAL IS CORRECT/);
  assert.match(key,/no combined score/i);
  assert.match(key,/same formative level as a supported pilot/);
  for(const re of [/jobs will go/,/No AI means no risk/,/An audit removes the harm/])assert.match(key,re);
});

test('dataset archives stay small enough for school connections',()=>{
  for(const [file,size] of Object.entries(manifest))assert.ok(size<1_000_000,`${file} is ${size} bytes`);
});

test('student UI lists downloads with the download attribute',()=>{
  assert.match(app,/href="\/datasets\/\$\{esc\(d\.file\)\}" download/);
  assert.match(app,/function activityHTML\(s\)\{return activityBodyHTML\(s\)\+downloadsHTML\(s\.activity\)\}/);
});
