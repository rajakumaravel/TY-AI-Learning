// Visual audit helper: full-page screenshots of every main screen at phone and desktop widths. Not part of npm test.
// ACCEPTANCE_BASE_URL=... SHOTS=<dir> node tests/acceptance/ui-audit.mjs
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
import { BASE, REF, api, createUser, cleanup, CHAPTER1_SESSIONS, CHAPTER2_SESSIONS, CHAPTER3_SESSIONS, CHAPTER4_SESSIONS, CAPSTONE1_ANSWERS, CAPSTONE2_ANSWERS, CAPSTONE3_ANSWERS, CAPSTONE4_ANSWERS, CHAPTER5_SESSIONS, CAPSTONE5_ANSWERS, CHAPTER6_FIELDS, CHAPTER6_SESSIONS, CAPSTONE6_ANSWERS, CHAPTER7_RUNS, decisionStep, recordDecisionRun, restartDecision, fillDecisionCanvas, CHAPTER7_SESSIONS, CAPSTONE7_ANSWERS, CHAPTER8_SESSIONS, CAPSTONE8_ANSWERS, CHAPTER8_FIELDS } from './lib.mjs';
const OUT=process.env.SHOTS||'ui-audit-shots';
const KEY=`sb-${REF}-auth-token`;
const users=[]; const browser=await chromium.launch();
try{
  const u=await createUser('audit'); users.push(u);
  await api('progress',u.token,{method:'PUT',body:JSON.stringify({state:{completed:[...CHAPTER1_SESSIONS,...CHAPTER2_SESSIONS,...CHAPTER3_SESSIONS,...CHAPTER4_SESSIONS,...CHAPTER5_SESSIONS,...CHAPTER6_SESSIONS,...CHAPTER7_SESSIONS,...CHAPTER8_SESSIONS],reflections:{},activity:{},badges:[],chapterAssessments:{}}})});
  await api('chapter-assessment/block1',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE1_ANSWERS})});
  await api('chapter-assessment/block2',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE2_ANSWERS})});
  await api('chapter-assessment/block3',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE3_ANSWERS})});
  await api('chapter-assessment/block4',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE4_ANSWERS})});
  await api('chapter-assessment/block5',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE5_ANSWERS})});
  await api('chapter-assessment/block6',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE6_ANSWERS})});
  await api('chapter-assessment/block7',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE7_ANSWERS})});
  await api('chapter-assessment/block8',u.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE8_ANSWERS})});
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
    // The desktop pass leaves this session acknowledged and on the fallback route for the same user, so the phone
    // pass finds it in a different state. Drive each control only when it is actually there to drive.
    const ack=await p.$('[data-ack]');
    if(ack&&!(await ack.isChecked()))await ack.check();
    // #labFallback exists in the DOM while hidden, so ask whether it is visible, not whether it is present.
    const fallbackBtn=await p.$('[data-fallback]');
    if(fallbackBtn&&!(await p.isVisible('#labFallback')))await fallbackBtn.click();
    for(const [i,value] of CHAPTER6_FIELDS.b6s4.entries())await p.fill(`textarea[data-i="${i}"]`,value);
    await shot('chapter6-workflow-viewer');
    await p.click('[data-session="b6s5"]');
    for(const [i,value] of CHAPTER6_FIELDS.b6s5.entries())await p.fill(`textarea[data-i="${i}"]`,value);
    await shot('chapter6-human-review');
    await p.click('#homeBtn'); await p.click('[data-block="6"]'); await p.waitForSelector('#labBanner .lab-stage'); await shot('chapter7');
    // The desktop pass advances this user's saved decision path, so the phone pass arrives mid-path or at an
    // outcome. Only drive the simulator when it is actually at the start node; otherwise just capture what it shows.
    await p.click('[data-session="b7s4"]'); await p.waitForSelector('.decision-lab',{timeout:15000});
    // This is a screenshot tool, not an assertion suite: capture whatever state the simulator is in rather than
    // insisting it is at the start. The walkthrough is what proves the flow works.
    if (await p.$(`input[name="decisionChoice"][data-choice="none"]`)) {
      try {
        await decisionStep(p,...CHAPTER7_RUNS[0].start);
        await p.waitForSelector(`input[name="decisionChoice"][data-choice="${CHAPTER7_RUNS[0].follow[0]}"]`,{timeout:10000});
      } catch { /* mid-path or already recorded; the shot below still shows the simulator */ }
    }
    await shot('chapter7-decision-node');
    try {
      await decisionStep(p,...CHAPTER7_RUNS[0].follow); await p.waitForSelector('button#decisionRecord',{timeout:10000}); await p.click('button#decisionRecord');
      for(const run of CHAPTER7_RUNS.slice(1)){await restartDecision(p);await recordDecisionRun(p,run)}
      await fillDecisionCanvas(p);
    } catch { /* this user already recorded these runs on the earlier pass */ }
    await shot('chapter7-decision-canvas');
    // Chapter 8 adds no activity kind; what is new on screen is the six-criteria rubric, the optional-AI build session
    // on its fallback route, and the programme-complete state on the home page and the portfolio.
    await p.click('#homeBtn'); await p.click('[data-block="7"]'); await p.waitForSelector('.chapter-rubric [data-criterion]',{timeout:15000}); await shot('chapter8-rubric');
    await p.click('[data-session="b8s5"]'); await p.waitForSelector('.lab',{timeout:15000}); if(!(await p.isVisible('#labFallback')))await p.click('button[data-fallback]'); await p.waitForSelector('#labFallback',{timeout:10000});
    for(const [i,value] of CHAPTER8_FIELDS.b8s5.entries())await p.fill(`textarea[data-i="${i}"]`,value);
    await shot('chapter8-build-fallback');
    await p.click('#homeBtn'); await p.waitForSelector('.programme-complete',{timeout:15000}); await shot('programme-complete');
    await p.click('[data-block-home], #homeBtn'); await p.click('[data-block="0"]'); await p.waitForSelector('#labBanner'); await p.click('[data-lab-session="b1lab"]'); await p.waitForSelector('#labToolLink'); await shot('lab-session');
    await p.waitForSelector('#projectWorkspaceBtn',{timeout:15000}); await p.click('#projectWorkspaceBtn'); await p.waitForSelector('#projectWorkspaceModal.open'); await shot('workspace',false);
    await p.click('.pw-close'); await p.click('#portfolioBtn'); await shot('portfolio');
    // Phase 10: the rendered export as a student would see it printed, not the trigger button.
    await p.waitForSelector('#exportPortfolio',{timeout:15000});
    const [exportDownload]=await Promise.all([p.waitForEvent('download'),p.click('#exportPortfolio')]);
    const exportPath=`${OUT}/${tag}-portfolio-export.html`; writeFileSync(exportPath,readFileSync(await exportDownload.path(),'utf8'));
    const exportPage=await ctx.newPage(); await exportPage.goto(`file://${process.cwd()}/${exportPath}`,{waitUntil:'load'});
    await exportPage.screenshot({path:`${OUT}/${tag}-portfolio-export.png`,fullPage:true}); await exportPage.close();
    const hs=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})); console.log(tag,'scroll/client width',hs);
    await ctx.close();
  }
  const admin=await createUser('audit-admin',{role:'admin'}); users.push(admin);
  for(const [w,h,tag] of [[400,860,'phone'],[1280,900,'desktop']]){
    const ctx=await browser.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
    await p.goto(`${BASE}/`,{waitUntil:'load'}); await p.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,JSON.stringify(admin.session)]);
    await p.goto(`${BASE}/admin`,{waitUntil:'load'}); await p.waitForSelector('#studentRows [data-student]',{timeout:20000}); await p.screenshot({path:`${OUT}/${tag}-admin.png`,fullPage:true});
    await p.click(`[data-student="${u.id}"]`); await p.waitForFunction(()=>!/Loading student evidence/.test(document.getElementById('detailContent')?.textContent||''),null,{timeout:20000}); await p.screenshot({path:`${OUT}/${tag}-admin-detail.png`,fullPage:true});
    // Phase 10: the pilot analytics view, aggregates and suppression as an admin sees them.
    await p.waitForSelector('#adminAnalytics [data-measure]',{timeout:15000}).catch(()=>{}); await p.screenshot({path:`${OUT}/${tag}-admin-analytics.png`,fullPage:true});
    await ctx.close();
  }
}catch(e){console.log('ERR',e.message)}finally{await browser.close();await cleanup(users)}
