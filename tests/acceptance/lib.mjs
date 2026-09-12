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
  await page.click('#pwAddEvidence');
  const extra=page.locator('#pwEvidence .pw-evidence').last();
  await extra.locator('[data-f="label"]').fill('Disclosure choices');
  await extra.locator('[data-f="note"]').fill(CHAPTER6_DISCLOSURE.map(r=>r.join(' → ')).join('; '));
  await page.click('#pwAddLog');
  await page.fill('#pwLog textarea[data-f="did"]','Preserved the raw budget, profiled and cleaned a working copy, calculated eligible figures, checked every claim and rejected unsupported edits.');
  await page.fill('#pwLog textarea[data-f="result"]','Seven eligible lines total €249.00; four records remain held; removed the attendance claim and retained human approval.');
  await page.fill('#pwRecommendation',CHAPTER6_RECOMMENDATION);
  await page.click('#pwSave');
  await page.waitForFunction(()=>/Saved/.test(document.getElementById('pwMessage')?.textContent||''),null,{timeout:15000});
  await page.click('#pwSubmit');
  await page.waitForFunction(()=>/submitted/i.test(document.querySelector('.pw-status')?.textContent||''),null,{timeout:15000});
  check('Chapter 6 project submitted with disclosure and final recommendation',/submitted/i.test(await page.textContent('.pw-status')));
  await page.click('.pw-close');
}
