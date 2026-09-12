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
      check(`${sid} sample route still requires acknowledgement`, /tick the box|Finish the required/.test(await page.textContent('#lessonFeedback')));
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
      check('b7s4 shows four adoption options, the four root evidence cards and no preselected choice',(await page.$$('input[name="decisionChoice"][data-choice]')).length===4&&(await page.$$('.decision-evidence [data-evidence]')).length===4&&!(await page.$('input[name="decisionChoice"]:checked')));
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
      await page.waitForSelector('button#decisionRecord',{timeout:10000});
      const metrics=await page.textContent('#decisionMetrics');
      check('b7s4 pilot then support shows the contract value, error and retention figures',/30\.00/.test(metrics)&&/3\.75|3\/80/.test(metrics)&&/10\.00|2\/20/.test(metrics)&&/7 days/.test(metrics));
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
  check('Chapter 7 capstone evidence area shows the saved decision summary',/Recorded adoption path 3/.test(await page.textContent('#chapterCapstoneHost')));
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

export const CHAPTER8_SESSIONS = ['b8s1', 'b8s2', 'b8s3', 'b8s4', 'b8s5', 'b8s6', 'b8s7', 'b8s8'];
export const CAPSTONE8_ANSWERS = {
  q1: 'The pack shows a prototype that runs and a problem statement of a kind: people at the community centre miss events they would have wanted to attend. What it shows is a demo. What is missing is almost everything the six criteria ask for. There is no problem framing beyond a one-line complaint, no interview evidence and no user need separated from what people first asked for, so nobody knows whether the real barrier is that the noticeboard is hard to see, that events are announced late, or that people simply are not free on those evenings. There is no non-AI option at all, rejected with "AI is the point of the project", which is the reverse of how a solution should be chosen. The success criteria were written in the same session as the results, so they measure nothing. The simplest non-AI option for this problem is a printed weekly what-is-on sheet at the door and on the counter, with a sign-up list people can add their name to, plus a one-line text or email reminder the day before for anyone who asks for it. That costs a photocopier and ten minutes a week, it needs no photos of the noticeboard and no personal profile of anyone, and until someone can show it fails, it is the answer that should be compared against.',
  q2: 'The claims the evidence does not support are the important ones. "Three testers all said it was good" supports nothing: three people being polite about a demo is not test evidence that the assistant helps anyone attend an event, and a demo running proves it runs, not that it is useful. "Success criteria met" cannot be claimed at all, because the criteria were written in the same session as the results; criteria written after the fact are a description of what happened, not a measure, and I would reject that part of the pack outright. The claim that AI adds value is unsupported because no non-AI option was ever compared, so there is no baseline to measure against. A structured test would have recorded, for each tester and against a task they were actually asked to do, what worked, exactly where they got confused, what failed, and the one thing the builder did not expect, with the builder watching and not helping; it would also have recorded a number, such as how many of the suggested events each tester would genuinely have attended, and what they said in their own words. The one change the evidence would actually justify is small and concrete: the testers all said "good" and nothing else, which is evidence that the questions were leading, so the next iteration should be to test again with three new testers, a real task and no prompting, before changing the prototype at all.',
  q3: 'Red-teaming the assistant across the five attacks. Hallucination: reading noticeboard photos means the model can misread a date, a room or a price and confidently send a person to an event that does not exist; a safeguard is that no suggestion is sent unless it matches an entry a person has typed into the centre diary, and every message carries its source and the words "check at the desk". Bias: personalised suggestions learn from who already attends, so the people who are already included get more invitations and the people the community centre most wants to reach get fewer; a safeguard is to send the full listing to everyone and treat personalisation as an addition, never a filter. Privacy: photos of a public noticeboard capture other people\'s handwritten names, phone numbers and notices, and a personalised assistant builds a profile of what each member is interested in; the safeguards are to photograph nothing, take the listing from the typed diary, hold no interest profile, and collect a contact detail only from someone who asks for reminders and can stop them in one reply. Misuse: anyone who can post on the board can get a message pushed to every member, so a named member of staff must approve each send. Over-reliance: if members stop reading the board because the assistant tells them what matters, anything it misses effectively stops existing, so the printed listing stays on the door whatever the assistant does. The decision that must stay with a person is which events are promoted and to whom, and the accountable role is the named community centre coordinator who approves each send and can switch the assistant off; human oversight here is not a review step added at the end, it is the approval the send depends on. "Residual risk: none" is the answer that most undermines the whole pack, because it is the one claim we already know is false: every safeguard above limits a risk without removing it, and an honest residual list is the evidence that the builder actually red-teamed their own work rather than defending it. A reviewer reading "none" learns that the risk register was written to look finished, which puts every other claim in the pack, including the demo and the three testers, back in doubt.'
};
// One deterministic pass through the Chapter 8 activities: a training-centre microwave queue, chosen over four rejected
// problems and solved by the non-AI option, so the acceptance run proves the non-AI route is a full route.
export const CHAPTER8_CHAINS = {
  b8s1: [
    ['The two kitchen microwaves are queued twenty deep at 12:30 and people give up and eat cold food', 'Learners on the day programme, in the ground-floor kitchen at lunch', 'Real, understandable, useful, testable and safe: it passes all five tests', 'Chosen'],
    ['Nobody knows which study room upstairs is free', 'Learners looking for quiet space, first-floor corridor', 'Real, understandable and useful, but I cannot see the room bookings', 'Rejected because it fails testable: I have no way to measure whether a change worked'],
    ['Lost property piles up in a box at reception', 'Reception staff and learners, front desk', 'Real and understandable, but the labelled box already works', 'Rejected because it fails useful: solving it would change almost nothing'],
    ['Evening class notices go up too late for people to plan', 'Adults attending evening classes, main noticeboard', 'Real, understandable and useful, but testing it needs personal contact details', 'Rejected because it fails safe: I would have to collect phone numbers I do not need'],
    ['New learners cannot find the right room on their first day', 'First-week learners, main corridor', 'Real and understandable, but it has too many causes to frame as one problem', 'Rejected because it fails testable: I could not tell which cause my change affected']
  ],
  b8s3: [
    ['A paper sign-up sheet on the kitchen door with five-minute slots from 12:15 to 13:15', 'No AI', 'It fits because the real need is seeing the queue before walking down, and it costs one photocopy a day and no permission from anyone', 'Chosen because it is the least complex answer that solves the problem'],
    ['A shared spreadsheet people update on their phones as they start and finish', 'No AI', 'It fits the same need but costs everyone a login and depends on people updating it while holding a hot container', 'Rejected because the complexity it adds is carried by the user, not by me'],
    ['An assistant that reads a webcam of the kitchen and predicts the wait', 'Uses AI', 'It would fit if the problem were prediction, but the problem is visibility; it costs a camera pointed at people eating, a model that can be wrong, and permission I would not get', 'Rejected because AI adds complexity and a privacy risk here, not genuine value']
  ],
  b8s7: [
    ['Change from testing: slot times printed on the sheet instead of blank lines for people to write', 'Person B and Person C both wrote overlapping times, and Person A asked what counted as a slot', 'The sheet now prints 12:15, 12:20, 12:25 and so on, with one name line each', 'People can still write across two lines, and nothing stops someone who never signs up walking in'],
    ['Red-team, hallucination: the AI option I rejected would have read a blurred webcam frame and stated a wait time that was simply wrong', 'I tried the rejected option by describing three photos and getting three confident, different answers', 'Not building it, and if a future version predicts anything it shows the raw count beside the prediction', 'Any predicted number can still be trusted more than it deserves, including by me'],
    ['Red-team, bias: the sheet favours people who arrive early, read English comfortably and are confident enough to write on a public list', 'Person C hesitated before writing and asked whether they were allowed to take a slot', 'A staff member keeps two unbooked slots at the end for anyone who could not sign up', 'The people least likely to sign up are still the least likely to be served, and two slots is a guess'],
    ['Red-team, privacy: full names and a daily routine of who is in the building at 12:30 sit on a public door', 'Reading my own prototype as if I were a stranger in the corridor', 'First names or initials only, and the sheet is taken down and binned at 13:30 each day', 'Someone can still photograph the sheet at 12:00, and initials still identify people in a small centre'],
    ['Red-team, misuse and over-reliance: one person books four slots for friends, and others stop looking into the kitchen because the sheet says it is full', 'Person A said they would probably trust the sheet rather than walk down and check', 'One slot per name per day is printed on the sheet, and the wording says the sheet is a guide, not a booking', 'Nothing enforces one slot per person, and a stale sheet now sends people away from a free microwave']
  ]
};
export const CHAPTER8_FIELDS = {
  b8s2: [
    'The user: a learner on the full-time day programme who brings food from home most days and has a thirty-minute lunch break, recorded with no name and no identifying detail.',
    'How they do it now, step by step: they leave the classroom at 12:30, walk down to the ground-floor kitchen, see a queue of about twenty people, wait two or three minutes, decide the break is too short, and either eat the food cold or buy something instead.',
    'The pain points, and which one hurts most: the walk down and back is wasted, the wait is unpredictable, and the break is short. The one that hurts most is not the queue itself but not knowing about it until they are already standing in it.',
    'My evidence: I asked the six approved questions about how lunch works and what goes wrong. Person A said they stopped bringing food because of it. Person B said they go at 12:15 to beat the rush, which makes the rush. Person C said they would use the kitchen if they knew when it was quiet. I recorded no names and no contact details.',
    'The constraints: eight hours of project time, no budget beyond photocopying, no permission to install anything in the kitchen or point a camera at people, no access to building systems, and whatever I build has to work with what the training centre already allows.'
  ],
  b8s4: [
    'The data flow: what goes in is a first name or initials and a chosen five-minute slot, written by the person themselves. What the solution does with it is display it, nothing more. What comes out is a visible list of which slots are taken. What is stored is one sheet of paper for one day, binned at 13:30; nothing is kept overnight and nothing is digital.',
    'The human decision points: a person decides whether to sign up at all, a person decides whether to wait or come back, and a staff member decides who gets the two held-back slots and can take the sheet down if it is being abused. Nothing automatic decides anything about a person.',
    'The failure modes: the sheet looks full so people stop coming and a microwave sits idle; someone books slots for friends; someone writes a full name and a stranger photographs the sheet; the sheet goes missing at 12:20 and the queue returns; people trust the sheet instead of looking.',
    'The safeguards: one slot per name per day printed on the sheet; initials or first names only, with the sheet binned each day; two unbooked slots held back by staff; wording that says the sheet is a guide and not a booking; a spare copy at reception if the door copy disappears.',
    'My success criteria, written before I build and not edited afterwards: it works if at least half the slots are used on three consecutive days, if at least two of three testers say they now know whether to walk down before they do, and if no full name or contact detail appears on any sheet. It has not worked if the 12:30 queue is unchanged, if people ignore the sheet, or if anyone writes information about themselves that I did not ask for.'
  ],
  b8s5: [
    'My biggest assumption, and why the prototype tests it: I am assuming people will read and use a sign-up sheet on the door at all. If they walk past it the whole idea fails, so the roughest possible sheet on the real door tests exactly that and nothing else.',
    'What I built, in a sentence, and which form I chose: I chose a paper mock-up, because the assumption is about human behaviour at a door and no software is needed to test it. I printed one A4 sheet with twelve five-minute slots from 12:15 to 13:15, one name line each, a title saying it is a guide and not a booking, and a line saying one slot per person per day.',
    'What already breaks when I try it myself: the slots are too small to write in with a pen while holding a lunch box, the sheet curls off the door with one piece of tape, and I had already written across two lines myself before anyone else saw it.',
    'What it cannot do yet, and what I left out on purpose: it cannot tell anyone anything before they leave the classroom, which is the pain point that hurts most, and it cannot stop one person taking four slots. I left out any digital version, any reminder and any counting on purpose, because none of those are needed to find out whether people use a sheet at all.'
  ],
  b8s8: [
    '1. The problem, and who experiences it: learners on the full-time day programme bring food from home and lose most of a thirty-minute break to an unpredictable queue at the two ground-floor microwaves, and several have stopped bringing food at all.',
    '2. The evidence you gathered: the six approved questions with three participants recorded as Person A, Person B and Person C, no names and no contact details. Person A had stopped bringing food, Person B goes early and so creates the rush, Person C would use the kitchen if they knew when it was quiet. The pain point is not the queue, it is not knowing until you are in it.',
    '3. The solution, and why AI is or isn\'t appropriate: a printed five-minute slot sheet on the kitchen door. I compared three options including an assistant that reads a webcam and predicts the wait. AI is not appropriate here: the need is visibility, not prediction, and the AI option would have added a camera pointed at people eating, a model that can be confidently wrong, and a permission I would not get. The least complex answer that works is paper.',
    '4. A demonstration of the prototype: what I would show, and in what order: the blank sheet as it goes up at 12:10, the same sheet photographed at 12:35 with slots filled in, then the second version with printed times beside the first version with blank lines, so the change driven by testing is visible in one look.',
    '5. What happened during testing: three testers used it with me watching and not helping. Two wrote overlapping times because the lines were blank, one asked whether they were allowed to take a slot at all, and the thing I did not expect was that one tester said they would trust the sheet rather than walk down and look, which is a risk I had not written down.',
    '6. One change you made because of evidence: I printed the slot times on the sheet instead of leaving blank lines, because two of three testers wrote overlapping times. That is the change the test record actually justifies; I did not change anything else.',
    '7. One important risk, and its safeguard: the sheet puts names and a daily routine of who is in the building at 12:30 on a public door. The safeguard is initials or first names only and the sheet binned at 13:30 each day, with nothing kept overnight and nothing digital.',
    '8. What\'s still uncertain, or what you\'d test next: I do not know whether the sheet survives a week without a staff member re-printing it, and I never tested the pain point that hurts most, which is knowing before you leave the classroom. I would run a second cycle over five days and measure how many of the twelve slots are used and how many people still arrive without signing up.',
    'My individual reflection: what I learned across the whole programme, and what I would do differently: the thing that changed most for me is that I now write the success criteria before building, because in Chapter 2 I judged a model by how good the demo looked and here I could see exactly how that goes wrong. I also learned that rejecting AI can be the right answer and still be the whole project. What I would do differently is interview before framing rather than after: I had half a solution in my head before I asked Person A anything, and it took the evidence about not knowing in advance to move me off it.'
  ]
};
export const CHAPTER8_TESTLOG_FIELDS = ['tester', 'task', 'worked', 'confused', 'failed', 'unexpected'];
export const CHAPTER8_TESTLOG = [
  ['Person A', 'Take a microwave slot for today without asking me anything', 'Found the sheet on the door and wrote a slot in under ten seconds', 'Asked out loud whether one slot meant one dish or one person', 'Wrote a time overlapping the slot above, because the lines were blank', 'Said they would trust the sheet rather than walk down and look for themselves'],
  ['Person B', 'Find out whether 12:30 is already busy, then decide what to do', 'Read the filled slots and decided to come at 12:50 instead', 'Could not tell whether the sheet was today\'s or yesterday\'s', 'Nothing failed outright, but they checked the date twice before trusting it', 'Went back upstairs to tell two other people, which I had not designed for'],
  ['Person C', 'Sign up for a slot and say what you would change', 'Understood the five-minute slots straight away once they saw a filled one', 'Hesitated before writing and asked whether they were allowed to take a slot', 'Wrote a full first name and surname, which the sheet should not be collecting', 'Suggested the sheet should say who to ask if every slot is taken']
];
export const CHAPTER8_REFLECTIONS = {
  b8s1: 'I rejected the evening class notices because it failed safe: testing it would have meant collecting phone numbers I did not need, and the study rooms failed testable because I cannot see the bookings.',
  b8s2: 'Person C first asked for a third microwave. What they actually needed was to know whether the kitchen was busy before walking down, which costs nothing and is what I built for.',
  b8s3: 'Yes, and it is better solved without AI: the need is seeing the queue, not predicting it, so the paper sheet solves the real problem and the webcam option would have added a risk for no gain.',
  b8s4: 'If the AI option I rejected were wrong it would send people away from a free microwave with a confident number, which is why the human decision to walk down and look has to stay available.',
  b8s5: 'One printed A4 sheet on the real door, because my biggest assumption is that people will use a sign-up sheet at all, and no software is needed to find that out.',
  b8s6: 'Two of three testers wrote overlapping times on blank lines, so printing the slot times is the only change the evidence justifies; I will know it worked if the next testers write inside the slots.',
  b8s7: 'Whether a person who could not sign up still gets a slot must stay with a staff member, because no rule I print on the sheet can see who was left out.',
  b8s8: 'I never tested whether people can find out before they leave the classroom, which is the pain point that hurts most, so a five-day second cycle measuring slot use is what I would test next.'
};
export const CHAPTER8_RECOMMENDATION = 'I recommend the printed five-minute slot sheet on the kitchen door, and I recommend against the AI assistant I compared it with. The evidence is that the pain point is not the queue but not knowing about it, and a sheet on the door answers that for one photocopy a day, with no camera, no accounts and nothing kept overnight. Testing with three participants justified exactly one change, printing the slot times instead of leaving blank lines, and it surfaced a risk I had not written down, that people will trust the sheet instead of looking. The residual risks are real and I am not claiming otherwise: nothing enforces one slot per person, initials still identify people in a small centre, a stale sheet now sends people away from a free microwave, and the people least confident about writing on a public list are still the least likely to be served. The accountable person is the staff member who holds back two slots and can take the sheet down. What I would test next is a five-day second cycle measuring how many of the twelve slots are used and how many people arrive without signing up.';

