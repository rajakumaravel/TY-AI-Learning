import './assessment.css';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

function levelOptions(level){return ['Getting started','Getting there','Going further'].map(x=>`<option ${level===x?'selected':''}>${x}</option>`).join('')}

function renderAssessments(assessments=[],chapterAssessments=[]){
  let host=document.getElementById('assessmentReviewPanel');
  if(!host){host=document.createElement('section');host.id='assessmentReviewPanel';host.className='assessment-review-panel';document.getElementById('detailContent')?.after(host)}
  const chapterHtml=chapterAssessments.length?chapterAssessments.map(a=>`<article class="assessment-review-card" data-review-block="${esc(a.blockId)}"><div class="assessment-review-head"><strong>${esc(a.blockId==='block1'?'Chapter 1 capstone':'Chapter 2 capstone')}</strong><span>${esc(a.effectiveLevel)}</span></div>${criteria(a.criteria)}<p><strong>Suggested:</strong> ${esc(a.suggestedLevel)} (${a.suggestedScore}/8)</p><div class="activity-evidence">${Object.entries(a.answers||{}).map(([k,v])=>`<div class="evidence-item"><strong>Response ${Number(k)+1}</strong><div>${esc(v)}</div></div>`).join('')}</div>${a.strengths?.length?`<p><strong>Strength:</strong> ${esc(a.strengths.join(' '))}</p>`:''}${a.nextSteps?.length?`<p><strong>Next step:</strong> ${esc(a.nextSteps.join(' '))}</p>`:''}<label>Teacher level<select data-level>${levelOptions(a.effectiveLevel)}</select></label><label>Teacher comment<textarea data-comment placeholder="Optional formative comment">${esc(a.teacherComment||'')}</textarea></label><button class="secondary compact" data-save-chapter-review>Save chapter review</button><span class="review-status">${a.reviewedAt?'Reviewed':'Not yet reviewed'}</span></article>`).join(''):'<p class="muted">No chapter capstone submitted yet.</p>';
  const sessionHtml=assessments.length?assessments.map(a=>`<article class="assessment-review-card" data-review-session="${esc(a.sessionId)}"><div class="assessment-review-head"><strong>${esc(a.sessionId)}</strong><span>${esc(a.effectiveLevel)}</span></div>${criteria(a.criteria)}<p><strong>Suggested:</strong> ${esc(a.suggestedLevel)} (${a.suggestedScore}/8)</p>${a.strengths?.length?`<p><strong>Strength:</strong> ${esc(a.strengths.join(' '))}</p>`:''}${a.nextSteps?.length?`<p><strong>Next step:</strong> ${esc(a.nextSteps.join(' '))}</p>`:''}<label>Teacher level<select data-level>${levelOptions(a.effectiveLevel)}</select></label><label>Teacher comment<textarea data-comment placeholder="Optional formative comment">${esc(a.teacherComment||'')}</textarea></label><button class="secondary compact" data-save-review>Save teacher review</button><span class="review-status">${a.reviewedAt?'Reviewed':'Not yet reviewed'}</span></article>`).join(''):'<p class="muted">No session feedback yet.</p>';
  host.innerHTML=`<div class="eyebrow">CHAPTER ASSESSMENT REVIEW</div><h3>Applied capstones</h3><p class="muted">These applied challenges qualify chapter progression. Automated judgement is formative; teacher review remains authoritative.</p>${chapterHtml}<hr><div class="eyebrow">SESSION COACHING</div><h3>Formative session feedback</h3>${sessionHtml}`;
  host.querySelectorAll('[data-save-review]').forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest('[data-review-session]');const sessionId=card.dataset.reviewSession;btn.disabled=true;
    try{const body={level:card.querySelector('[data-level]').value,comment:card.querySelector('[data-comment]').value};await request(`admin/assessment/${encodeURIComponent(selectedStudent)}/${encodeURIComponent(sessionId)}`,{method:'PUT',body:JSON.stringify(body)});card.querySelector('.review-status').textContent='Reviewed · saved'}catch(e){card.querySelector('.review-status').textContent=e.message}finally{btn.disabled=false}
  });
  host.querySelectorAll('[data-save-chapter-review]').forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest('[data-review-block]');const blockId=card.dataset.reviewBlock;btn.disabled=true;
    try{const body={level:card.querySelector('[data-level]').value,comment:card.querySelector('[data-comment]').value};await request(`admin/chapter-assessment/${encodeURIComponent(selectedStudent)}/${encodeURIComponent(blockId)}`,{method:'PUT',body:JSON.stringify(body)});card.querySelector('.review-status').textContent='Reviewed · saved'}catch(e){card.querySelector('.review-status').textContent=e.message}finally{btn.disabled=false}
  });
}

async function loadAssessmentReview(id){
  selectedStudent=id;
  try{const data=await request(`admin/student/${encodeURIComponent(id)}`);renderAssessments(data.assessments||[],data.chapterAssessments||[])}catch{}
}

document.addEventListener('click',(event)=>{
  const btn=event.target.closest('[data-student]');if(!btn)return;setTimeout(()=>loadAssessmentReview(btn.dataset.student),250);
});
