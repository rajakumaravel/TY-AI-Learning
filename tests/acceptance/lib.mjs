// Shared helpers for live acceptance scripts. Keys come from the Supabase CLI (`supabase login`) and are never printed.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export const BASE = (process.env.ACCEPTANCE_BASE_URL || '').replace(/\/$/, '');
export const REF = process.env.SUPABASE_PROJECT_REF || 'fnnftbsalquzwgzlsovx';
export const SUPABASE_URL = `https://${REF}.supabase.co`;
if (!BASE) { console.error('Set ACCEPTANCE_BASE_URL to the deployment under test.'); process.exit(2); }

const keys = JSON.parse(execFileSync('supabase', ['projects', 'api-keys', '--project-ref', REF, '-o', 'json'], { encoding: 'utf8' }));
export const ANON = keys.find(k => k.name === 'anon')?.api_key;
const SERVICE = keys.find(k => k.name === 'service_role')?.api_key;
if (!ANON || !SERVICE) { console.error('Could not read anon/service_role keys from Supabase CLI.'); process.exit(2); }

export const results = [];
export function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  (${detail})` : ''}`); }
export function finish() {
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed against ${BASE}`);
  process.exit(failed ? 1 : 0);
}

export async function api(path, token, init = {}) {
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${BASE}/api/${path}`, { ...init, headers });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
export async function rest(table, query, token, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers || {}) } });
  let body = null; try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}
export async function createUser(label, appMetadata = {}) {
  const email = `acceptance-${label}-${randomUUID().slice(0, 8)}@ty-ai-learning.test`;
  const password = randomUUID() + randomUUID();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: `Acceptance ${label}` }, app_metadata: appMetadata }) });
  if (!res.ok) throw new Error(`createUser ${label}: HTTP ${res.status} ${await res.text()}`);
  const user = await res.json();
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!login.ok) throw new Error(`login ${label}: HTTP ${login.status} ${await login.text()}`);
  const session = await login.json();
  return { id: user.id, token: session.access_token, session, displayName: `Acceptance ${label}` };
}
export async function deleteUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
  return res.ok;
}
export async function cleanup(users) {
  for (const u of users) check(`cleanup: deleted test user ${u.id.slice(0, 8)}`, await deleteUser(u.id));
}

export const CHAPTER1_SESSIONS = ['b1s1', 'b1lab', 'b1s2', 'b1s3', 'b1s4'];
export const CAPSTONE1_ANSWERS = {
  q1: 'INPUT: student interests survey plus click and attendance data. AI ACTION: rank clubs by predicted enjoyment. OUTPUT: top three after-school activity recommendations for each student.',
  q2: 'Benefit: students discover clubs they would not have searched for. Risk: it recommends only popular clubs and hides minority interests. Other stakeholder: club coordinators whose numbers change.',
  q3: 'The final choice of which club to join and any decision to exclude a student should stay with the student and a teacher, because the model cannot see wellbeing or timetable context.'
};
export const CHAPTER2_SESSIONS = ['b2s1', 'b2s2', 'b2s3', 'b2s4', 'b2s5', 'b2s6', 'b2s7'];
export const CAPSTONE2_ANSWERS = {
  q1: 'The 80% accuracy tells me the model got 8 of 10 unseen tests right, so it usually works. It fails to tell me which class the errors fall on or why, because both cup misses were on dark backgrounds and accuracy hides that pattern.',
  q2: 'The model learned a background shortcut: light background means cup, dark background means bottle. The evidence is that the training data paired cups with light backgrounds and bottles with dark ones, and the only failures were cups photographed on dark backgrounds.',
  q3: 'Change the training data so each class has a balanced mix of light and dark backgrounds, then retrain and retest V2 on exactly the same 10 unseen images plus new dark-background cups, and compare the confusion matrix with V1 to check the shortcut is gone.'
};
export const CHAPTER3_SESSIONS = ['b3s1', 'b3s2', 'b3s3', 'b3s4', 'b3s5', 'b3s6'];
export const CAPSTONE3_ANSWERS = {
  q1: 'The homework-help app collects volunteered data such as the question a student types, observed data such as the time of night, how long they spend and what they retry, and inferred data such as an ability band guessed from the question history. The question is needed for the stated purpose of answering it; the timing and retry tracking go beyond that purpose and fail data minimisation; the inferred ability band is never collected from the student and is not needed to help with homework.',
  q2: 'Students without a phone or wifi at home, students who joined mid-year and students who only ask when they are stuck are missing or misrepresented, so the dataset is not representative. The inferred ability band could label them as weak from a handful of questions, be shown to a teacher and shape decisions about them, and a wrong band is hard to spot or correct.',
  q3: 'The inferred ability band should not be collected at all, and cookies or tracking of when a student is online should be dropped; any use of question logs to group students needs human review by a teacher. Public means visible, not free to reuse, and consent buried in a 40-page policy is not real consent, so under GDPR the app should collect for a clear purpose, keep a short retention period and let students see and delete their data.'
};
export const CHAPTER4_SESSIONS = ['b4s1', 'b4s2', 'b4s3', 'b4s4', 'b4s5', 'b4s6', 'b4s7', 'b4s8', 'b4s9', 'b4s10'];
export const CAPSTONE4_ANSWERS = {
  q1: 'Rebuild the prompt with C-T-C-F. Context: I am a TY student preparing a five-minute talk for classmates and I already know the basics of wind and solar. Task: outline the talk, one verb. Constraints: 300 words, plain language, no figures without a named source. Format: bullet points, and ask me questions first. Each part narrows the pattern prediction so the output fits the job instead of the most likely generic answer.',
  q2: 'The two figures and the citation need verification because a generative model produces citations by pattern and some are invented. I would check each figure against an official source such as the SEAI or the CSO and search for the cited report by its title and author. A hallucination here would be a fluent, confident sentence with a percentage or a report name that no source backs up.',
  q3: 'Asking "Why is wind better than solar?" frames the answer so the model feeds confirmation bias and argues one side, while "Compare wind and solar" asks for both sides. The student is responsible for the framing, so they should ask the neutral version, compare the two outputs and verify any claim before it goes into the talk.'
};
export const CHAPTER5_SESSIONS = ['b5s1', 'b5s2', 'b5s3', 'b5s4', 'b5s5', 'b5s6', 'b5s7', 'b5s8', 'b5s9'];
export const CAPSTONE5_ANSWERS = {
  q1: 'The post claims a "discipline prediction" AI flags students who are "likely to cause trouble" and cites "a study" with no link, so the study, the chain of training centres and the headline itself are all unsupported claims; the screenshot shows no source. Forty reposts and two news sites using the post as their source is still one source, not many. The bias risk in a system like this is that past discipline records encode selection and representation bias, so students from groups who were punished more in the past get flagged more, and staff trust the flag because a machine produced it, which is automation bias.',
  q2: 'I would stop before sharing, investigate who made the post, then open new tabs and find better coverage from independent sources such as the training centre chain itself, a regulator or a named researcher, and check whether the two news sites did anything more than repeat the post. I would search for the study by title and author rather than asking a chatbot. I would rewrite the post to keep only what can be verified, label the study and the flagging claim as uncertain, name the sources I found, and remove the loaded framing about students causing trouble.',
  q3: 'Tracing the evidence: the two news sites cite the post, the post cites a screenshot of a headline, and the headline cites a study that nobody links, so the earliest available source is the screenshot and context could have been lost at every step. If the system exists, bias could enter before the data through unequal past discipline, at collection if only some centres log incidents, at labelling if "trouble" is judged differently across groups, through a proxy such as postcode, in training when the majority pattern wins, in evaluation if difficult cases are missing, and in use when staff act on the flag without review. After checking I would still be uncertain whether the study exists, how the model was tested on each group, and whether anyone was actually affected, so I would say that clearly instead of guessing.'
};

