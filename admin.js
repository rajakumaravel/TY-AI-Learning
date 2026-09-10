import { getUser, oauthLogin, logout, handleAuthCallback } from "@netlify/identity";
import COURSE from "./curriculum.json";

const totalSessions = COURSE.blocks.flatMap((b) => b.sessions).length;
let identity = null;
let students = [];

const $ = (id) => document.getElementById(id);
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
  if (activity.kind === "daymap") return `AI Day Map row ${Number(key)+1}`;
  if (activity.kind === "textfields") return activity.fields?.[Number(key)] || `Response ${Number(key)+1}`;
  if (activity.kind === "testlog") return `Test ${Number(key)+1}`;
  if (activity.kind === "matrix") return "Confusion matrix";
  if (activity.kind === "external") return "Experiment record";
  if (activity.kind === "quiz") return activity.items?.[Number(key)]?.[0] || `Answer ${Number(key)+1}`;
  return `Response ${Number(key)+1}`;
}
function renderValue(value) {
  if (value == null || value === "") return '<span class="muted">No response</span>';
  if (typeof value !== "object") return esc(value);
  if (Array.isArray(value)) return value.map(renderValue).join(", ");
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
                ? `<div class="activity-evidence">${Object.entries(activity).map(([key,value])=>`<div class="evidence-item"><strong>${esc(activityLabel(session.activity,key))}</strong><div>${renderValue(value)}</div></div>`).join("")}</div>`
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
  $("refreshBtn").onclick = loadStudents;
  $("studentSearch").oninput = renderStudents;
  $("closeDetail").onclick = () => $("studentDetail").classList.add("hidden");
  if (!identity) return showGate();
  try {
    const {admin} = await api("admin/me");
    showDashboard(admin);
    await loadStudents();
  } catch (error) {
    if (error.status === 403) {
      showGate("This Google account is signed in, but it is not authorised as an administrator.");
      $("adminAuthBtn").textContent = "Sign out";
      $("adminAuthBtn").onclick = signOut;
    } else showGate(error.message);
  }
}

init();
