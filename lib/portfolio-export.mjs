// Phase 10 · ADR-008. Two artefacts, built from the same shape of data, deliberately not one with a switch.
// buildPortfolioExport carries the learner's own work in full. buildCoordinatorSummary carries none of it.
// Both are read-only template functions: every field they render is named explicitly (an allow-list), so a
// caller cannot accidentally widen either artefact by adding a new key to the input object.
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const NOTE='This is formative evidence from a pilot programme, not a certified qualification. Suggested assessment levels come from a keyword-based scorer with teacher override, and are useful for a conversation, not a grade to defend.';

const STYLE=`:root{color-scheme:light}*{box-sizing:border-box}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#f6f8fb;margin:0;padding:32px 6vw}h1,h2,h3{color:#202b3f;margin:0 0 8px}h1{font-size:1.9rem}h2{font-size:1.35rem;margin-top:0}h3{font-size:1.05rem}p{line-height:1.6;margin:6px 0}.export-head{border-bottom:2px solid #202b3f;padding-bottom:14px;margin-bottom:18px}.export-stats{display:flex;gap:22px;font-weight:700;color:#139589;margin:8px 0 0}.export-note{background:#fff8ea;border:1px solid #f2b400;border-radius:10px;padding:12px 14px;font-size:.88rem;margin:18px 0}.chapter{background:#fff;border:1px solid #e3e7ee;border-radius:14px;padding:18px 20px;margin-bottom:16px;break-inside:avoid}.badge-line{font-weight:800;color:#186e67}.level-line{font-weight:700}.session{border-top:1px solid #e6e9ee;padding-top:10px;margin-top:10px}.evidence-item{margin:4px 0}.evidence-item b{color:#374357}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #dbe1e8;padding:6px 8px;text-align:left;font-size:.92rem}th{background:#202b3f;color:#fff}@media print{body{background:#fff}.chapter{box-shadow:none}}`;

function doc(title,bodyHTML){
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${bodyHTML}</body></html>`;
}

function assessmentLine(a){
  if(!a||!a.level)return '';
  const label=a.teacherLevel?'Teacher level':a.suggestedLevel&&!a.teacherLevel?'Suggested level':a.source==='teacher'?'Teacher level':a.source==='suggested'?'Suggested level':'Level';
  const level=a.teacherLevel||a.suggestedLevel||a.level;
  return `<p class="level-line">${esc(label)}: ${esc(level)}</p>`;
}

function headHTML(data){
  return `<div class="export-head"><h1>${esc(data.displayName||'Student')}</h1><p>${esc(data.programmeName||'')}</p><p>Exported ${esc(data.exportDate||'')}</p><div class="export-stats"><span>${esc(String(data.completionPct??0))}% complete</span></div></div>`;
}

export function buildPortfolioExport(data={}){
  const chapters=Array.isArray(data.chapters)?data.chapters:[];
  const body=`<div class="portfolio-export">${headHTML(data)}<p class="export-note">${esc(NOTE)}</p>${chapters.map(c=>`<section class="chapter"><h2>Chapter ${esc(String(c.number??''))} · ${esc(c.title||'')}</h2>${c.badgeEarned?`<p class="badge-line">🏅 ${esc(c.badge||'')} · earned</p>`:''}${assessmentLine(c.assessment)}${(Array.isArray(c.sessions)?c.sessions:[]).map(s=>`<article class="session"><h3>${esc(s.title||'')}</h3><p>${esc(s.reflection||'')}</p></article>`).join('')}${(Array.isArray(c.evidence)&&c.evidence.length)?`<div class="evidence"><h3>Activity evidence</h3>${c.evidence.map(e=>`<p class="evidence-item"><b>${esc(e.label||'')}:</b> ${esc(e.value||'')}</p>`).join('')}</div>`:''}</section>`).join('')}${data.project?`<section class="chapter"><h2>Project · ${esc(data.project.chapter||'')}</h2>${(Array.isArray(data.project.deliverables)&&data.project.deliverables.length)?`<h3>Deliverables</h3>${data.project.deliverables.map(d=>`<p class="evidence-item">${esc(d)}</p>`).join('')}`:''}${data.project.finalRecommendation?`<h3>Final recommendation</h3><p>${esc(data.project.finalRecommendation)}</p>`:''}</section>`:''}</div>`;
  return doc(`${data.displayName||'Student'} · Portfolio export`,body);
}

export function buildCoordinatorSummary(data={}){
  const chapters=Array.isArray(data.chapters)?data.chapters:[];
  const body=`<div class="coordinator-summary">${headHTML(data)}<p class="export-note">${esc(NOTE)}</p><table><thead><tr><th>Chapter</th><th>Badge</th><th>Assessment level</th></tr></thead><tbody>${chapters.map(c=>`<tr><td>Chapter ${esc(String(c.number??''))} · ${esc(c.title||'')}</td><td>${c.badgeEarned?'🏅 '+esc(c.badge||''):'—'}</td><td>${c.assessment&&c.assessment.level?esc(c.assessment.teacherLevel||c.assessment.suggestedLevel||c.assessment.level):'—'}</td></tr>`).join('')}</tbody></table></div>`;
  return doc(`${data.displayName||'Student'} · Coordinator summary`,body);
}