export const CHAPTER6_SESSIONS = ['b6s1', 'b6s2', 'b6s3', 'b6s4', 'b6s5', 'b6s6', 'b6s7', 'b6s8'];
export const CAPSTONE6_ANSWERS = {
  q1: 'Use an AI tutor to scaffold understanding of averages, first asking what the assistant knows, then an example and a question, waiting for an attempt before feedback. The assistant must calculate a small average and explain the denominator without AI before analysing the workshop feedback. AI can critique wording, but authorship and the choice of which ratings count remain with the assistant.',
  q2: 'Preserve the 12 returned forms as raw_v1 and profile blanks, IDs and duplicates before cleaning a working copy. Compare every field before removing the one exact duplicate, and flag the two unanswered rating cells instead of inventing ratings. Validate by reconciling removed and held records, define valid ratings from the source form, and calculate the mean of eligible answered ratings with a formula and explicit denominator. We cannot assume whether blanks overlap the duplicate, so the included count must come from the records. Hand-check an example and compare every report claim with the feedback; the assistant is accountable for these checks.',
  q3: 'Repeatable workflow: preserve, profile, define rules, clean with a log, validate, calculate, ask AI for critique, then human review before the placement team approves use. A person must verify the duplicate comparison and missing-value exclusions before analysis, check formulas and every claim before drafting, and approve the briefing before circulation. Reject every attendee was satisfied because unanswered ratings and returned forms do not establish all attendees were satisfied; reject a more popular next workshop because feedback is not a future attendance measure. Disclose the AI tutor and editing assistance to the placement team, explain the human checks and retained authorship, and check its expectations before sharing.'
};
// Compact assessable evidence for the deterministic sample route. Source row numbers exclude the header.
export const CHAPTER6_FIELDS = {
  b6s1: [
    'How much flour is half of three quarters of a cup? I predict tutoring will show my own thinking; sample route.',
    'Give me the answer: how much flour is half of three quarters of a cup? Sample A says three eighths.',
    'Teach me through questions. Sample B asks what happens if a quarter is split in two. I attempted one eighth before reading feedback.',
    'The tutoring conversation records my attempt and reasoning about equal pieces, which I can defend to the training centre.'
  ],
  b6s2: [
    'Sample concept: fractions in a recipe. Before this I could name quarters but could not explain how to halve three quarters.',
    'Find out what I know about fractions in a recipe, give an example and ask questions. Hold back the full explanation until I have tried.',
    'Sample interaction: denominator question → my attempt: number of equal parts. Halve quarters example → my attempt: eight equal pieces. Half of three quarters → my attempt: three eighths. Then I read feedback and compared my reasoning.',
    'I learned that halving each quarter makes eighths; three quarters halved is three eighths. I still need practice with thirds. Repair if needed: give one hint and wait for my attempt.'
  ],
  b6s3: [
    'With the sample hidden, my memory explanation: quarters split in half make eighths; half of three quarters is three eighths because each of the three pieces is halved.',
    'Before b6s2 I could name quarters; now I can explain the smaller pieces. I cannot yet explain all fraction divisions without another attempt.',
    'After my memory attempt I drew four equal sections, halved each, and shaded three eighths to check it without AI.'
  ],
  b6s4: [
    'Saved ai-work-event-budget-raw.csv as raw_v1.csv and copied to open-day-working.ods. Raw sheet kept untouched; separate working, profile, rules, cleaning log, validation and analysis sheets.',
    'Before: 12 rows × 5 fields; 1 blank (9 quantity), 1 surplus exact duplicate (11 of 3), 2 repeated-ID groups E03/E07, 1 conflicting group E07 (7 and 12), 1 invalid quantity (-1 at 10), 3 category cells and 1 euro-format cell.',
    'Dictionary from brief: item_id text, one cost line; category text Venue/Materials/Catering/Transport; item text description; quantity integer units 1–100; unit_cost_eur numeric EUR/unit 0–500. Full-field matches alone are exact duplicates; hold conflicting IDs and missing/invalid quantities.',
    'Row / field | Original | Issue | Action | Reason | Verified by\n2/category | materials[space] | case/space | Materials | valid category | brief\n4/cost | €1.50 | format | 1.50 | same euro value | brief\n5/category | transport | case | Transport | valid category | brief\n8/category | Vneue | typo | Venue | explicit mapping | brief\n11/all | E03,Catering,Juice cartons,6,3 | duplicate | remove | full match | row 3\n7/ID | E07;2 | conflict | hold unchanged | no source for choice | row 12/brief\n12/ID | E07;20 | conflict | hold unchanged | no source for choice | row 7/brief\n9/quantity | blank | missing | flag unchanged | no correction evidence | brief\n10/quantity | -1 | range | flag unchanged | no refunds | brief',
    'After: raw preserved; 11 retained × 5 fields, zero surplus exact duplicates, categories and euro format resolved; 1 blank, 1 invalid quantity and 2 conflicting records still held. 12 = 1 removed + 11 retained; 11 = 7 eligible + 4 held (7,9,10,12). No guess or silent correction.',
    'Eligible source rows 1,2,3,4,5,6,8. Analysis sheet A source row, B category, C quantity, D numeric EUR/unit, E =C2*D2 through E8. Line costs 80,20,18,15,60,36,20; =SUM(E2:E8) gives €249.00; =SUMIF(B2:B8;"Venue";E2:E8) €100.00, Materials €35.00, Catering €54.00, Transport €60.00; =COUNT(E2:E8) 7; =AVERAGE(E2:E8) €35.57. Exclude raw 11 duplicate and held 7,9,10,12.',
    'Sample route. Prompt: critique my validated eligible subtotal and category breakdown, with seven included lines and four held records; retain limitations. Figures supplied: €249 subtotal, Venue €100, Materials €35, Catering €54, Transport €60. Prepared sample suggests venue €100, total €300, attendance rising 20%; I will check all claims in b6s5.'
  ],
  b6s5: [
    'Every-claim checklist: venue €100 | analysis E2+E8=80+20 | supported | keep; eligible €300 | SUM(E2:E8)=249 | wrong | replace; attendance +20% | brief has no attendance/history | uncertain | remove. Final claims: seven eligible lines COUNT(E2:E8)=7; category SUMIF totals 100/35/54/60; mean AVERAGE(E2:E8)=35.57; four held rows per validation; each supported. Hand-check raw row 4: 10×1.50=15. Formula ranges E2:E8 match source rows 1,2,3,4,5,6,8.',
    'Removed attendance will rise by 20% because no attendance baseline exists. Replaced €300 with €249.00 by formula. Qualified costs as partial because rows 7,9,10,12 are unresolved; checked every saved and final claim against formulas or brief.',
    'Known partial costs €249.00 from 7 eligible lines: Venue €100.00; Materials €35.00; Catering €54.00; Transport €60.00. Mean eligible line cost €35.57. Four records held: E07 conflicts, E09 missing quantity, E10 invalid quantity. Not the complete budget; no attendance prediction.',
    'Human sign-off: I checked all numerical and factual claims, hand-calculated a line, inspected formula ranges and exclusions. Source checks must resolve E07/E09/E10; events lead must approve before spending.'
  ],
  b6s6: [
    'Please review known partial costs of €249.00 from seven eligible lines. Venue €100, Materials €35, Catering €54, Transport €60; mean €35.57. Four records remain unresolved and require source checks before approval.',
    'Sample route editing prompt: edit for clarity and professional tone while preserving meaning, figures and caveats. Suggested: Please review the recorded costs before approving spending. The figures are complete and ready for approval.',
    'Accepted the polite request for review. Rejected complete and ready for approval because it removes the caveat about four unresolved records. Compared each sentence with my draft, checklist and brief.',
    'Events team: please review known partial costs €249.00 across seven eligible lines (Venue €100, Materials €35, Catering €54, Transport €60; mean €35.57). Four records remain held pending source checks; events lead approval is required before spending. AI samples helped me learn and edit; I calculated and checked the figures, rejected unsupported wording and kept responsibility for this draft.'
  ],
  b6s8: [
    'AI helps me practise a concept through questions after I record my starting point; I attempt answers and explain from memory. It may critique a briefing only after I calculate and verify figures.',
    'AI does not replace my thinking, authorship or decisions. Repeatable sequence: I preserve/profile/define/clean/log/validate; I verify formulas before asking for critique; I check each claim and caveat; the events lead approves before spending.',
    'I disclose AI tutoring and editing in assessed work and workplace briefings, describe my checks and ask the training centre or client about expectations first. I explain rejected suggestions as evidence of my responsibility.'
  ]
};
export const CHAPTER6_DISCLOSURE = [
  ['Private brainstorming','no','Private ideas for myself need no disclosure unless they become shared work.','No disclosure needed for this private stage.'],
  ['Assessed work at the training centre','disclose','The assessor expects evidence of my thinking; follow its rules.','AI asked practice questions and edited wording; I checked and wrote the final work.'],
  ['CV with made-up details','check expectations first','An employer expects accurate skills; no invented experience.','I used AI for wording and verified every claim in this fictional CV.'],
  ['Workplace report','disclose','The team decides spending and needs to know how it was checked.','AI suggested wording; I calculated figures and removed unsupported claims.'],
  ['Creative project','check expectations first','A partner might disclose every suggestion; I might disclose substantial dialogue only. Both depend on agreed authorship expectations.','I would agree a credit line with collaborators before sharing the project.']
];
export const CHAPTER6_RECOMMENDATION = 'Rely on the €249.00 partial subtotal from seven eligible lines and the checked category breakdown, not a complete budget. Keep E07 conflicts, E09 missing quantity and E10 invalid quantity unresolved until source checks. Remove the attendance prediction and keep caveats. A human checks every claim and the events lead approves before spending. Disclose AI tutoring and editing, the sample route and the checks I performed; check training centre expectations for assessed work.';

