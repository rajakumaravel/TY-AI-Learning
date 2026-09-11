import { getUser, oauthLogin, logout, handleAuthCallback } from '@netlify/identity';
import COURSE from './curriculum.json';
import { CAPSTONES } from './lib/chapter-capstone.mjs';

const ANON_KEY='ty-ai-anon-progress';
const emptyState=()=>({completed:[],reflections:{},activity:{},badges:[],chapterAssessments:{}});
let user=null;
let state=emptyState();
let activeBlock=null;
let activeSession=null;
let syncTimer=null;
// Set when Google sign-in succeeded but the progress API is unreachable/misconfigured.
// While set, work is kept on this device only and never pushed to the cloud, so a
// stale local copy cannot overwrite the learner's cloud progress when the API recovers.
let cloudError=null;

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function sanitizeState(v){
  const s=emptyState();
  if(!v||typeof v!=='object')return s;
  s.completed=Array.isArray(v.completed)?[...new Set(v.completed.filter(x=>typeof x==='string'))]:[];
  s.reflections=v.reflections&&typeof v.reflections==='object'?v.reflections:{};
  s.activity=v.activity&&typeof v.activity==='object'?v.activity:{};
  s.badges=Array.isArray(v.badges)?[...new Set(v.badges.filter(x=>typeof x==='string'))]:[];
  s.chapterAssessments=v.chapterAssessments&&typeof v.chapterAssessments==='object'?v.chapterAssessments:{};
  return s;
}
function localKey(){return user?.id&&!cloudError?`ty-ai-progress:${user.id}`:ANON_KEY}
function loadLocal(key=localKey()){try{return sanitizeState(JSON.parse(localStorage.getItem(key)||'{}'))}catch{return emptyState()}}
function saveLocal(){localStorage.setItem(localKey(),JSON.stringify(state))}
function isEmpty(s){return !s.completed.length&&!Object.keys(s.reflections).length&&!Object.keys(s.activity).length&&!Object.keys(s.chapterAssessments).length}

async function api(path,opts={}){const r=await fetch('/api/'+path,{credentials:'same-origin',headers:{'content-type':'application/json',...(opts.headers||{})},...opts});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||`Request failed (HTTP ${r.status})`);e.status=r.status;throw e}return d}
function setSync(text,kind=''){const el=document.getElementById('syncStatus');if(!el)return;el.textContent=text;el.className='sync '+kind}
function allSessions(){return COURSE.blocks.flatMap(b=>b.sessions)}
function blockDone(b){return b.sessions.every(s=>state.completed.includes(s.id))}
function blockQualified(b){return Boolean(state.chapterAssessments?.[b.id]?.submittedAt)}
function blockUnlocked(i){return i===0||(blockDone(COURSE.blocks[i-1])&&blockQualified(COURSE.blocks[i-1]))}
function reconcileBadges(){state.badges=COURSE.blocks.filter(b=>blockQualified(b)).map(b=>b.badge)}
function pct(){return Math.round(state.completed.length/allSessions().length*100)}
function renderProgress(){const p=pct();document.getElementById('coursePct').textContent=p+'%';document.getElementById('courseBar').style.width=p+'%'}
function show(id){['homeView','blockView','portfolioView'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id))}

async function scheduleSync(){saveLocal();renderProgress();if(!user||cloudError)return;clearTimeout(syncTimer);setSync('Saving…');syncTimer=setTimeout(async()=>{try{await api('progress',{method:'PUT',body:JSON.stringify({state})});setSync('Cloud synced','online')}catch{setSync('Saved on this device','error')}},400)}