// Real clicks and typing for all eight Chapter 8 sessions, including b8s5 by the fallback route with the tool never
// acknowledged, then the capstone, the programme-complete state and the portfolio project.
export async function completeChapter8UI(page, afterSession = async () => {}) {
  await page.click('#homeBtn');
  await page.waitForFunction(() => { const b=document.querySelector('[data-block="7"]');return b&&!b.disabled&&!b.classList.contains('locked'); }, null, { timeout: 15000 });
  await page.click('[data-block="7"]');
  await page.waitForSelector('#labBanner .lab-stage');
  check('Chapter 8 has six stages and the book myth-busters', (await page.$$('#labBanner .lab-stage')).length===6 && /least complex one that works/i.test(await page.textContent('#mythBusters')));
  check('Chapter 8 shows the six judging criteria before the sessions start', (await page.$$('.chapter-rubric [data-criterion]')).length===6);
  for (const sid of CHAPTER8_SESSIONS) {
    await page.click(`[data-session="${sid}"]`);
    await page.waitForFunction(id=>document.querySelector('.session-link.active')?.dataset.session===id,sid);
    if (CHAPTER8_CHAINS[sid]) {
      const keys=sid==='b8s1'?['problem','who','tests','verdict']:sid==='b8s3'?['option','ai','fit','verdict']:['item','evidence','safeguard','residual'];
      const rows=CHAPTER8_CHAINS[sid];
      for (let i=0;i<rows.length;i++) for (const [j,f] of keys.entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`,rows[i][j]);
      check(`${sid} chain renders its ${rows.length} declared rows`,(await page.$$(`input[data-i][data-f="${keys[0]}"]`)).length===rows.length);
      if (sid==='b8s3') check('b8s3 keeps a non-AI option and exactly one chosen row',rows.filter(r=>/^no ai$/i.test(r[1])).length>=1&&rows.filter(r=>/^Chosen/.test(r[3])).length===1);
      if (sid==='b8s7') check('b8s7 carries an evidence-driven change, three or more red-team rows and no residual of "none"',/^Change from testing/.test(rows[0][0])&&rows.filter(r=>/^Red-team/.test(r[0])).length>=3&&rows.every(r=>!/^none\.?$/i.test(r[3].trim())));
    } else if (sid==='b8s5') {
      await page.waitForSelector('.lab',{timeout:15000});
      check('b8s5 is the Chapter 8 session that offers a tool, and it is DuckDuckGo AI Chat',Boolean(await page.$('#labToolLink'))&&/duck\.ai/.test(await page.getAttribute('#labToolLink','href')));
      await page.click('button[data-fallback]');
      await page.waitForSelector('#labFallback',{timeout:10000});
      check('b8s5 fallback offers the non-AI build rather than a sample download',/non-AI|without AI|spreadsheet|paper/i.test(await page.textContent('#labFallback')));
      for (let i=0;i<CHAPTER8_FIELDS.b8s5.length;i++) await page.fill(`textarea[data-i="${i}"]`,CHAPTER8_FIELDS.b8s5[i]);
      // The non-AI route needs no tool visit, but the safety notice is acknowledged here as on every other lab.
      check('b8s5 tool link stays disabled until the safety notice is acknowledged',(await page.getAttribute('#labToolLink','aria-disabled'))==='true');
      await page.check('input[data-ack]');
      check('b8s5 completes on the non-AI route with the tool never opened',(await page.getAttribute('#labFallback','hidden'))===null);
    } else if (sid==='b8s6') {
      await page.waitForSelector('input[data-i="0"][data-f]',{timeout:15000});
      const keys=await page.$$eval('input[data-i="0"][data-f]',els=>els.map(e=>e.dataset.f));
      for (let i=0;i<CHAPTER8_TESTLOG.length;i++) for (const [j,f] of keys.entries()) await page.fill(`input[data-i="${i}"][data-f="${f}"]`,CHAPTER8_TESTLOG[i][j]||'');
      check('b8s6 records three testers across six watch-do-not-help columns',keys.length===6&&(await page.$$(`input[data-i][data-f="${keys[0]}"]`)).length>=3);
    } else {
      for (let i=0;i<CHAPTER8_FIELDS[sid].length;i++) await page.fill(`textarea[data-i="${i}"]`,CHAPTER8_FIELDS[sid][i]);
      if (sid==='b8s2') check('b8s2 asks for no real name or contact detail',!/\b(full name|surname|phone number|email address|contact detail)\b/i.test(await page.$$eval('textarea[data-i]',els=>els.map(e=>e.placeholder||'').join(' '))));
      if (sid==='b8s8') check('b8s8 takes the eight presentation points and the individual reflection',(await page.$$('textarea[data-i]')).length===9);
    }
    const downloads=await page.$$eval('.downloads a[download]',els=>els.map(e=>e.href));
    for (const href of downloads) check(`${sid} download served: ${href.split('/').pop()}`,(await fetch(href)).status===200);
    await page.fill('#reflectionText',CHAPTER8_REFLECTIONS[sid]);
    await page.click('#saveSession');
    await page.waitForFunction(()=>/complete/i.test(document.getElementById('lessonFeedback')?.textContent||''),null,{timeout:15000});
    check(`${sid} saves complete evidence`,/complete/i.test(await page.textContent('#lessonFeedback')));
    await afterSession(sid);
  }
  await page.waitForSelector('#chapterCapstoneHost textarea[data-capstone]');
  check('Chapter 8 shows self-check and level-up',Boolean(await page.$('.self-check'))&&Boolean(await page.$('.level-up')));
  check('Chapter 8 capstone evidence area shows the saved test record',/Person A/.test(await page.textContent('#chapterCapstoneHost')));
  for (const [i,answer] of Object.values(CAPSTONE8_ANSWERS).entries()) await page.fill(`textarea[data-capstone="${i}"]`,answer);
  await page.click('#submitCapstone');
  await page.waitForFunction(()=>/COMPLETE/.test(document.getElementById('chapterCapstoneHost')?.textContent||''),null,{timeout:20000});
  check('Chapter 8 capstone qualified, so a review recommending the non-AI option reaches the highest level',/Going further/.test(await page.textContent('#chapterCapstoneHost')));
  await page.click('#homeBtn');
  await page.waitForSelector('#homeView .programme-complete',{timeout:15000});
  check('Home shows the programme-complete state and implies no ninth chapter',/Programme complete/i.test(await page.textContent('#homeView .programme-complete'))&&!(await page.$('[data-block="8"]')));
  await page.click('[data-block="7"]');
  await page.waitForSelector('#projectWorkspaceBtn-block8',{timeout:15000});
  await page.click('#projectWorkspaceBtn-block8');
  await page.waitForSelector('#projectWorkspaceModal.open');
  check('Chapter 8 project lists the nine portfolio deliverables',(await page.$$('#projectWorkspaceModal li')).length>=9&&/Individual reflection/.test(await page.textContent('#projectWorkspaceModal')));
  await page.click('#pwImportLab');
  await page.waitForFunction(()=>/Imported/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  const imported=await page.$$eval('#pwEvidence textarea',els=>els.map(e=>e.value).join('\n'));
  check('Chapter 8 import carries every stage session, including the test record and the red-team residuals',(await page.$$('#pwEvidence .pw-evidence')).length>=5&&/microwaves are queued/.test(imported)&&/Person A/.test(imported)&&/Red-team, privacy/.test(imported)&&imported.includes(CHAPTER8_FIELDS.b8s5[0].slice(0,40)));
  await page.click('#pwAddLog');
  await page.click('#pwAddEvidence');
  const extra=page.locator('#pwEvidence .pw-evidence').last();
  await extra.locator('[data-f="label"]').fill('Individual reflection');
  await extra.locator('[data-f="note"]').fill(CHAPTER8_FIELDS.b8s8[8]);
  await page.fill('#pwLog textarea[data-f="did"]','Generated five problems and screened them against the five tests, interviewed three participants as Person A to C, compared three options including two without AI, wrote success criteria before building, built a paper sheet, watched three testers, then made one evidence-driven change and red-teamed my own solution.');
  await page.fill('#pwLog textarea[data-f="result"]','A chosen problem with user evidence, three compared options with the non-AI one chosen, a responsible design canvas with criteria written in advance, a paper prototype, a three-tester record, one justified change and a risk register whose residuals are not "none".');
  await page.fill('#pwRecommendation',CHAPTER8_RECOMMENDATION);
  await page.click('#pwSave');
  await page.waitForFunction(()=>/Saved/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  await page.click('#pwSubmit');
  await page.waitForFunction(()=>/submitted/i.test(document.querySelector('.pw-status')?.textContent||''),null,{timeout:15000});
  const kept=await page.$$eval('#pwEvidence .pw-evidence',rows=>rows.map(r=>({label:r.querySelector('[data-f="label"]')?.value||'',note:r.querySelector('[data-f="note"]')?.value||''})));
  check('Chapter 8 project submitted with the individual reflection and final recommendation',/submitted/i.test(await page.textContent('.pw-status'))&&kept.some(r=>r.label==='Individual reflection'&&r.note.includes('success criteria before building')));
  await page.click('.pw-close');
  await page.click('#portfolioBtn');
  await page.waitForSelector('#portfolioView .programme-complete',{timeout:15000});
  check('Portfolio shows the programme complete with the AI Innovator badge',/AI Innovator/i.test(await page.textContent('#portfolioView .programme-complete')));
}
