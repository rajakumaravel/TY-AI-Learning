const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function activeSessionId(){
  return document.querySelector('.session-link.active')?.dataset?.session || null;
}
function studyText(){
  return document.querySelector('.studybox')?.innerText || '';
}
function renderAssessment(result){
  const target=document.getElementById('lessonFeedback');
  if(!target||!result)return;
  const c=result.criteria||{};
  target.className='result assessment-result ok';
  target.innerHTML=`<div class="assessment-card"><div class="eyebrow">FORMATIVE FEEDBACK · NOT A FINAL GRADE</div><h3>${esc(result.level)}</h3><div class="assessment-criteria"><span>Understanding ${c.understanding??0}/2</span><span>Evidence ${c.evidence??0}/2</span><span>Reasoning ${c.reasoning??0}/2</span><span>Own words ${c.ownWords??0}/2</span></div>${(result.strengths||[]).length?`<p><strong>What worked:</strong> ${esc(result.strengths.join(' '))}</p>`:''}${(result.nextSteps||[]).length?`<p><strong>To go further:</strong> ${esc(result.nextSteps.join(' '))}</p>`:''}<small>Your teacher can review or override this formative assessment.</small></div>`;
}

async function requestAssessment(sessionId){
  const response=await fetch(`/api/assessment/${encodeURIComponent(sessionId)}`,{
    method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
    body:JSON.stringify({studyText:studyText()})
  });
  if(response.status===401)return;
  const data=await response.json().catch(()=>({}));
  if(response.ok)renderAssessment(data.assessment);
}

document.addEventListener('click',(event)=>{
  const button=event.target.closest('#saveSession');
  if(!button)return;
  const sessionId=activeSessionId();
  if(!sessionId)return;
  setTimeout(()=>requestAssessment(sessionId).catch(()=>{}),900);
});
