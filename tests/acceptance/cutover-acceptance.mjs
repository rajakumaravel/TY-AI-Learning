// ADR-007 cutover acceptance: runs against a live Cloudflare Pages deployment and the linked Supabase project.
// Not part of `npm test`. Requires `supabase login` (keys are read from the CLI and never printed).
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/cutover-acceptance.mjs
//
// Creates three throwaway auth users (two students, one app-metadata admin), exercises the API and RLS, then deletes them.

import { randomUUID } from 'node:crypto';
import { BASE, api, rest, check, finish, createUser, cleanup, CHAPTER1_SESSIONS, CAPSTONE1_ANSWERS, CHAPTER2_SESSIONS, CAPSTONE2_ANSWERS, CHAPTER3_SESSIONS, CAPSTONE3_ANSWERS, CHAPTER4_SESSIONS, CAPSTONE4_ANSWERS, CHAPTER5_SESSIONS, CAPSTONE5_ANSWERS, CHAPTER6_SESSIONS, CAPSTONE6_ANSWERS, CHAPTER6_FIELDS, CHAPTER6_DISCLOSURE, CHAPTER6_RECOMMENDATION } from './lib.mjs';

const users = [];
try {
  const a = await createUser('student-a'); users.push(a);
  const b = await createUser('student-b'); users.push(b);
  const admin = await createUser('admin', { role: 'admin' }); users.push(admin);

  // Unauthenticated
  check('unauthenticated /api/session is 401', (await api('session')).status === 401);
  check('unauthenticated /api/admin/me is 401', (await api('admin/me')).status === 401);

  // Sign-in and learner provisioning
  const first = await api('session', a.token);
  check('student A /api/session authenticated', first.status === 200 && first.body?.authenticated === true, JSON.stringify(first.body));
  check('session does not expose other learner fields', first.body?.student?.id === a.id);

  // Progress persistence (server-side; second read simulates another device)
  const state = { completed: ['s1-1'], badges: [], marker: randomUUID() };
  const put = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state }) });
  check('student A PUT /api/progress ok', put.status === 200 && put.body?.ok === true, JSON.stringify(put.body));
  const get = await api('progress', a.token);
  check('student A progress round-trips', get.status === 200 && get.body?.state?.marker === state.marker);
  const getB = await api('progress', b.token);
  check('student B sees empty progress, not A\'s', getB.status === 200 && !getB.body?.state?.marker);

  // Chapter capstone gate (server side)
  const early = await api('chapter-assessment/block1', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE1_ANSWERS }) });
  check('capstone rejected (409) before chapter sessions complete', early.status === 409, `status ${early.status}`);
  const done = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { ...state, completed: CHAPTER1_SESSIONS } }) });
  check('student A marks all Chapter 1 sessions complete', done.status === 200);
  const thin = await api('chapter-assessment/block1', a.token, { method: 'POST', body: JSON.stringify({ answers: { q1: 'too short', q2: 'x', q3: 'y' } }) });
  check('capstone rejected (400) with thin answers', thin.status === 400, `status ${thin.status}`);
  const cap = await api('chapter-assessment/block1', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE1_ANSWERS }) });
  check('capstone accepted after sessions complete', cap.status === 200 && Boolean(cap.body?.assessment?.submittedAt) && Boolean(cap.body?.assessment?.suggestedLevel), JSON.stringify(cap.body));
  check('capstone unknown chapter is 404', (await api('chapter-assessment/block9', a.token, { method: 'POST', body: '{}' })).status === 404);

  // Server-side gate: forged qualification is discarded, Chapter 2 writes need Chapter 1 qualified
  const forged = await api('progress', b.token, { method: 'PUT', body: JSON.stringify({ state: { completed: [], chapterAssessments: { block1: { submittedAt: '2026-01-01T00:00:00Z', level: 'Going further', score: 9 } } } }) });
  const forgedRead = await api('progress', b.token);
  check('forged chapterAssessments in progress PUT is discarded', forged.status === 200 && forgedRead.status === 200 && !forgedRead.body?.state?.chapterAssessments?.block1, JSON.stringify(forgedRead.body?.state));
  check('student B Chapter 2 capstone is 409 without Chapter 1 qualification', (await api('chapter-assessment/block2', b.token, { method: 'POST', body: '{}' })).status === 409);
  check('student B Chapter 2 project save is 409 without Chapter 1 qualification', (await api('projects/block2', b.token, { method: 'PUT', body: JSON.stringify({ workspace: {} }) })).status === 409);
  check('student B Chapter 2 project submit is 409 without Chapter 1 qualification', (await api('projects/block2/submit', b.token, { method: 'POST' })).status === 409);
  const sessionA = await api('session', a.token);
  check('student A session state carries server-derived Chapter 1 qualification', Boolean(sessionA.body?.state?.chapterAssessments?.block1?.submittedAt) && sessionA.body?.state?.chapterAssessments?.block1?.level === cap.body?.assessment?.suggestedLevel);

  // Project workspace save
  const workspace = {
    workLog: [{ planned: 'Train V1', did: 'Trained a two-class model on 20 images per class.', result: 'V1 accuracy about 80% on unseen tests.', blocker: '', decision: '', next: 'Break it', minutes: 30, date: '2026-09-11' }],
    evidence: [
      { label: 'Test log', url: 'https://example.com/test-log', note: 'Table of 10 unseen test results.' },
      { label: 'Confusion matrix', url: '', note: 'Confusion matrix drawn from the test log results.' },
      { label: 'V2 comparison', url: 'https://example.com/v2', note: 'V2 improved on the background bias failures.' }
    ],
    finalRecommendation: 'Deploy V2 only with a wider background set; V1 learned a shortcut from the desk colour and must not be used in production.'
  };
  const save = await api('projects/block2', a.token, { method: 'PUT', body: JSON.stringify({ workspace }) });
  check('student A PUT /api/projects/block2 ok', save.status === 200 && save.body?.project?.status === 'in_progress', JSON.stringify(save.body));
  const projB = await api('projects/block2', b.token);
  check('student B GET project is own empty workspace', projB.status === 200 && projB.body?.project?.status === 'not_started' && (projB.body?.project?.workspace?.workLog || []).length === 0);

  // RLS: browser role reads own rows only, and cannot write
  const rlsSelf = await rest('student_projects', `select=user_id,project_id&user_id=eq.${a.id}`, a.token);
  check('RLS: student A reads own project row', rlsSelf.status === 200 && Array.isArray(rlsSelf.body) && rlsSelf.body.length === 1, JSON.stringify(rlsSelf.body));
  const rlsCross = await rest('student_projects', `select=user_id,project_id&user_id=eq.${a.id}`, b.token);
  check('RLS: student B cannot read A\'s project row', rlsCross.status === 200 && Array.isArray(rlsCross.body) && rlsCross.body.length === 0, JSON.stringify(rlsCross.body));
  const rlsProgress = await rest('learner_progress', `select=user_id&user_id=eq.${a.id}`, b.token);
  check('RLS: student B cannot read A\'s progress row', rlsProgress.status === 200 && Array.isArray(rlsProgress.body) && rlsProgress.body.length === 0);
  const rlsLearners = await rest('learners', 'select=user_id', b.token);
  check('RLS: student B learners view is only self', rlsLearners.status === 200 && Array.isArray(rlsLearners.body) && rlsLearners.body.every(r => r.user_id === b.id));
  const rlsWrite = await rest('student_projects', `user_id=eq.${a.id}`, a.token, { method: 'PATCH', body: JSON.stringify({ status: 'reviewed' }) });
  check('RLS: student A cannot write own project row directly', rlsWrite.status >= 400 || (Array.isArray(rlsWrite.body) && rlsWrite.body.length === 0), `status ${rlsWrite.status}`);

  // Admin authorisation
  check('student A /api/admin/me is 403', (await api('admin/me', a.token)).status === 403);
  check('student A /api/admin/students is 403', (await api('admin/students', a.token)).status === 403);
  check('student A admin project list is 403', (await api(`projects/admin/student/${b.id}`, a.token)).status === 403);
  const me = await api('admin/me', admin.token);
  check('app-metadata admin /api/admin/me is 200', me.status === 200 && me.body?.authorized === true, JSON.stringify(me.body));
  const students = await api('admin/students', admin.token);
  check('admin student list includes A', students.status === 200 && (students.body?.students || []).some(s => s.id === a.id));

  // Submit and review
  const submit = await api('projects/block2/submit', a.token, { method: 'POST' });
  check('student A submits project', submit.status === 200 && submit.body?.project?.status === 'submitted', JSON.stringify(submit.body));
  const adminView = await api(`projects/admin/student/${a.id}`, admin.token);
  const seen = adminView.body?.projects?.[0];
  check('admin sees exact submitted snapshot', adminView.status === 200 && seen?.submittedSnapshot?.finalRecommendation === workspace.finalRecommendation);
  const review = await api(`projects/admin/student/${a.id}/block2/review`, admin.token, { method: 'PUT', body: JSON.stringify({ comment: 'Acceptance review.' }) });
  check('admin reviews project', review.status === 200 && review.body?.project?.status === 'reviewed', JSON.stringify(review.body));
  const after = await api('projects/block2', a.token);
  check('student A sees reviewed status and comment', after.body?.project?.status === 'reviewed' && after.body?.project?.reviewComment === 'Acceptance review.');
  const reviewByStudent = await api(`projects/admin/student/${a.id}/block2/review`, b.token, { method: 'PUT', body: JSON.stringify({ comment: 'x' }) });
  check('student B cannot review A\'s project', reviewByStudent.status === 403);

  // Chapter 2 → 3 gate: Chapter 3 writes need Chapter 2 qualified, then the six Chapter 3 sessions
  check('student A Chapter 3 capstone is 409 without Chapter 2 qualification', (await api('chapter-assessment/block3', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE3_ANSWERS }) })).status === 409);
  check('student A Chapter 3 project save is 409 without Chapter 2 qualification', (await api('projects/block3', a.token, { method: 'PUT', body: JSON.stringify({ workspace: {} }) })).status === 409);
  const done2 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { ...state, completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS] } }) });
  check('student A marks all Chapter 2 sessions complete', done2.status === 200);
  const cap2 = await api('chapter-assessment/block2', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE2_ANSWERS }) });
  check('Chapter 2 capstone accepted after sessions complete', cap2.status === 200 && Boolean(cap2.body?.assessment?.submittedAt), JSON.stringify(cap2.body));
  const cap3early = await api('chapter-assessment/block3', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE3_ANSWERS }) });
  check('Chapter 3 capstone is 409 before Chapter 3 sessions complete', cap3early.status === 409, `status ${cap3early.status}`);
  const done3 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { ...state, completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS] } }) });
  check('student A marks all Chapter 3 sessions complete', done3.status === 200);
  const cap3 = await api('chapter-assessment/block3', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE3_ANSWERS }) });
  check('Chapter 3 capstone accepted after sessions complete', cap3.status === 200 && Boolean(cap3.body?.assessment?.submittedAt) && Boolean(cap3.body?.assessment?.suggestedLevel), JSON.stringify(cap3.body));
  const workspace3 = {
    workLog: [{ planned: 'Audit a music service at category level, then the club sign-up dataset', did: 'Listed the data categories the privacy policy names, traced five collection → purpose → benefit → risk chains, then checked every column for missing values, duplicates and who is missing.', result: 'Three vague purposes found; nine missing club choices, four duplicate rows and no mid-year joiners in the dataset.', blocker: '', decision: 'Flag the sensitive and inferred columns for removal', next: 'Write the Responsible Data Card', minutes: 40, date: '2026-09-11' }],
    evidence: [
      { label: 'Data category audit', url: '', note: 'Location, listening history, contacts and an inferred mood category; "to improve our services" covers a lot.' },
      { label: 'Dataset fairness findings', url: '', note: 'Missing value at column:club_choice; Duplicate at row:17; Who is missing (representation) at column:year_group: no mid-year joiners.' },
      { label: 'Responsible Data Card (Sheet A5)', url: '', note: 'What is collected, observed and inferred, why it is needed, who might be missing, what to minimise and what needs human review.' }
    ],
    finalRecommendation: 'Use the redesigned data plan only for club planning after removing home_eircode, parent_phone, date_of_birth and inferred_income_band, adding a representation check for mid-year joiners and keeping data for one term; it must not be used to judge individual students.'
  };
  const save3 = await api('projects/block3', a.token, { method: 'PUT', body: JSON.stringify({ workspace: workspace3 }) });
  check('student A PUT /api/projects/block3 ok after Chapter 2 qualified', save3.status === 200 && save3.body?.project?.status === 'in_progress' && save3.body?.project?.brief?.chapter === 'Data Detective', JSON.stringify(save3.body));
  const submit3 = await api('projects/block3/submit', a.token, { method: 'POST' });
  check('student A submits Chapter 3 project', submit3.status === 200 && submit3.body?.project?.status === 'submitted' && submit3.body?.project?.submittedSnapshot?.finalRecommendation === workspace3.finalRecommendation, JSON.stringify(submit3.body));
  check('student B Chapter 3 project save is still 409 without Chapter 2 qualification', (await api('projects/block3', b.token, { method: 'PUT', body: JSON.stringify({ workspace: {} }) })).status === 409);

  // Chapter 3 → 4 gate: student A is Chapter 3 qualified (cap3 above), so Chapter 4 needs only its ten sessions
  const cap4early = await api('chapter-assessment/block4', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE4_ANSWERS }) });
  check('Chapter 4 capstone is 409 before Chapter 4 sessions complete', cap4early.status === 409, `status ${cap4early.status}`);
  const done4 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { ...state, completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS, ...CHAPTER4_SESSIONS] } }) });
  check('student A marks all Chapter 4 sessions complete', done4.status === 200);
  const cap4 = await api('chapter-assessment/block4', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE4_ANSWERS }) });
  check('Chapter 4 capstone accepted after sessions complete', cap4.status === 200 && Boolean(cap4.body?.assessment?.submittedAt) && Boolean(cap4.body?.assessment?.suggestedLevel), JSON.stringify(cap4.body));
  const workspace4 = {
    workLog: [{ planned: 'Run the three-version prompt experiment and verify three claims', did: 'Asked the weak River Shannon question, rebuilt it with C-T-C-F, iterated v3 one addition at a time, tried the four roles and checked three claims against independent sources.', result: 'v2 output fitted the task; one of the three claims was wrong and one citation did not exist.', blocker: '', decision: 'Keep the ask-me-questions-first addition; drop the example, it added length only', next: 'Write the reusable template', minutes: 45, date: '2026-09-11' }],
    evidence: [
      { label: 'Lab: Prompt Lab 1: C-T-C-F', url: '', note: 'v1: Tell me about the River Shannon. → No, generic and confident; v2: rebuilt with context, task, constraints and format → Yes, it answered the actual task.' },
      { label: 'Lab: Verification challenge', url: '', note: 'Length about 360 km → OSI → supported → kept; Shannon Bridge Act 1931 → no record → wrong → removed.' },
      { label: 'Lab: Build a reusable prompt', url: '', note: 'Template for preparing for work experience with [role], [company] and [what I already know] placeholders.' }
    ],
    finalRecommendation: 'Use the C-T-C-F template for real tasks, keep the ask-me-questions-first addition, and verify every figure and citation against an independent source before relying on it; confident wording is not confident truth.'
  };
  const save4 = await api('projects/block4', a.token, { method: 'PUT', body: JSON.stringify({ workspace: workspace4 }) });
  check('student A PUT /api/projects/block4 ok after Chapter 3 qualified, brief carries its chapter', save4.status === 200 && save4.body?.project?.status === 'in_progress' && typeof save4.body?.project?.brief?.chapter === 'string' && save4.body.project.brief.chapter.length > 0, JSON.stringify(save4.body));
  const submit4 = await api('projects/block4/submit', a.token, { method: 'POST' });
  check('student A submits Chapter 4 project', submit4.status === 200 && submit4.body?.project?.status === 'submitted' && submit4.body?.project?.submittedSnapshot?.finalRecommendation === workspace4.finalRecommendation, JSON.stringify(submit4.body));
  check('student B Chapter 4 project save is 409 without Chapter 3 qualification', (await api('projects/block4', b.token, { method: 'PUT', body: JSON.stringify({ workspace: {} }) })).status === 409);

  // Chapter 6 writes are rejected before Chapter 5 qualification, including project submission.
  for (const [path,method,body] of [['chapter-assessment/block6','POST',{answers:CAPSTONE6_ANSWERS}],['projects/block6','PUT',{workspace:{}}],['projects/block6/submit','POST',{}]]) {
    const res=await api(path,a.token,{method,body:JSON.stringify(body)});
    check(`${path} is 409 before Chapter 5 qualification`,res.status===409);
  }
  // Chapter 4 → 5 gate: student A is Chapter 4 qualified (cap4 above), so Chapter 5 needs only its nine sessions
  const cap5early = await api('chapter-assessment/block5', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE5_ANSWERS }) });
  check('Chapter 5 capstone is 409 before Chapter 5 sessions complete', cap5early.status === 409, `status ${cap5early.status}`);
  const done5 = await api('progress', a.token, { method: 'PUT', body: JSON.stringify({ state: { ...state, completed: [...CHAPTER1_SESSIONS, ...CHAPTER2_SESSIONS, ...CHAPTER3_SESSIONS, ...CHAPTER4_SESSIONS, ...CHAPTER5_SESSIONS] } }) });
  check('student A marks all Chapter 5 sessions complete', done5.status === 200);
  check('Chapter 5 practical completion alone does not unlock Chapter 6 project', (await api('projects/block6',a.token,{method:'PUT',body:JSON.stringify({workspace:{}})})).status===409);
  const cap5 = await api('chapter-assessment/block5', a.token, { method: 'POST', body: JSON.stringify({ answers: CAPSTONE5_ANSWERS }) });
  check('Chapter 5 capstone accepted after sessions complete', cap5.status === 200 && Boolean(cap5.body?.assessment?.submittedAt) && Boolean(cap5.body?.assessment?.suggestedLevel), JSON.stringify(cap5.body));
  const workspace5 = {
    workLog: [{ planned: 'Mark up the AI article, verify claims laterally, run the bias simulator and publish a corrected version', did: 'Highlighted factual claims, emotional framing, missing sources and unsupported certainty, checked five claims in new tabs against independent sources, ran the shortlisting simulator three times and rewrote the article with only the verified claims.', result: 'Two claims wrong, one uncertain; Group B accuracy rose from 10% to 90% only once the proxy was weakened; corrected version is shorter and sourced.', blocker: '', decision: 'Label the survey percentage as uncertain rather than delete it', next: 'Write the three-step trust rule', minutes: 45, date: '2026-09-12' }],
    evidence: [
      { label: 'Lab: AI News Detective', url: '', note: '8 marks: Factual claim×3, Unsupported certainty×2, Emotional framing×2, Missing source×1.' },
      { label: 'Lab: Lateral verification', url: '', note: 'Transition Year began in 1974 → Department of Education page → independent → supported; National AI Tutoring Act 2025 → Irish Statute Book search → independent → wrong.' },
      { label: 'Lab: Bias simulator', url: '', note: '3 runs; Group B 10%–90%; overall 50%–90%.' }
    ],
    finalRecommendation: 'Publish only the corrected version: keep the verified claims about Transition Year and the Leaving Certificate, label the survey figure as uncertain, remove the invented Act and the fabricated report, and add the sources; less exciting, more trustworthy.'
  };
  const save5 = await api('projects/block5', a.token, { method: 'PUT', body: JSON.stringify({ workspace: workspace5 }) });
  check('student A PUT /api/projects/block5 ok after Chapter 4 qualified, brief carries its chapter', save5.status === 200 && save5.body?.project?.status === 'in_progress' && typeof save5.body?.project?.brief?.chapter === 'string' && save5.body.project.brief.chapter.length > 0, JSON.stringify(save5.body));
  const submit5 = await api('projects/block5/submit', a.token, { method: 'POST' });
  check('student A submits Chapter 5 project', submit5.status === 200 && submit5.body?.project?.status === 'submitted' && submit5.body?.project?.submittedSnapshot?.finalRecommendation === workspace5.finalRecommendation, JSON.stringify(submit5.body));
  check('student B Chapter 5 project save is 409 without Chapter 4 qualification', (await api('projects/block5', b.token, { method: 'PUT', body: JSON.stringify({ workspace: {} }) })).status === 409);
  // Chapter 5 qualified; Chapter 6 practical sessions and assessment are now available.
  check('Chapter 6 capstone requires its own eight sessions',(await api('chapter-assessment/block6',a.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE6_ANSWERS})})).status===409);
  const activity6=Object.fromEntries(Object.entries(CHAPTER6_FIELDS).map(([sid,fields])=>[sid,{...Object.fromEntries(fields.map((v,i)=>[i,v])),...(['b6s1','b6s2','b6s4','b6s6'].includes(sid)?{ack:true,mode:'fallback'}:{})}]));
  activity6.b6s7=Object.fromEntries(CHAPTER6_DISCLOSURE.map((r,i)=>[i,Object.fromEntries(['scenario','decision','reason','wording'].map((k,j)=>[k,r[j]]))]));
  const done6=await api('progress',a.token,{method:'PUT',body:JSON.stringify({state:{...state,completed:[...CHAPTER1_SESSIONS,...CHAPTER2_SESSIONS,...CHAPTER3_SESSIONS,...CHAPTER4_SESSIONS,...CHAPTER5_SESSIONS,...CHAPTER6_SESSIONS],activity:activity6}})});
  check('Chapter 6 calculated evidence saves',done6.status===200);
  const cap6=await api('chapter-assessment/block6',a.token,{method:'POST',body:JSON.stringify({answers:CAPSTONE6_ANSWERS})});
  check('Chapter 6 feedback capstone qualifies',cap6.status===200&&Boolean(cap6.body?.assessment?.submittedAt)&&cap6.body?.assessment?.suggestedLevel==='Going further');
  const workspace6={
    workLog:[{did:'Preserved and cleaned a working copy, validated exclusions, calculated seven eligible lines and reviewed every claim.',result:'Partial subtotal €249.00, four held records and the unsupported attendance prediction removed.'}],
    evidence:[{label:'Data Cleaning Log and validation evidence',note:CHAPTER6_FIELDS.b6s4.slice(3,6).join(' | '),url:''},{label:'Filled human-review checklist',note:CHAPTER6_FIELDS.b6s5.join(' | '),url:''},{label:'Disclosure choices',note:CHAPTER6_DISCLOSURE.map(r=>r.join(' → ')).join('; '),url:''}],
    finalRecommendation:CHAPTER6_RECOMMENDATION
  };
  const save6=await api('projects/block6',a.token,{method:'PUT',body:JSON.stringify({workspace:workspace6})});
  check('Chapter 6 project write succeeds after Chapter 5 qualification',save6.status===200&&save6.body?.project?.brief?.chapter==='AI for Learning & Work');
  const submit6=await api('projects/block6/submit',a.token,{method:'POST'});
  check('Chapter 6 submitted snapshot retains cleaning, review and disclosure evidence',submit6.status===200&&submit6.body?.project?.status==='submitted'&&(submit6.body?.project?.submittedSnapshot?.evidence||[]).length===workspace6.evidence.length&&workspace6.evidence.every((e,i)=>{const got=(submit6.body?.project?.submittedSnapshot?.evidence||[])[i]||{};return got.label===e.label&&got.note===e.note&&got.url===e.url})&&submit6.body?.project?.submittedSnapshot?.finalRecommendation===CHAPTER6_RECOMMENDATION);
  check('student B Chapter 6 remains locked',(await api('projects/block6',b.token,{method:'PUT',body:JSON.stringify({workspace:workspace6})})).status===409);
} catch (error) {
  check('run completed without exception', false, error.message);
} finally {
  await cleanup(users);
}
finish();