// Real clicks and typing for all eight sessions, capstone and project; no live chatbot dependency.
export async function completeChapter6UI(page, afterSession = async () => {}) {
  await page.click('#homeBtn');
  await page.waitForFunction(() => { const b=document.querySelector('[data-block="5"]');return b&&!b.disabled&&!b.classList.contains('locked'); }, null, { timeout: 15000 });
  await page.click('[data-block="5"]');
  await page.waitForSelector('#labBanner .lab-stage');
  check('Chapter 6 has six stages and book myth-busters', (await page.$$('#labBanner .lab-stage')).length===6 && /automating the right parts/i.test(await page.textContent('#mythBusters')));
  for (const sid of CHAPTER6_SESSIONS) {
    await page.click(`[data-session="${sid}"]`);
    await page.waitForFunction(id=>document.querySelector('.session-link.active')?.dataset.session===id,sid);
    if (['b6s1','b6s2','b6s4','b6s6'].includes(sid)) {
      check(`${sid} separately gates AI link`, await page.$eval('#labToolLink',el=>el.getAttribute('aria-disabled')==='true'));
      await page.click('[data-fallback]');
      check(`${sid} sample fallback visible`, await page.$eval('#labFallback',el=>!el.hidden));
      for (let i=0;i<CHAPTER6_FIELDS[sid].length;i++) await page.fill(`textarea[data-i="${i}"]`,CHAPTER6_FIELDS[sid][i]);
      await page.fill('#reflectionText','I used the prepared sample and independently checked my own thinking and evidence.');
      await page.click('#saveSession');
      check(`${sid} sample route still requires acknowledgement`, /Finish the required/.test(await page.textContent('#lessonFeedback')));
      await page.check('[data-ack]');
      check(`${sid} acknowledgement enables link`,await page.$eval('#labToolLink',el=>el.getAttribute('aria-disabled')==='false'));
    } else {
      check(`${sid} has no AI tool link`,!(await page.$('#labToolLink')));
    }
    if (sid==='b6s4') {
      await page.waitForSelector('[data-dataset="ai-work-event-budget-raw.csv"][data-readonly] .dataset-table tbody tr');
      const cells=await page.$$eval('.dataset-table tbody tr',rows=>rows.map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent)));
      check('b6s4 viewer preserves all 12 raw records including planted values',cells.length===12&&cells.every(r=>r.length===5)&&cells[1][1]==='materials '&&cells[8][3]===''&&cells[9][3]==='-1'&&cells[10].join()===cells[2].join());
      const included=[0,1,2,3,4,5,7].map(i=>Number(cells[i][3])*Number(cells[i][4].replace('€','')));
      check('b6s4 acceptance evidence agrees with raw arithmetic',included.reduce((a,b)=>a+b,0)===249&&(included.reduce((a,b)=>a+b,0)/included.length).toFixed(2)==='35.57');
    }
    if (sid==='b6s7') {
      for (let i=0;i<5;i++) for (const [j,key] of ['scenario','decision','reason','wording'].entries()) await page.fill(`input[data-i="${i}"][data-f="${key}"]`,CHAPTER6_DISCLOSURE[i][j]);
    } else {
      for (let i=0;i<CHAPTER6_FIELDS[sid].length;i++) await page.fill(`textarea[data-i="${i}"]`,CHAPTER6_FIELDS[sid][i]);
    }
    const downloads=await page.$$eval('.downloads a[download]',els=>els.map(e=>e.href));
    for (const href of downloads) check(`${sid} download served: ${href.split('/').pop()}`,(await fetch(href)).status===200);
    await page.fill('#reflectionText',sid==='b6s3'?'I can now explain why halving quarters makes eighths; my drawing checked the memory explanation.':sid==='b6s5'?'I am accountable for the formulas and every claim; I removed a prediction the brief could not support.':'I kept my own attempts and checked the evidence before accepting AI suggestions; unresolved questions need a human source check.');
    await page.click('#saveSession');
    await page.waitForFunction(()=>/complete/i.test(document.getElementById('lessonFeedback')?.textContent||''),null,{timeout:15000});
    check(`${sid} saves complete evidence`,/complete/i.test(await page.textContent('#lessonFeedback')));
    await afterSession(sid);
  }
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]');
  check('Chapter 6 shows self-check and level-up',Boolean(await page.$('.self-check'))&&Boolean(await page.$('.level-up')));
  for (const [i,answer] of Object.values(CAPSTONE6_ANSWERS).entries()) await page.fill(`textarea[data-capstone="${i}"]`,answer);
  await page.click('#submitCapstone');
  await page.waitForFunction(()=>/COMPLETE/.test(document.getElementById('chapterCapstoneHost')?.textContent||''),null,{timeout:20000});
  check('Chapter 6 capstone qualified',/Going further/.test(await page.textContent('#chapterCapstoneHost')));
  await page.waitForSelector('#projectWorkspaceBtn-block6',{timeout:15000});
  await page.click('#projectWorkspaceBtn-block6');
  await page.waitForSelector('#projectWorkspaceModal.open');
  await page.click('#pwImportLab');
  await page.waitForFunction(()=>/Imported/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  const imported=await page.$$eval('#pwEvidence textarea',els=>els.map(e=>e.value).join('\n'));
  check('Chapter 6 import retains six stages, cleaning log, validation and human-review decisions',(await page.$$('#pwEvidence .pw-evidence')).length===6&&/Row \/ field/.test(imported)&&/11 retained/.test(imported)&&/Removed attendance/.test(imported));
  await page.click('#pwAddLog');
  await page.click('#pwAddEvidence');
  const extra=page.locator('#pwEvidence .pw-evidence').last();
  await extra.locator('[data-f="label"]').fill('Disclosure choices');
  await extra.locator('[data-f="note"]').fill(CHAPTER6_DISCLOSURE.map(r=>r.join(' → ')).join('; '));
  await page.fill('#pwLog textarea[data-f="did"]','Preserved the raw budget, profiled and cleaned a working copy, calculated eligible figures, checked every claim and rejected unsupported edits.');
  await page.fill('#pwLog textarea[data-f="result"]','Seven eligible lines total €249.00; four records remain held; removed the attendance claim and retained human approval.');
  await page.fill('#pwRecommendation',CHAPTER6_RECOMMENDATION);
  await page.click('#pwSave');
  await page.waitForFunction(()=>/Saved/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  await page.click('#pwSubmit');
  await page.waitForFunction(()=>/submitted/i.test(document.querySelector('.pw-status')?.textContent||''),null,{timeout:15000});
  const kept=await page.$$eval('#pwEvidence .pw-evidence',rows=>rows.map(r=>({label:r.querySelector('[data-f="label"]')?.value||'',note:r.querySelector('[data-f="note"]')?.value||''})));
  check('Chapter 6 project submitted with disclosure and final recommendation',/submitted/i.test(await page.textContent('.pw-status'))&&kept.some(r=>r.label==='Disclosure choices'&&r.note.includes('Private brainstorming')));
  await page.click('.pw-close');
}

export const CHAPTER7_SESSIONS = ['b7s1', 'b7s2', 'b7s3', 'b7s4', 'b7s5', 'b7s6', 'b7s7', 'b7s8'];
export const CAPSTONE7_ANSWERS = {
  q1: 'A plausible task change for the community bus service is that allocating standard booking requests becomes automated while phone-assisted bookings stay augmented: narrow AI sorts a request against the timetable and a person still judges the unusual ones. Automation replaces the task; augmentation keeps a driver or booking clerk in the loop with the AI drafting a suggestion; AGI is a hypothetical general capability, not what a booking allocator is. The opportunity in the evidence is that the supplier sandbox served 48 of 50 standard bookings against the human baseline of 45 of 50, and the estimated four staff hours released weekly could go to passengers who need help. The risk is in the same evidence: on phone-assisted bookings the sandbox served 12 of 20 where people served 14 of 20, so the group that needs the staffed phone route does worse, and future skills such as checking an allocation matter more, not less.',
  q2: 'Three possible futures for the same bus service. Optimistic: a pilot keeps the staffed phone route, drivers get training and authority to override, and AI drafts standard allocations only; the technology change is drafting, the human response is trained override, the unintended consequence is that review time consumes much of the four released hours. Concerning: full automation across all bookings; the technology change is automatic allocation, the human response is passengers chasing an appeal, the unintended consequence is that the 12 of 20 phone-assisted result becomes normal and 90-day booking transcripts sit in storage. Balanced no-deployment alternative: the service keeps human allocation and invests in clearer scripts; the technology change is none, the human response is training, the unintended consequence is that the existing queue and the 45 of 50 and 14 of 20 pattern remain with no new evidence. The stakeholder trade-off is that drivers want training, passengers want a staffed phone route, and the service manager carries the cost; the four staff hours are an uncosted supplier estimate that excludes human appeals, so it cannot be treated as a saving. Future skills: judging an unusual booking, explaining a refusal, and questioning a supplier claim.',
  q3: 'My justified recommendation is a limited pilot with human review on phone-assisted bookings, not full automation and not no deployment. The evidence is the booking counts: 48 of 50 standard bookings beat the human 45 of 50, but 12 of 20 phone-assisted is worse than 14 of 20, so I would automate only where the evidence supports it. Speculation, which I separate from that evidence, is the four staff hours released weekly, because the supplier has not costed human appeals, and anything about winter demand, where there is no evidence at all. Governance: the service manager is the accountable role, drivers can override or stop an allocation, and every passenger keeps a staffed phone route to reach a person and appeal a booking decision; transcripts are retained only as long as an appeal needs rather than 90 days. The strongest objection is that a pilot costs money and delivers little capacity, and my answer is that the phone-assisted gap is a real harm to the passengers with least choice, so I would rather defer scale than monitor a known failure. I would change this recommendation if an independent winter sample showed phone-assisted bookings at or above the human baseline, or if appeals were not being answered, which would trigger a pause and a review with the drivers.'
};
// One deterministic, case-specific pass through the Chapter 7 activities; no live AI output and no preferred recommendation.
export const CHAPTER7_QUIZ = ['Narrow AI', 'Narrow AI', 'Narrow AI', 'AGI (hypothetical)', 'Uncertain forecast', 'Uncertain forecast'];
export const CHAPTER7_CHAINS = {
  b7s1: [
    ['Order status answered from the record', 'Observed now', 'E1 one-week audit: 100 routine requests in 10 staff hours', 'One small week does not prove a wider pattern; a longer audit would change my view'],
    ['Support requests go wrong as often as standard ones', 'Observed now', 'E1: four A and four B outcomes wrong', 'It does not show why B requests fail; a bigger sample of B cases would change my view'],
    ['Most routine replies drafted by AI and approved by a person', 'Possible in 2035', 'E2 sandbox replay of the same cases; I assume demand and staffing stay similar', 'A reused sample is not evidence of future performance'],
    ['A staffed phone and counter route still exists', 'Possible in 2035', 'E3 access adviser; I assume Harbour Co-op keeps funding the route', 'No customer consultation yet; a funding cut would change my view']
  ],
  b7s3: [
    ['Checking order status', 'Automated', 'E1: routine lookups dominate the 100 requests; I assume the record is correct', 'A person answers when the record is wrong'],
    ['Drafting a routine reply', 'Augmented', 'E2: sandbox drafts still need review; I assume reviewers are given time', 'The worker approves the wording and owns the reply'],
    ['Interpreting an unclear return request', 'Augmented', 'E1: 20 of 100 requests need language or access support', 'Judging what the customer actually means'],
    ['Explaining a refusal', 'Strongly human', 'E3: workers want authority to override, not a promise about jobs', 'Accountability and care when the answer is no'],
    ['Resolving an unusual complaint', 'Strongly human', 'E4: only routine handling was measured, not the whole job', 'Negotiating a fair outcome and repairing trust']
  ],
  b7s5: [
    ['Service worker', 'Run 1 keeps most work manual, run 2 pushes me towards complaints, run 3 keeps the present queue', 'EP: 9 staff hours with 3 A and 4 B outcomes still wrong', 'Workers want override time, managers want capacity; funded review still costs money'],
    ['Customer needing a staffed language or access route', 'Run 1 funds support, run 2 leaves 10 of 20 B wrong, run 3 keeps the old difficulties', 'EF: 8 B wrong of 20; EN: 4 B wrong of 20', 'Access needs staff while automation cuts cost; an appeal still arrives after the error'],
    ['Customer using standard digital requests', 'Run 2 is fastest, run 1 changes little, run 3 is unchanged', 'EF: 100 automatic replies and 3 staff hours', 'Speed for A clashes with fairness for B; a human check protects B and slows A'],
    ['Service manager', 'Run 2 shows the largest modelled value, run 1 costs capacity, run 3 stays at the baseline', 'E4: capacity valued at EUR 20 per hour, purchase costs unknown', 'Value clashes with accountability; a stop trigger costs the gain it protects'],
    ['Public-interest regulator', 'Run 2 stores transcripts for 90 days, run 1 for seven, run 3 adds none', 'E4: retention counts added AI transcript storage, not the order records', 'Audit evidence clashes with privacy; shorter retention weakens the audit trail']
  ]
};
export const CHAPTER7_FIELDS = {
  b7s6: [
    'For the proposal: a disputed refusal materially affects a customer, and EH shows people caught mistakes an unreviewed model left in, so high-stakes replies at Harbour Co-op should carry human review.',
    'Against it: EH also shows reviewers rushing unfamiliar cases and the support-route error rate surviving review, and the faster-targets branch shows approval targets turning review into a click; review costs staff hours the co-op may not fund.',
    'My response and revised governance choice: review only decisions that refuse, charge or affect access; the shift lead can override and correct, the service manager can pause the service, and a customer reaches them through the staffed phone or counter route named in E3.',
    'My debate reflection: the rushed-reviewer evidence changed my view from all decisions must be reviewed to meaningful review of the decisions that matter, because an unfunded checkbox is not a safeguard.'
  ],
  b7s7: [
    'Human capability 1, critical judgement: in my balanced future a worker decides when a drafted reply is wrong, which the model cannot check for itself.',
    'Human capability 2, communication: explaining a refusal or a delay to a customer without digital access is the part of the retail task map I marked strongly human.',
    'Human capability 3, negotiating priorities: deciding whether access support or capacity comes first is the trade-off the numbers in my three runs could not settle.',
    'One concrete TY action: I will take two shifts on the training centre reception desk in November, handle the awkward requests myself and keep a short log of what I said as evidence that I tried.'
  ],
  b7s8: [
    'My final recommendation is a pilot kept small with funded access support, not full automation and not simply waiting; the conditions I support are a staffed phone and counter route, seven-day transcript retention and no expansion without an independent sample.',
    'My strongest evidence is run 1 against run 2: full automation gives the largest modelled capacity but ten of twenty support-route outcomes wrong and ninety-day retention, while the pilot leaves two of twenty wrong; customers needing support gain, the service manager carries the cost, and E4 leaves purchase costs and 2035 demand uncertain.',
    'My governance commitment: the service manager is accountable, the access lead can request a halt, the review trigger is any week where support-route errors rise or an appeal goes unanswered, the next evidence to collect is an independent sample with more supported requests, and the human choice that matters most is keeping a person customers can reach.'
  ]
};
// Contract routes: pilot then support, full then speed, none then train; the second citation is that branch's revealed card.
export const CHAPTER7_RUNS = [
  { start: ['pilot', 'E1', 'Start small because E1 is one small week and cannot support a wider rollout yet.'], follow: ['support', 'EP', 'EP shows language and access needs still falling through, so I fund support before scale.'] },
  { start: ['full', 'E2', 'E2 replays every request, so I test what full automation would actually look like here.'], follow: ['speed', 'EF', 'EF shows the co-op still owns complaints, so I record what supplier-led handling costs customers.'] },
  { start: ['none', 'E3', 'E3 says no consultation is finished, so keeping the present service is a real option.'], follow: ['train', 'EN', 'EN keeps the queue, so I test whether scripts and training improve it without AI.'] }
];
export const CHAPTER7_FUTURES = {
  optimistic: [1, 'Technology change: AI drafts a tenth of routine replies. Human response: trained staff keep a funded access route and can halt the pilot. Unintended consequence: training and support use the time released, so capacity barely improves. The case supports the seven-day retention and the lower support-route error count; I am assuming the support team stays funded to 2035.'],
  concerning: [2, 'Technology change: every routine reply is automatic. Human response: customers chase supplier-led complaints and staff move onto them. Unintended consequence: support-route errors double to ten of twenty and transcripts sit for ninety days. The case supports the error counts and retention; I am assuming demand and supplier behaviour do not improve by 2035.'],
  balanced: [3, 'Technology change: none, clearer scripts and training instead. Human response: staff own the queue and correct known errors. Unintended consequence: the access difficulties and waiting remain and no new evidence about the alternatives is produced. The case supports the unchanged baseline; I am assuming training improves new cases, which is not guaranteed.']
};
export const CHAPTER7_COMPARISON = 'Funding the access route changed the outcome more than automation did: run 2 gained the most modelled capacity while doubling support-route errors, run 1 halved them at a capacity cost, and run 3 changed neither. Standard-request customers gained in run 2; customers needing the support route carried the risk. The assumption I would test next is that a trained support team can absorb the extra cases at any scale.';
export const CHAPTER7_RECOMMENDATION = 'Advise Harbour Co-op to run the small pilot with funded access support and seven-day transcript retention, not full automation and not an open-ended wait. Alternatives considered: full automation gives the largest modelled capacity of EUR 100 but leaves ten of twenty support-route outcomes wrong, and no deployment keeps the existing errors without producing new evidence. The service manager is accountable and the access lead can request a halt; review or stop if support-route errors rise or an appeal goes unanswered. Remaining uncertainty: purchase costs, whether support scales, and every assumption about 2035 demand; these are modelled figures from a fictional case, not a forecast.';

// The decision kind re-renders after each edge, so its controls are re-queried per step and the revealed path is awaited.
export async function decisionStep(page, choiceId, evidenceId, reason) {
  await page.check(`input[name="decisionChoice"][data-choice="${choiceId}"]`);
  await page.selectOption('select#decisionEvidence', evidenceId);
  await page.fill('textarea#decisionReason', reason);
  await page.click('button#decisionChoose');
  await page.waitForFunction(r => (document.querySelector('.decision-path')?.textContent || '').includes(r), reason.slice(0, 24), { timeout: 10000 });
}
export async function recordDecisionRun(page, run) {
  await decisionStep(page, ...run.start);
  await page.waitForSelector(`input[name="decisionChoice"][data-choice="${run.follow[0]}"]`, { timeout: 10000 });
  await decisionStep(page, ...run.follow);
  await page.waitForSelector('button#decisionRecord', { timeout: 10000 });
  await page.click('button#decisionRecord');
}
export async function restartDecision(page) {
  await page.click('button#decisionRestart');
  await page.waitForSelector('input[name="decisionChoice"][data-choice="none"]', { timeout: 10000 });
}
export async function fillDecisionCanvas(page) {
  for (const [key, [runId, text]] of Object.entries(CHAPTER7_FUTURES)) {
    await page.selectOption(`select[data-future="${key}"]`, String(runId));
    await page.fill(`textarea[data-scenario="${key}"]`, text);
  }
  await page.fill('textarea[data-decision-field="comparison"]', CHAPTER7_COMPARISON);
}

// Real clicks and typing for all eight sessions, the branching simulator, the capstone and the project.
export async function completeChapter7UI(page, afterSession = async () => {}) {
  await page.click('#homeBtn');
  await page.waitForFunction(() => { const b=document.querySelector('[data-block="6"]');return b&&!b.disabled&&!b.classList.contains('locked'); }, null, { timeout: 15000 });
  await page.click('[data-block="6"]');
  await page.waitForSelector('#labBanner .lab-stage');
  check('Chapter 7 has six stages and the book myth-busters', (await page.$$('#labBanner .lab-stage')).length===6 && /AGI is a hypothesis/i.test(await page.textContent('#mythBusters')));
  for (const sid of CHAPTER7_SESSIONS) {
    await page.click(`[data-session="${sid}"]`);
    await page.waitForFunction(id=>document.querySelector('.session-link.active')?.dataset.session===id,sid);
    check(`${sid} needs no AI tool link`,!(await page.$('#labToolLink')));
    if (CHAPTER7_CHAINS[sid]) {
      const keys=sid==='b7s1'?['claim','status','basis','check']:sid==='b7s3'?['task','change','basis','human']:['stakeholder','impact','evidence','clash'];
      const rows=CHAPTER7_CHAINS[sid];
      for (let i=0;i<rows.length;i++) for (const [j,f] of keys.entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`,rows[i][j]);
      check(`${sid} chain renders its ${rows.length} declared rows`,(await page.$$(`input[data-i][data-f="${keys[0]}"]`)).length===rows.length);
    } else if (sid==='b7s2') {
      for (const [i,label] of CHAPTER7_QUIZ.entries()) await page.selectOption(`select[data-i="${i}"]`,{label});
      check('b7s2 quiz has six concept items',(await page.$$('select[data-i]')).length===6);
    } else if (sid==='b7s4') {
      await page.waitForSelector('.decision-lab input[name="decisionChoice"][data-choice="none"]',{timeout:15000});
      check('b7s4 shows four adoption options, the eight case evidence cards and no preselected choice',(await page.$$('input[name="decisionChoice"][data-choice]')).length===4&&(await page.$$('.decision-evidence [data-evidence]')).length===8&&!(await page.$('input[name="decisionChoice"]:checked')));
      // Persistence: one revealed edge survives a reload before any run is recorded.
      await decisionStep(page,...CHAPTER7_RUNS[0].start);
      const revealed=(await page.textContent('#decisionNode')).trim();
      await page.waitForTimeout(2500);
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(()=>/Welcome/.test(document.getElementById('welcomeName')?.textContent||''),null,{timeout:15000});
      await page.click('[data-block="6"]'); await page.waitForSelector('#labBanner .lab-stage');
      await page.click('[data-session="b7s4"]'); await page.waitForSelector('.decision-lab',{timeout:15000});
      check('b7s4 restores the unfinished path and revealed node after a reload',(await page.textContent('.decision-path')).includes(CHAPTER7_RUNS[0].start[2].slice(0,24))&&(await page.textContent('#decisionNode')).trim()===revealed);
      await decisionStep(page,...CHAPTER7_RUNS[0].follow);
      const metrics=await page.textContent('#decisionMetrics');
      check('b7s4 pilot then support shows the contract value, error and retention figures',/30\.00/.test(metrics)&&/3\.75|3\/80/.test(metrics)&&/10\.00|2\/20/.test(metrics)&&/\b7\b/.test(metrics));
      await page.waitForSelector('button#decisionRecord',{timeout:10000});
      await page.click('button#decisionRecord');
      await page.waitForFunction(()=>(document.querySelector('.decision-runs')?.textContent||'').length>0,null,{timeout:10000});
      for (const run of CHAPTER7_RUNS.slice(1)) { await restartDecision(page); await recordDecisionRun(page,run); }
      const saved=await page.textContent('.decision-runs');
      check('b7s4 records three distinct starting routes including no deployment',CHAPTER7_RUNS.every(r=>saved.includes(r.follow[2].slice(0,24)))&&/No deployment/i.test(saved));
      check('b7s4 keeps the full-automation capacity and its support-route error side by side',/100\.00/.test(saved)&&(/50\.00/.test(saved)||/10\/20/.test(saved)));
      await fillDecisionCanvas(page);
      check('b7s4 links the three futures to three different recorded runs',new Set(await page.$$eval('select[data-future]',els=>els.map(e=>e.value))).size===3);
    } else {
      for (let i=0;i<CHAPTER7_FIELDS[sid].length;i++) await page.fill(`textarea[data-i="${i}"]`,CHAPTER7_FIELDS[sid][i]);
    }
    const downloads=await page.$$eval('.downloads a[download]',els=>els.map(e=>e.href));
    for (const href of downloads) check(`${sid} download served: ${href.split('/').pop()}`,(await fetch(href)).status===200);
    await page.fill('#reflectionText',sid==='b7s4'?'The counts are evidence; every 2035 outcome in my canvas is speculation built on stated assumptions.':sid==='b7s5'?'Standard-request customers benefit most; customers needing the support route carry the risk.':'I separated what the case observed from what I assumed about 2035, and named who decides.');
    await page.click('#saveSession');
    await page.waitForFunction(()=>/complete/i.test(document.getElementById('lessonFeedback')?.textContent||''),null,{timeout:15000});
    check(`${sid} saves complete evidence`,/complete/i.test(await page.textContent('#lessonFeedback')));
    await afterSession(sid);
  }
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]');
  check('Chapter 7 shows self-check and level-up',Boolean(await page.$('.self-check'))&&Boolean(await page.$('.level-up')));
  check('Chapter 7 capstone evidence area shows the saved decision summary',/3 paths/.test(await page.textContent('#chapterCapstoneHost')));
  for (const [i,answer] of Object.values(CAPSTONE7_ANSWERS).entries()) await page.fill(`textarea[data-capstone="${i}"]`,answer);
  await page.click('#submitCapstone');
  await page.waitForFunction(()=>/COMPLETE/.test(document.getElementById('chapterCapstoneHost')?.textContent||''),null,{timeout:20000});
  check('Chapter 7 capstone qualified',/Going further/.test(await page.textContent('#chapterCapstoneHost')));
  await page.waitForSelector('#projectWorkspaceBtn-block7',{timeout:15000});
  await page.click('#projectWorkspaceBtn-block7');
  await page.waitForSelector('#projectWorkspaceModal.open');
  await page.click('#pwImportLab');
  await page.waitForFunction(()=>/Imported/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  const imported=await page.$$eval('#pwEvidence textarea',els=>els.map(e=>e.value).join('\n'));
  check('Chapter 7 import retains six stages, all three paths with their reasons and the three futures',(await page.$$('#pwEvidence .pw-evidence')).length>=6&&/3 paths/.test(imported)&&/Optimistic = run/.test(imported)&&/Concerning future:/.test(imported)&&/Balanced future:/.test(imported)&&/Comparison and uncertainty:/.test(imported)&&CHAPTER7_RUNS.every(r=>imported.includes(r.follow[1])));
  await page.click('#pwAddLog');
  await page.click('#pwAddEvidence');
  const extra=page.locator('#pwEvidence .pw-evidence').last();
  await extra.locator('[data-f="label"]').fill('Future skills card');
  await extra.locator('[data-f="note"]').fill(CHAPTER7_FIELDS.b7s7.join(' | '));
  await page.fill('#pwLog textarea[data-f="did"]','Mapped the retail tasks, followed three complete adoption routes including no deployment, challenged each future through five stakeholders and argued a governance choice.');
  await page.fill('#pwLog textarea[data-f="result"]','Three recorded paths with their modelled figures, three linked futures, a defended human-review choice and a pilot recommendation with a stop trigger.');
  await page.fill('#pwRecommendation',CHAPTER7_RECOMMENDATION);
  await page.click('#pwSave');
  await page.waitForFunction(()=>/Saved/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  await page.click('#pwSubmit');
  await page.waitForFunction(()=>/submitted/i.test(document.querySelector('.pw-status')?.textContent||''),null,{timeout:15000});
  const kept=await page.$$eval('#pwEvidence .pw-evidence',rows=>rows.map(r=>({label:r.querySelector('[data-f="label"]')?.value||'',note:r.querySelector('[data-f="note"]')?.value||''})));
  check('Chapter 7 project submitted with the future skills card and final recommendation',/submitted/i.test(await page.textContent('.pw-status'))&&kept.some(r=>r.label==='Future skills card'&&r.note.includes('critical judgement')));
  await page.click('.pw-close');
}
