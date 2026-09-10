const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
let selectedStudent=null;

async function request(path,opts={}){
  const r=await fetch(`/api/${path}`,{credentials:'same-origin',headers:{'content-type':'application/json',...(opts.headers||{})},...opts});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Request failed');
  return d;
}

function criteria(c={}){
  return `<div class="assessment-criteria"><span>Understanding ${c.understanding??0}/2</span><span>Evidence ${c.evidence??0}/2</span><span>Reasoning ${c.reasoning??0}/2</span><span>Own words ${c.ownWords??0}/2</span></div>`;
}

function renderAssessments(assessments=[]){
  let host=document.getElementById('assessmentReviewPanel');
  if(!host){host=document.createElement('section');host.id='assessmentReviewPanel';host.className='assessment-review-panel';document.getElementById('detailContent')?.after(host)}
  host.innerHTML=`<div class="eyebrow">FORMATIVE ASSESSMENT REVIEW</div><h3>Teacher review</h3><p class="muted">Automated suggestions support feedback only. Your review is the authoritative judgement for the pilot.</p>${assessments.length?assessments.map(a=>`<article class="assessment-review-card" data-review-session="${esc(a.sessionId)}"><div class="assessment-review-head"><strong>${esc(a.sessionId)}</strong><span>${esc(a.effectiveLevel)}</span></div>${criteria(a.criteria)}<p><strong>Suggested:</strong> ${esc(a.suggestedLevel)} (${a.suggestedScore}/8)</p>${a.strengths?.length?`<p><strong>Strength:</strong> ${esc(a.strengths.join(' '))}</p>`:''}${a.nextSteps?.length?`<p><strong>Next step:</strong> ${esc(a.nextSteps.join(' '))}</p>`:''}<label>Teacher level<select data-level><option ${a.effectiveLevel==='Getting started'?'selected':''}>Getting started</option><option ${a.effectiveLevel==='Getting there'?'selected':''}>Getting there</option><option ${a.effectiveLevel==='Going further'?'selected':''}>Going further</option></select></label><label>Teacher comment<textarea data-comment placeholder="Optional formative comment">${esc(a.teacherComment||'')}</textarea></label><button class="secondary compact" data-save-review>Save teacher review</button><span class="review-status">${a.reviewedAt?'Reviewed':'Not yet reviewed'}</span></article>`).join(''):'<p class="muted">No formative assessments yet. They appear after a signed-in student completes a session and receives feedback.</p>'}`;
  host.querySelectorAll('[data-save-review]').forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest('[data-review-session]');
    const sessionId=card.dataset.reviewSession;
    btn.disabled=true;
    try{
      const body={level:card.querySelector('[data-level]').value,comment:card.querySelector('[data-comment]').value};
      await request(`admin/assessment/${encodeURIComponent(selectedStudent)}/${encodeURIComponent(sessionId)}`,{method:'PUT',body:JSON.stringify(body)});
      card.querySelector('.review-status').textContent='Reviewed · saved';
    }catch(e){card.querySelector('.review-status').textContent=e.message}finally{btn.disabled=false}
  });
}

async function loadAssessmentReview(id){
  selectedStudent=id;
  try{const data=await request(`admin/student/${encodeURIComponent(id)}`);renderAssessments(data.assessments||[])}catch{}
}

document.addEventListener('click',(event)=>{
  const btn=event.target.closest('[data-student]');
  if(!btn)return;
  setTimeout(()=>loadAssessmentReview(btn.dataset.student),250);
});