function renderHome(){
  reconcileBadges();
  renderProgress();
  const signed=Boolean(user);
  document.getElementById('welcomeName').textContent=signed?`Welcome, ${user.displayName}`:'';
  document.getElementById('authBtn').innerHTML=signed?'Sign out':'<span class="gmark">G</span><span>Continue with Google</span>';
  document.getElementById('authBtn').classList.toggle('google-btn',!signed);
  document.getElementById('accountTitle').textContent=!signed?'Sign in to save across devices':cloudError?'Signed in · cloud sync unavailable':`Progress saved for ${user.displayName}`;
  document.getElementById('accountText').textContent=!signed?'Use a Google account to continue your course from another browser or device.':cloudError?`Signed in with ${user.email}, but the progress service could not be reached (${cloudError}). Your work is being saved on this device only. Reload the page to try again.`:`Signed in with ${user.email}. Your evidence and progress are stored against your account.`;
  document.getElementById('accountAction').innerHTML=signed?'Sign out':'<span class="gmark">G</span><span>Continue with Google</span>';
  document.getElementById('blockGrid').innerHTML=COURSE.blocks.map((b,i)=>{
    const unlocked=blockUnlocked(i),sessionsDone=blockDone(b),qualified=blockQualified(b),done=sessionsDone&&qualified;
    let status='Start / Continue';
    if(done)status='✓ Complete';
    else if(sessionsDone)status='Chapter assessment required';
    else if(!unlocked)status=`🔒 Complete Chapter ${COURSE.blocks[i-1].number} assessment`;
    return `<button class="block-card block-${i+1} ${done?'done':''} ${!unlocked?'locked':''}" data-block="${i}" ${unlocked?'':'disabled'}><div class="card-top"><span>CHAPTER ${b.number}</span><span>${esc(b.duration)}</span></div><h2>${esc(b.title)}</h2><p>${esc(b.description)}</p><div class="card-bottom"><span class="badge-pill">${esc(b.badge)}</span><strong>${esc(status)}</strong></div></button>`;
  }).join('');
  document.querySelectorAll('[data-block]').forEach(x=>x.onclick=()=>openBlock(Number(x.dataset.block)));
}

