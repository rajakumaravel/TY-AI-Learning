// ADR-007 cutover acceptance: runs against a live Cloudflare Pages deployment and the linked Supabase project.
// Not part of `npm test`. Requires `supabase login` (keys are read from the CLI and never printed).
//
//   ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev node tests/acceptance/cutover-acceptance.mjs
//
// Creates three throwaway auth users (two students, one app-metadata admin), exercises the API and RLS, then deletes them.

import { randomUUID } from 'node:crypto';
import { BASE, api, rest, check, finish, createUser, cleanup, CHAPTER1_SESSIONS, CAPSTONE1_ANSWERS } from './lib.mjs';

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
} catch (error) {
  check('run completed without exception', false, error.message);
} finally {
  await cleanup(users);
}
finish();
