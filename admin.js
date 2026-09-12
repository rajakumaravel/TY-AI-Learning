import { getUser, oauthLogin, logout, handleAuthCallback } from "@netlify/identity";
import COURSE from "./curriculum.json";

const totalSessions = COURSE.blocks.flatMap((b) => b.sessions).length;
let identity = null;
let students = [];

const $ = (id) => document.getElementById(id);
const $q = (sel) => document.querySelector(sel);
const esc = (value="") => String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (value) => value ? new Intl.DateTimeFormat("en-IE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "—";

async function api(path) {
  const response = await fetch(`/api/${path}`, { credentials:"same-origin", headers:{ accept:"application/json" } });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

function progressPercent(completed=0) {
  return totalSessions ? Math.min(100, Math.round((completed / totalSessions) * 100)) : 0;
}
function chapterDone(state, block) {
  const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
  return block.sessions.every((session) => completed.has(session.id));
}
function currentChapterFromCount(completedCount) {
  const firstCount = COURSE.blocks[0]?.sessions.length || 0;
  if (completedCount >= totalSessions) return "Pilot complete";
  if (completedCount >= firstCount) return `Chapter ${COURSE.blocks[1]?.number || "02"}`;
  return `Chapter ${COURSE.blocks[0]?.number || "01"}`;
}
function activityLabel(activity, key) {
  if (!activity) return key;
  if (key === "ack") return "Safety notice acknowledged";
  if (activity.kind === "daymap") return `AI Day Map row ${Number(key)+1}`;
  if (activity.kind === "chain") return `Chain row ${Number(key)+1}`;
  if (activity.kind === "textfields") return activity.fields?.[Number(key)] || `Response ${Number(key)+1}`;
  if (activity.kind === "testlog") return `Test ${Number(key)+1}`;
  if (activity.kind === "matrix") return "Confusion matrix";
  if (activity.kind === "external") return "Experiment record";
  if (activity.kind === "lab") { if (key === "ack") return "Safety notice acknowledged"; if (key === "mode") return "Lab mode"; return activity.fields?.[Number(key)] || `Response ${Number(key)+1}`; }
  if (activity.kind === "quiz") return activity.items?.[Number(key)]?.[0] || `Answer ${Number(key)+1}`;
  if (activity.kind === "dataset") { if (key === "findings") return "Audit findings"; return `Finding ${Number(key)+1}`; }
  if (activity.kind === "prompt") { if (key === "builder") return "C-T-C-F builder"; if (key === "versions") return "Prompt versions"; if (key === "extras") return "Extra notes"; if (/^v\d+$/.test(key)) return `Prompt ${key}`; return `Extra ${Number(key)+1}`; }
  if (activity.kind === "annotate") { if (key === "marks") return "Annotated article"; return `Mark ${Number(key)+1}`; }
  if (activity.kind === "simulator") { if (key === "runs") return "Bias simulator"; if (key === "fields") return "Simulator notes"; return `Run ${Number(key)+1}`; }
  if (activity.kind === "decision") return DECISION_KEYS[key] || "AI adoption decision simulator";
  return `Response ${Number(key)+1}`;
}
// Chapter 7 decision simulator. The stored value is a structured path/runs/futures object, so it is turned into readable
// choice and evidence labels with the contract's units before the generic evidence renderer sees it.
const DECISION_KEYS = { path:"Current decision path", draft:"Unfinished choice", runs:"Recorded adoption paths", futures:"Three possible futures", fields:"Comparison and uncertainty", scenarioId:"Scenario", modelVersion:"Model version" };
const DECISION_UNITS = { humanHours:"staff hours", costEUR:"euro extra cost", automated:"automatic requests", assisted:"assisted requests", wrongA:"wrong group A outcomes", wrongB:"wrong group B outcomes", retentionDays:"days of added AI transcript storage", energyUnits:"energy index units" };
// Results come from the fixed graph, not from the stored numbers: a tampered or stale run must not be shown as fact.
function decisionResults(activity, run) {
  const terminal = (activity.nodes || []).find((n) => n.id === run?.terminalId);
  const keys = activity.metricKeys || [];
  if (!terminal || !Array.isArray(terminal.metrics) || terminal.metrics.length !== keys.length) return "Invalid saved run — not recomputable";
  return keys.map((k, i) => `${terminal.metrics[i]} ${DECISION_UNITS[k] || k}`).join(", ");
}
function decisionDisplay(activity, key, value) {
  if (!activity || activity.kind !== "decision") return value;
  const node = (id) => (activity.nodes || []).find((n) => n.id === id);
  const cardLabel = (id) => { const card = (activity.evidence || []).find((e) => e.id === id); return card ? `${card.id} — ${card.status}` : (id || "no evidence cited"); };
  const step = (s) => `${node(s?.nodeId)?.title || s?.nodeId || "unknown node"} → ${(node(s?.nodeId)?.choices || []).find((c) => c.id === s?.choiceId)?.label || s?.choiceId || "no choice"} · cited ${cardLabel(s?.evidenceId)} · ${String(s?.reason || "").trim() || "no reason given"}`;
  if (key === "path") return (Array.isArray(value) ? value : []).map(step);
  if (key === "draft") { const d = value && typeof value === "object" ? value : {}; return d.choiceId || d.evidenceId || d.reason ? { Choice: d.choiceId || "—", Evidence: d.evidenceId ? cardLabel(d.evidenceId) : "—", Reason: d.reason || "—" } : ""; }
  if (key === "runs") return (Array.isArray(value) ? value : []).map((run) => ({ Path: (Array.isArray(run?.path) ? run.path : []).map(step).join(" | "), Outcome: `${node(run?.terminalId)?.title || run?.terminalId || "unknown outcome"} (modelled possibility)`, Results: decisionResults(activity, run) }));
  if (key === "futures") return Object.fromEntries((activity.futureLabels || []).map(([k, label]) => [label, `Run ${value?.[k]?.runId ?? "—"}: ${String(value?.[k]?.text || "").trim() || "no scenario written"}`]));
  if (key === "fields") return Object.fromEntries((activity.fields || []).map(([k]) => [DECISION_KEYS.fields, String(value?.[k] || "").trim()]));
  return value;
}
function renderValue(value) {
  if (value == null || value === "") return '<span class="muted">No response</span>';
  if (typeof value !== "object") return esc(value);
  if (Array.isArray(value)) return value.some((v) => v && typeof v === "object") ? `<ol class="evidence-list">${value.map((v)=>`<li>${renderValue(v)}</li>`).join("")}</ol>` : value.map(renderValue).join(", ");
  const entries = Object.entries(value);
  if (!entries.length) return '<span class="muted">No response</span>';
  return `<dl class="evidence-dl">${entries.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${renderValue(v)}</dd></div>`).join("")}</dl>`;
}

function showGate(message="") {
  $("adminGate").classList.remove("hidden");
  $("adminDashboard").classList.add("hidden");
  $("gateMessage").textContent = message;
  $("adminAuthBtn").innerHTML = '<span class="gmark">G</span><span>Continue with Google</span>';
}
function showDashboard(admin) {
  $("adminGate").classList.add("hidden");
  $("adminDashboard").classList.remove("hidden");
  $("adminIdentity").textContent = `Signed in as ${admin.displayName || admin.email}`;
  $("adminAuthBtn").textContent = "Sign out";
}

async function loadStudents() {
  const data = await api("admin/students");
  students = data.students || [];
  renderStudents();
}

// Pilot analytics: aggregates only, already suppressed by the server. This view never renders a display name, a
// learner id or a reviewed_by, and never turns a suppressed figure back into a number — see ADR-008 §3.
const blockLabel = (id) => id === "none" ? "Not started" : (() => { const b = COURSE.blocks.find((x) => x.id === id); return b ? `Chapter ${b.number} · ${b.title}` : id; })();
function analyticsCell(cell) {
  return cell && cell.suppressed ? `<td data-suppressed>${esc(cell.label)}</td>` : `<td data-count>${cell ? cell.count : 0}</td>`;
}
function ensureAnalyticsSection() {
  if ($("adminAnalytics")) return;
  $("studentDetail").insertAdjacentHTML("beforebegin", `<section id="adminAnalytics" class="admin-panel">
    <div class="admin-toolbar"><div><h2>Pilot analytics</h2><p id="analyticsNote"></p></div></div>
    <div class="analytics-grid">
      <div><h3>Completion</h3><table class="admin-table" data-measure="completion"><thead><tr><th>Chapters completed</th><th>Learners</th></tr></thead><tbody></tbody></table></div>
      <div><h3>Resubmission and improvement</h3><table class="admin-table" data-measure="improvement"><thead><tr><th>Change from suggested to teacher level</th><th>Learners</th></tr></thead><tbody></tbody></table></div>
      <div><h3>Chapter drop-off</h3><table class="admin-table" data-measure="dropoff"><thead><tr><th>Last completed session in</th><th>Learners</th></tr></thead><tbody></tbody></table></div>
      <div><h3>System-vs-teacher agreement</h3><table class="admin-table" data-measure="agreement"><thead><tr><th>Suggested level</th><th>Teacher level</th><th>Learners</th></tr></thead><tbody></tbody></table></div>
      <div><h3>Experience Lab completion</h3><table class="admin-table" data-measure="labs"><thead><tr><th>Chapter</th><th>Learners completing every lab stage</th></tr></thead><tbody></tbody></table></div>
      <div><h3>Qualitative feedback</h3><div data-measure="feedback"></div></div>
    </div>
  </section>`);
}
function renderAnalytics(analytics) {
  ensureAnalyticsSection();
  $("analyticsNote").textContent = analytics.note;
  $q('[data-measure="completion"] tbody').innerHTML = analytics.completion.buckets.map((b) => `<tr><td>${b.chaptersCompleted}</td>${analyticsCell(b)}</tr>`).join("");
  $q('[data-measure="improvement"] tbody').innerHTML = analytics.improvement.categories.map((c) => `<tr><td>${esc(c.change)}</td>${analyticsCell(c)}</tr>`).join("");
  $q('[data-measure="dropoff"] tbody').innerHTML = analytics.dropoff.chapters.map((c) => `<tr><td>${esc(blockLabel(c.blockId))}</td>${analyticsCell(c)}</tr>`).join("");
  $q('[data-measure="agreement"] tbody').innerHTML = analytics.agreement.matrix.map((m) => `<tr><td>${esc(m.suggestedLevel)}</td><td>${esc(m.teacherLevel)}</td>${analyticsCell(m)}</tr>`).join("");
  $q('[data-measure="labs"] tbody').innerHTML = analytics.labs.chapters.map((c) => `<tr><td>${esc(blockLabel(c.blockId))}</td>${analyticsCell(c)}</tr>`).join("");
  const feedback = $q('[data-measure="feedback"]');
  feedback.innerHTML = analytics.feedback.suppressed
    ? `<p data-suppressed>${esc(analytics.feedback.label)}</p>`
    : (analytics.feedback.quotes.length ? `<ul class="feedback-quotes">${analytics.feedback.quotes.map((q) => `<li>“${esc(q)}”</li>`).join("")}</ul>` : `<p class="muted">No eligible quotations.</p>`);
}
async function loadAnalytics() {
  try { const { analytics } = await api("admin/analytics"); renderAnalytics(analytics); }
  catch (error) { console.warn("Analytics", error); ensureAnalyticsSection(); const note = $("analyticsNote"); if (note) note.textContent = "Pilot analytics could not be loaded. Press Refresh to try again."; }
}
function renderStudents() {
  const q = $("studentSearch").value.trim().toLowerCase();
  const visible = students.filter((s)=>!q || String(s.displayName||"").toLowerCase().includes(q));
  const ch1Sessions = COURSE.blocks[0]?.sessions.length || 0;
  $("metricStudents").textContent = students.length;
  $("metricProgress").textContent = students.length ? `${Math.round(students.reduce((n,s)=>n+progressPercent(s.completedCount),0)/students.length)}%` : "0%";
  $("metricChapter1").textContent = students.filter((s)=>s.completedCount >= ch1Sessions).length;
  $("metricPilot").textContent = students.filter((s)=>s.completedCount >= totalSessions).length;
  $("emptyStudents").classList.toggle("hidden", visible.length > 0);
  $("studentRows").innerHTML = visible.map((s)=>{
    const pct=progressPercent(s.completedCount);
    return `<tr>
      <td><strong>${esc(s.displayName || "Student")}</strong><small>${s.completedCount}/${totalSessions} sessions</small></td>
      <td><div class="mini-progress"><span style="width:${pct}%"></span></div><small>${pct}%</small></td>
      <td>${esc(currentChapterFromCount(s.completedCount))}</td>
      <td>${s.badgeCount || 0}</td>
      <td>${esc(fmt(s.updatedAt || s.lastLoginAt))}</td>
      <td><button class="secondary compact" data-student="${esc(s.id)}">View work</button></td>
    </tr>`;
  }).join("");
  document.querySelectorAll("[data-student]").forEach((button)=>button.onclick=()=>openStudent(button.dataset.student));
}

async function openStudent(id) {
  $("studentDetail").classList.remove("hidden");
  $("detailContent").innerHTML = '<p class="admin-loading">Loading student evidence…</p>';
  $("studentDetail").scrollIntoView({behavior:"smooth",block:"start"});
  try {
    const {student,state} = await api(`admin/student/${encodeURIComponent(id)}`);
    const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
    $("detailName").textContent = student.displayName || "Student";
    $("detailMeta").textContent = `Last activity ${fmt(student.updatedAt || student.lastLoginAt)}`;
    $("detailStats").innerHTML = `<div><strong>${progressPercent(completed.size)}%</strong><span>progress</span></div><div><strong>${completed.size}/${totalSessions}</strong><span>sessions</span></div><div><strong>${Array.isArray(state.badges)?state.badges.length:0}</strong><span>badges</span></div>`;
    $("detailContent").innerHTML = COURSE.blocks.map((block)=>{
      const done=chapterDone(state,block);
      return `<section class="evidence-chapter">
        <div class="evidence-chapter-head"><div><div class="eyebrow">CHAPTER ${esc(block.number)}</div><h3>${esc(block.title)}</h3></div><span class="${done?"status-done":"status-open"}">${done?"✓ Complete":"In progress"}</span></div>
        ${block.sessions.map((session)=>{
          const isDone=completed.has(session.id);
          const reflection=state.reflections?.[session.id];
          const activity=state.activity?.[session.id];
          return `<details class="evidence-session">
            <summary><span>${isDone?"✓":"○"}</span><strong>${esc(session.title)}</strong><small>${isDone?"Evidence complete":"Not completed"}</small></summary>
            <div class="evidence-body">
              <h4>Reflection · student’s own words</h4>
              <div class="student-answer">${reflection?esc(reflection):'<span class="muted">No reflection submitted.</span>'}</div>
              <h4>Activity evidence</h4>
              ${activity && typeof activity==="object" && Object.keys(activity).length
                ? `<div class="activity-evidence">${Object.entries(activity).map(([key,value])=>`<div class="evidence-item"><strong>${esc(activityLabel(session.activity,key))}</strong><div>${renderValue(decisionDisplay(session.activity,key,value))}</div></div>`).join("")}</div>`
                : '<p class="muted">No activity evidence saved.</p>'}
            </div>
          </details>`;
        }).join("")}
      </section>`;
    }).join("");
  } catch (error) {
    $("detailContent").innerHTML = `<p class="admin-error">${esc(error.message)}</p>`;
  }
}

async function signIn() { await oauthLogin("google"); }
async function signOut() { await logout(); identity = null; students = []; showGate(); }

async function init() {
  try { await handleAuthCallback(); } catch (error) { console.warn("Identity callback", error); }
  identity = await getUser();
  $("adminSignIn").onclick = signIn;
  $("adminAuthBtn").onclick = () => identity ? signOut() : signIn();
  $("refreshBtn").onclick = () => { loadStudents(); loadAnalytics(); };
  $("studentSearch").oninput = renderStudents;
  $("closeDetail").onclick = () => $("studentDetail").classList.add("hidden");
  if (!identity) return showGate();
  try {
    const {admin} = await api("admin/me");
    showDashboard(admin);
    await loadStudents();
    await loadAnalytics();
  } catch (error) {
    if (error.status === 403) {
      showGate("This Google account is signed in, but it is not authorised as an administrator.");
      $("adminAuthBtn").textContent = "Sign out";
      $("adminAuthBtn").onclick = signOut;
    } else showGate(error.message);
  }
}

init();
