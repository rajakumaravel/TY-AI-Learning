// Visual audit helper: full-page screenshots of every main screen at phone and desktop widths. Not part of npm test.
// ACCEPTANCE_BASE_URL=... SHOTS=<dir> node tests/acceptance/ui-audit.mjs
import { chromium } from 'playwright';
import { BASE, REF, api, createUser, cleanup, CHAPTER1_SESSIONS, CHAPTER2_SESSIONS, CHAPTER3_SESSIONS, CHAPTER4_SESSIONS, CAPSTONE1_ANSWERS, CAPSTONE2_ANSWERS, CAPSTONE3_ANSWERS, CAPSTONE4_ANSWERS, CHAPTER5_SESSIONS, CAPSTONE5_ANSWERS, CHAPTER6_FIELDS, CHAPTER6_SESSIONS, CAPSTONE6_ANSWERS, CHAPTER7_RUNS, decisionStep, recordDecisionRun, restartDecision, fillDecisionCanvas } from './lib.mjs';
const OUT=process.env.SHOTS||'ui-audit-shots';
const KEY=`sb-${REF}-auth-token`;
const users=[]; const browser=await chromium.launch();
try{
  const u=await createUser('audit'); users.push(u);
  await api('progress',u.token,{method:'PUT',body:JSON.stringify({state:{completed:[...CHAPTER1_SESSIONS,...CHAPTER2_SESSIONS,...CHAPTER3_SESSIONS,...CHAPTER4_SESSIONS,...CHAPTER5_SESSIONS,...CHAPTER6_SESSIONS],reflections:{},activity:{},badges:[],chapterAssessments:{}}})});
  await api('chapter-assessment/block1',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE1_ANSWERS})});
  await api('chapter-assessment/block2',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE2_ANSWERS})});
  await api('chapter-assessment/block3',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE3_ANSWERS})});
  await api('chapter-assessment/block4',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE4_ANSWERS})});
  await api('chapter-assessment/block5',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE5_ANSWERS})});
  await api('chapter-assessment/block6',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE6_ANSWERS})});
  for(const [w,h,tag] of [[400,860,'phone'],[1280,900,'desktop']]){
    const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
    const p=await ctx.newPage();
    await p.goto(`${BASE}/`,{waitUntil:'load'}); await p.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,JSON.stringify(u.session)]);
    await p.goto(`${BASE}/`,{waitUntil:'load'}); await p.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
    const shot=async(name,full=true)=>p.screenshot({path:`${OUT}/${tag}-${name}.png`,fullPage:full});
    await shot('home');
    await p.click('[data-block="2"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter3');
    await p.click('[data-lab-session="b3s4"]'); await p.waitForSelector('.dataset-table tbody tr',{timeout:15000}); await shot('dataset-session');
    await p.click('[data-block-home], #homeBtn'); await p.click('[data-block="3"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter4');
    await p.click('[data-session="b4s3"]'); await p.waitForSelector('.prompt-lab',{timeout:15000}); await shot('prompt-lab');
    await p.click('[data-block-home], #homeBtn'); await p.click('[data-block="4"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter5');
    await p.click('[data-session="b5s3"]'); await p.waitForSelector('.annotate-lab button.annotate-sentence[data-sentence]',{timeout:15000}); await shot('annotate-lab');
    await p.click('[data-session="b5s5"]'); await p.waitForSelector('.bias-sim input[type=range][data-sim="shareB"]',{timeout:15000}); await shot('bias-sim');
    await p.click('#homeBtn'); await p.click('[data-block="5"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter6');
    await p.click('[data-session="b6s4"]'); await p.waitForSelector('[data-dataset="ai-work-event-budget-raw.csv"][data-readonly] .dataset-table tbody tr',{timeout:15000});
    await p.check('[data-ack]'); await p.click('[data-fallback]');
    for(const [i,value] of CHAPTER6_FIELDS.b6s4.entries())await p.fill(`textarea[data-i="${i}"]`,value);
    await shot('chapter6-workflow-viewer');
    await p.click('[data-session="b6s5"]');
    for(const [i,value] of CHAPTER6_FIELDS.b6s5.entries())await p.fill(`textarea[data-i="${i}"]`,value);
    await shot('chapter6-human-review');
    await p.click('#homeBtn'); await p.click('[data-block="6"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter7');
    await p.click('[data-session="b7s4"]'); await p.waitForSelector('.decision-lab input[name="decisionChoice"][data-choice="none"]',{timeout:15000});
    await decisionStep(p,...CHAPTER7_RUNS[0].start); await p.waitForSelector(`input[name="decisionChoice"][data-choice="${CHAPTER7_RUNS[0].follow[0]}"]`,{timeout:10000});
    await shot('chapter7-decision-node');
    await decisionStep(p,...CHAPTER7_RUNS[0].follow); await p.waitForSelector('button#decisionRecord',{timeout:10000}); await p.click('button#decisionRecord');
    for(const run of CHAPTER7_RUNS.slice(1)){await restartDecision(p);await recordDecisionRun(p,run)}
    await fillDecisionCanvas(p);
    await shot('chapter7-decision-canvas');
    await p.click('[data-block-home], #homeBtn'); await p.click('[data-block="0"]'); await p.waitForSelector('#labBanner'); await p.click('[data-lab-session="b1lab"]'); await p.waitForSelector('#labToolLink'); await shot('lab-session');
    await p.waitForSelector('#projectWorkspaceBtn',{timeout:15000}); await p.click('#projectWorkspaceBtn'); await p.waitForSelector('#projectWorkspaceModal.open'); await shot('workspace',false);
    await p.click('.pw-close'); await p.click('#portfolioBtn'); await shot('portfolio');
    const hs=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})); console.log(tag,'scroll/client width',hs);
    await ctx.close();
  }
  const admin=await createUser('audit-admin',{role:'admin'}); users.push(admin);
  for(const [w,h,tag] of [[400,860,'phone'],[1280,900,'desktop']]){
    const ctx=await browser.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
    await p.goto(`${BASE}/`,{waitUntil:'load'}); await p.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,JSON.stringify(admin.session)]);
    await p.goto(`${BASE}/admin`,{waitUntil:'load'}); await p.waitForSelector('#studentRows [data-student]',{timeout:20000}); await p.screenshot({path:`${OUT}/${tag}-admin.png`,fullPage:true});
    await p.click(`[data-student="${u.id}"]`); await p.waitForFunction(()=>!/Loading student evidence/.test(document.getElementById('detailContent')?.textContent||''),null,{timeout:20000}); await p.screenshot({path:`${OUT}/${tag}-admin-detail.png`,fullPage:true});
    await ctx.close();
  }
}catch(e){console.log('ERR',e.message)}finally{await browser.close();await cleanup(users)}