function openBlock(i){if(!blockUnlocked(i))return;activeBlock=COURSE.blocks[i];activeSession=activeBlock.sessions.find(s=>!state.completed.includes(s.id))||activeBlock.sessions[0];document.getElementById('blockMeta').textContent=`CHAPTER ${activeBlock.number} · ${activeBlock.duration}`;document.getElementById('blockTitle').textContent=activeBlock.title;document.getElementById('blockDesc').textContent=activeBlock.description;document.getElementById('blockBadge').textContent=activeBlock.badge;document.getElementById('blockLO').innerHTML=activeBlock.outcomes.map(x=>`<span class="tag">${esc(x)}</span>`).join('');document.getElementById('blockMission').textContent=activeBlock.mission;document.getElementById('blockRoute').innerHTML=activeBlock.route.map(r=>`<div><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join('');renderLabBanner();renderSessionNav();renderLesson();show('blockView')}
function renderLabBanner(){const el=document.getElementById('labBanner'),lab=activeBlock?.lab;if(!el)return;if(!lab){el.innerHTML='';return}el.innerHTML=`<div class="eyebrow">EXPERIENCE LAB</div><h3>${esc(lab.title)}</h3><p>${esc(lab.summary)}</p><div class="lab-stages">${lab.stages.map(([tag,sid,label])=>`<button type="button" class="lab-stage ${state.completed.includes(sid)?'done':''}" data-lab-session="${esc(sid)}"><b>${esc(tag)}</b><span>${esc(label)}</span></button>`).join('')}</div>`;el.querySelectorAll('[data-lab-session]').forEach(x=>x.onclick=()=>{activeSession=activeBlock.sessions.find(s=>s.id===x.dataset.labSession)||activeSession;renderSessionNav();renderLesson()})}
function renderSessionNav(){renderLabBanner();document.getElementById('sessionNav').innerHTML=activeBlock.sessions.map((s,i)=>`<button class="session-link ${s.id===activeSession.id?'active':''} ${state.completed.includes(s.id)?'done':''}" data-session="${s.id}"><span>${i+1}</span><div>${esc(s.title)}<small>${s.minutes} min</small></div>${state.completed.includes(s.id)?'<b>✓</b>':''}</button>`).join('');document.querySelectorAll('[data-session]').forEach(x=>x.onclick=()=>{activeSession=activeBlock.sessions.find(s=>s.id===x.dataset.session);renderSessionNav();renderLesson()})}

function studyHTML(s){return `<section class="studybox"><div class="study-head"><div><div class="eyebrow">DISCOVER · STUDY FIRST</div><h3>${esc(s.study.title)}</h3></div><span>${esc(s.pageRef)}</span></div>${s.study.body.map(p=>`<p>${esc(p)}</p>`).join('')}<div class="example"><strong>Example</strong><p>${esc(s.study.example)}</p></div><div class="keywords">${s.study.keywords.map(k=>`<span>${esc(k)}</span>`).join('')}</div></section>`}

function downloadsHTML(a){if(!Array.isArray(a.downloads)||!a.downloads.length)return '';return `<div class="downloads"><strong>Downloads for this session</strong><ul>${a.downloads.map(d=>`<li><a href="/datasets/${esc(d.file)}" download>${esc(d.label)}</a><span>${esc(d.note||'')}</span></li>`).join('')}</ul></div>`}
function activityHTML(s){return activityBodyHTML(s)+downloadsHTML(s.activity)}
function activityBodyHTML(s){const a=s.activity,v=state.activity[s.id]||{};if(a.kind==='quiz')return `<div class="quiz-list">${a.items.map((it,i)=>`<label><span>${esc(it[0])}</span><select data-i="${i}"><option value="">Choose…</option>${a.options.map(o=>`<option value="${esc(o)}" ${v[i]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`).join('')}</div>`;
if(a.kind==='daymap')return `<div class="daymap"><div class="daymap-head">Service · Input · AI action · Output · Benefit · Risk</div>${Array.from({length:a.rows},(_,i)=>{const r=v[i]||{};return `<div class="dayrow"><input data-i="${i}" data-f="service" placeholder="Service" value="${esc(r.service||'')}"><input data-i="${i}" data-f="input" placeholder="Input" value="${esc(r.input||'')}"><input data-i="${i}" data-f="action" placeholder="AI action" value="${esc(r.action||'')}"><input data-i="${i}" data-f="output" placeholder="Output" value="${esc(r.output||'')}"><input data-i="${i}" data-f="benefit" placeholder="Benefit" value="${esc(r.benefit||'')}"><input data-i="${i}" data-f="risk" placeholder="Risk" value="${esc(r.risk||'')}"></div>`}).join('')}</div>`;
if(a.kind==='textfields')return `<div class="text-fields">${a.fields.map((f,i)=>`<label><span>${esc(f)}</span><textarea data-i="${i}" placeholder="Write in your own words…">${esc(v[i]||'')}</textarea></label>`).join('')}</div>`;
if(a.kind==='external')return `<ol class="steps">${a.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><a class="primary external" href="${a.url}" target="_blank" rel="noopener">Open model tool ↗</a><label class="record"><span>Your experiment record</span><textarea data-single placeholder="Classes, example counts, conditions and what happened…">${esc(v.text||'')}</textarea></label>`;
if(a.kind==='lab'){const ack=Boolean(v.ack),fb=v.mode==='fallback';return `<div class="lab"><div class="lab-privacy"><strong>Before you open ${esc(a.tool.name)}</strong><ul>${a.privacy.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><label class="lab-ack"><input type="checkbox" data-ack ${ack?'checked':''}> I have read this and will follow it</label></div><ol class="steps">${a.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="lab-tools"><a id="labToolLink" class="primary external ${ack?'':'disabled'}" href="${esc(a.tool.url)}" target="_blank" rel="noopener" aria-disabled="${ack?'false':'true'}">Open ${esc(a.tool.name)} ↗</a><button type="button" class="secondary" data-fallback>${fb?'Back to the online tool':esc(a.fallback.title)}</button></div><div id="labFallback" class="lab-fallback" ${fb?'':'hidden'}><strong>${esc(a.fallback.title)}</strong><ol>${a.fallback.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><div class="text-fields">${a.fields.map((f,i)=>`<label><span>${esc(f)}</span><textarea data-i="${i}" placeholder="Write what actually happened…">${esc(v[i]||'')}</textarea></label>`).join('')}</div></div>`}
if(a.kind==='testlog')return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Actual class</th><th>Prediction</th><th>Correct?</th><th>Observation</th></tr></thead><tbody>${Array.from({length:a.rows},(_,i)=>{const r=v[i]||{};return `<tr><td>${i+1}</td><td><select data-r="${i}" data-f="actual"><option></option>${a.classes.map(o=>`<option ${r.actual===o?'selected':''}>${o}</option>`).join('')}</select></td><td><select data-r="${i}" data-f="prediction"><option></option>${a.classes.map(o=>`<option ${r.prediction===o?'selected':''}>${o}</option>`).join('')}</select></td><td>${r.actual&&r.prediction?(r.actual===r.prediction?'✓':'✕'):''}</td><td><input data-r="${i}" data-f="note" value="${esc(r.note||'')}" placeholder="angle, light, background…"></td></tr>`}).join('')}</tbody></table></div>`;
if(a.kind==='matrix'){const m=v.matrix||{};return `<div class="matrix-grid"><label><span>Actual Cup → Predicted Cup</span><input type="number" min="0" data-m="cc" value="${m.cc||0}"></label><label><span>Actual Cup → Predicted Bottle</span><input type="number" min="0" data-m="cb" value="${m.cb||0}"></label><label><span>Actual Bottle → Predicted Cup</span><input type="number" min="0" data-m="bc" value="${m.bc||0}"></label><label><span>Actual Bottle → Predicted Bottle</span><input type="number" min="0" data-m="bb" value="${m.bb||0}"></label></div><button id="calcMatrix" class="secondary">Calculate accuracy</button><div id="matrixResult" class="result"></div>`}return''}

function labEvidenceHTML(b){const items=b.sessions.filter(s=>s.activity.kind==='lab').flatMap(s=>{const v=state.activity[s.id]||{};return s.activity.fields.map((f,i)=>[f,String(v[i]||'').trim()]).filter(x=>x[1])});if(!items.length)return '';return `<div class="lab-evidence"><strong>Your Experience Lab evidence</strong><p class="muted">Use what you actually observed in the lab to support your answers.</p><dl>${items.map(([f,v])=>`<div><dt>${esc(f)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`}
function capstoneHTML(){
  if(!activeBlock||!blockDone(activeBlock))return '';
  const cap=CAPSTONES[activeBlock.id];
  if(!cap)return '';
  const saved=state.chapterAssessments?.[activeBlock.id];
  if(saved?.submittedAt)return `<section class="assessment-card chapter-capstone"><div class="eyebrow">CHAPTER ASSESSMENT · COMPLETE</div><h3>${esc(cap.title)}</h3><p><strong>${esc(saved.level||'Evaluated')}</strong> · Your ${esc(activeBlock.badge)} badge is confirmed.</p><p>The teacher can review or override this formative judgement in the admin dashboard.</p></section>`;
  if(!user)return `<section class="assessment-card chapter-capstone"><div class="eyebrow">CHAPTER ASSESSMENT · READY</div><h3>${esc(cap.title)}</h3><p>${esc(cap.brief)}</p><p><strong>Sign in with Google to submit the chapter assessment and unlock the next chapter.</strong></p></section>`;
  return `<section class="assessment-card chapter-capstone"><div class="eyebrow">CHAPTER ASSESSMENT · APPLIED CHALLENGE</div><h3>${esc(cap.title)}</h3><p>${esc(cap.brief)}</p><p class="muted">This is a work-like challenge, not a recall quiz. Use what you learned from the chapter and explain your judgement.</p>${labEvidenceHTML(activeBlock)}${cap.prompts.map((p,i)=>`<label class="record"><span>${esc(p)}</span><textarea data-capstone="${i}" placeholder="Explain your decision and evidence in your own words…"></textarea></label>`).join('')}<button id="submitCapstone" class="primary">Submit chapter assessment</button><div id="capstoneFeedback" class="result"></div></section>`;
}

function renderChapterCapstone(){const existing=document.getElementById('chapterCapstoneHost');if(existing)existing.remove();if(!activeBlock||!blockDone(activeBlock))return;const host=document.createElement('div');host.id='chapterCapstoneHost';host.innerHTML=capstoneHTML();document.getElementById('lessonPanel').appendChild(host);const btn=document.getElementById('submitCapstone');if(btn)btn.onclick=submitChapterAssessment}

async function submitChapterAssessment(){
  if(cloudError){feedback('capstoneFeedback','Cloud sync is unavailable right now, so the assessment cannot be submitted. Reload the page to reconnect, then submit again.','warn');return}
  const cap=CAPSTONES[activeBlock.id];
  const answers={};
  document.querySelectorAll('[data-capstone]').forEach(x=>answers[x.dataset.capstone]=x.value.trim());
  if(Object.values(answers).some(v=>String(v).length<25)){feedback('capstoneFeedback','Develop each answer a little further so your reasoning and evidence are clear.','warn');return}
  const btn=document.getElementById('submitCapstone');btn.disabled=true;feedback('capstoneFeedback','Evaluating your applied challenge…');
  try{
    await api('progress',{method:'PUT',body:JSON.stringify({state})});
    const data=await api(`chapter-assessment/${activeBlock.id}`,{method:'POST',body:JSON.stringify({answers})});
    state.chapterAssessments[activeBlock.id]={submittedAt:data.assessment.submittedAt,level:data.assessment.effectiveLevel||data.assessment.suggestedLevel,score:data.assessment.suggestedScore};
    reconcileBadges();
    await api('progress',{method:'PUT',body:JSON.stringify({state})});
    saveLocal();renderHome();renderChapterCapstone();
  }catch(err){feedback('capstoneFeedback',err.message,'warn');btn.disabled=false}
}

function renderLesson(){const s=activeSession,complete=state.completed.includes(s.id);document.getElementById('lessonPanel').innerHTML=`<div class="lesson-title"><div><div class="eyebrow">${esc(s.type)} · ${s.minutes} MIN</div><h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p></div>${complete?'<span class="complete-chip">✓ Evidence complete</span>':''}</div>${studyHTML(s)}<section class="activitybox"><div class="eyebrow">TRY · LEARN BY DOING</div><h3>${esc(s.activity.title)}</h3><p>${esc(s.activity.instructions)}</p>${activityHTML(s)}<div id="activityFeedback" class="result"></div></section><section class="reflectbox"><div class="eyebrow">REFLECT · YOUR WORDS</div><h3>Explain what you understood</h3><p>${esc(s.reflection)}</p><textarea id="reflectionText" placeholder="Use the study material to help you think, then explain the idea in your own words.">${esc(state.reflections[s.id]||'')}</textarea></section><div class="lesson-actions"><button id="saveSession" class="primary">${complete?'Update evidence':'Complete session'}</button><button id="hintBtn" class="secondary">Give me a hint</button></div><div id="lessonFeedback" class="result"></div>`;wireActivity(s);document.getElementById('hintBtn').onclick=()=>feedback('lessonFeedback','Use the key words above as a structure. Point to one concrete example, then explain what it shows.','warn');document.getElementById('saveSession').onclick=()=>saveSession(s);renderChapterCapstone()}

function wireActivity(s){const panel=document.getElementById('lessonPanel');panel.querySelectorAll('[data-i]').forEach(x=>x.addEventListener(x.tagName==='TEXTAREA'||x.tagName==='INPUT'?'input':'change',()=>{const a=state.activity[s.id]||{};if(x.dataset.f){const i=x.dataset.i;a[i]=a[i]||{};a[i][x.dataset.f]=x.value}else a[x.dataset.i]=x.value;state.activity[s.id]=a;scheduleSync()}));panel.querySelectorAll('[data-r]').forEach(x=>x.addEventListener(x.tagName==='INPUT'?'input':'change',()=>{const a=state.activity[s.id]||{},i=x.dataset.r;a[i]=a[i]||{};a[i][x.dataset.f]=x.value;state.activity[s.id]=a;scheduleSync();if(s.activity.kind==='testlog')renderLesson()}));const ack=panel.querySelector('[data-ack]');if(ack)ack.onchange=()=>{state.activity[s.id]={...(state.activity[s.id]||{}),ack:ack.checked};const link=document.getElementById('labToolLink');link.classList.toggle('disabled',!ack.checked);link.setAttribute('aria-disabled',ack.checked?'false':'true');scheduleSync()};const fbBtn=panel.querySelector('[data-fallback]');if(fbBtn)fbBtn.onclick=()=>{const cur=state.activity[s.id]||{},next=cur.mode==='fallback'?'tool':'fallback';state.activity[s.id]={...cur,mode:next};document.getElementById('labFallback').hidden=next!=='fallback';fbBtn.textContent=next==='fallback'?'Back to the online tool':s.activity.fallback.title;scheduleSync()};const single=panel.querySelector('[data-single]');if(single)single.oninput=e=>{state.activity[s.id]={...(state.activity[s.id]||{}),text:e.target.value};scheduleSync()};panel.querySelectorAll('[data-m]').forEach(x=>x.oninput=()=>{const a=state.activity[s.id]||{};a.matrix=a.matrix||{};a.matrix[x.dataset.m]=Math.max(0,Number(x.value)||0);state.activity[s.id]=a;scheduleSync()});const calc=document.getElementById('calcMatrix');if(calc)calc.onclick=()=>{const m=(state.activity[s.id]||{}).matrix||{},total=(m.cc||0)+(m.cb||0)+(m.bc||0)+(m.bb||0),correct=(m.cc||0)+(m.bb||0);document.getElementById('matrixResult').textContent=total?`Accuracy: ${Math.round(correct/total*100)}% (${correct}/${total} correct)`:'Enter your four counts first.'}}
function feedback(id,text,kind=''){const e=document.getElementById(id);if(!e)return;e.textContent=text;e.className='result '+kind}
function activityReady(s){const a=s.activity,v=state.activity[s.id]||{};if(a.kind==='quiz')return a.items.every((_,i)=>v[i]);if(a.kind==='daymap'){const rows=Object.values(v).filter(x=>x&&x.service);const full=rows.filter(x=>x.input&&x.action&&x.output&&x.benefit&&x.risk);return rows.length>=5&&full.length>=2}if(a.kind==='textfields')return a.fields.every((_,i)=>String(v[i]||'').trim().length>=12);if(a.kind==='external')return String(v.text||'').trim().length>=40;if(a.kind==='lab')return Boolean(v.ack)&&a.fields.every((_,i)=>String(v[i]||'').trim().length>=12);if(a.kind==='testlog')return Array.from({length:a.rows},(_,i)=>v[i]).every(r=>r?.actual&&r?.prediction);if(a.kind==='matrix'){const m=v.matrix||{},total=(m.cc||0)+(m.cb||0)+(m.bc||0)+(m.bb||0);return total>0}return true}
function saveSession(s){const reflection=document.getElementById('reflectionText').value.trim();if(!activityReady(s)){feedback('lessonFeedback','Finish the required activity evidence before completing this session.','warn');return}if(reflection.length<35){feedback('lessonFeedback','Add a little more reasoning in your own words (at least 35 characters).','warn');return}state.reflections[s.id]=reflection;if(!state.completed.includes(s.id))state.completed.push(s.id);scheduleSync();renderSessionNav();renderHome();const done=blockDone(activeBlock);feedback('lessonFeedback',done?'Chapter practical work complete. Your chapter assessment is now ready below.':'Evidence saved. Session complete.','ok');const next=activeBlock.sessions.find(x=>!state.completed.includes(x.id));if(next)setTimeout(()=>{activeSession=next;renderSessionNav();renderLesson()},450);else renderChapterCapstone()}

function renderPortfolio(){reconcileBadges();document.getElementById('portfolioPct').textContent=pct()+'%';document.getElementById('portfolioSessions').textContent=state.completed.length;document.getElementById('portfolioBadges').textContent=state.badges.length;document.getElementById('portfolioContent').innerHTML=COURSE.blocks.map(b=>`<section class="portfolio-block"><div class="eyebrow">CHAPTER ${b.number}</div><h2>${esc(b.title)}</h2><p><strong>Mission:</strong> ${esc(b.mission)}</p>${blockQualified(b)?`<span class="complete-chip">🏅 ${esc(b.badge)} · chapter assessment complete</span>`:blockDone(b)?'<span class="muted">Practical work complete · chapter assessment pending</span>':''}${b.sessions.filter(s=>state.completed.includes(s.id)).map(s=>`<article><h3>${esc(s.title)}</h3><p><strong>My reflection:</strong> ${esc(state.reflections[s.id]||'')}</p></article>`).join('')}</section>`).join('')}

async function signIn(){try{setSync('Opening Google…');await oauthLogin('google')}catch(err){setSync('Google sign-in unavailable','error');console.error(err)}}
async function signOut(){try{await logout()}catch(err){console.error(err)}user=null;cloudError=null;state=loadLocal(ANON_KEY);reconcileBadges();setSync('Local mode');renderHome();show('homeView')}
async function initAuth(){state=loadLocal(ANON_KEY);try{await handleAuthCallback()}catch(err){console.warn('Identity callback',err)}let identityUser=null;try{identityUser=await getUser()}catch(err){console.warn('Identity lookup',err)}if(!identityUser){reconcileBadges();setSync('Local mode');renderHome();return}try{const session=await api('session');user=session.student;cloudError=null;const cloud=sanitizeState(session.state);const anon=loadLocal(ANON_KEY);if(isEmpty(cloud)&&!isEmpty(anon)){state=anon;reconcileBadges();saveLocal();await api('progress',{method:'PUT',body:JSON.stringify({state})});localStorage.removeItem(ANON_KEY)}else{state=cloud;reconcileBadges();saveLocal()}setSync('Cloud synced','online')}catch(err){console.error('Session restore failed',err.status||'',err);user={id:identityUser.id,email:identityUser.email,displayName:String(identityUser.userMetadata?.full_name||identityUser.email||'Student').slice(0,80)};cloudError=err.status?`HTTP ${err.status}: ${err.message}`:(err.message||'network error');state=loadLocal(ANON_KEY);reconcileBadges();setSync('Signed in · cloud sync unavailable','error')}renderHome()}

function bind(){document.getElementById('homeBtn').onclick=()=>{renderHome();show('homeView')};document.getElementById('backBtn').onclick=()=>{renderHome();show('homeView')};document.getElementById('portfolioBack').onclick=()=>{renderHome();show('homeView')};document.getElementById('portfolioBtn').onclick=()=>{renderPortfolio();show('portfolioView')};document.getElementById('authBtn').onclick=()=>user?signOut():signIn();document.getElementById('accountAction').onclick=()=>user?signOut():signIn()}

bind();
renderHome();
initAuth();
