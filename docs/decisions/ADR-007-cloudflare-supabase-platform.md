# ADR-007 — Cloudflare Pages + Supabase platform target

- **Status:** Accepted for migration branch validation
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

The current pilot runs on Netlify Identity, Netlify Functions and Netlify Database. Production deploys have been paused because the Netlify team exhausted deploy-capable credits. The product needs a platform with a generous free tier, permanent public hosting, Google sign-in, relational persistence, server-side execution and a low operational burden for a school pilot.

## Decision

Adopt the following target architecture:

- **Frontend hosting:** Cloudflare Pages
- **Server-side API:** Cloudflare Pages Functions / Workers runtime
- **Authentication:** Supabase Auth with Google OAuth
- **Database:** Supabase Postgres
- **Storage:** Supabase Storage when project evidence uploads are introduced
- **Authorisation:** student ownership enforced through API identity checks and Postgres RLS; privileged admin/assessment writes remain server-side

The migration is developed on `infra-cloudflare-supabase` and must not be merged into `main` until the new stack has been provisioned and acceptance-tested.

## Compatibility strategy

The existing frontend currently imports `@netlify/identity`. During migration, Vite aliases that module to a local Supabase-backed compatibility adapter. This avoids rewriting every student/admin UI call in the same change while replacing the authentication provider underneath.

Existing `/api/*` and `/api/projects/*` URLs are retained. Cloudflare Pages Functions provide those routes so the browser contract does not change.

The existing Netlify code remains temporarily in the repository as rollback/reference until the Cloudflare/Supabase cutover is complete.

## Supabase data model

Supabase Auth UUIDs become the canonical learner identifier. Application tables use `user_id uuid references auth.users(id)` rather than Netlify Identity text IDs.

A nullable `legacy_identity_user_id` is retained on `learners` only to support controlled reconciliation of existing pilot records during cutover. Student email is not duplicated into the application database.

RLS is enabled on every learner-owned table. Browser roles receive read-only access scoped to `auth.uid() = user_id`. Mutations continue through trusted server-side Functions using the service-role credential after authenticating the caller.

## Existing pilot-data migration

Existing learner progress cannot be safely remapped solely from the application database because the app intentionally did not store student email addresses. Therefore data migration is a separate cutover operation:

1. export Netlify Identity users with identity ID and email from the authorised identity system;
2. export application rows keyed by the legacy identity ID;
3. provision/sign in the same users through Supabase Auth;
4. build an explicit old-ID → Supabase-user-ID mapping using the authorised identity export;
5. import progress, assessments and project rows while populating `legacy_identity_user_id`;
6. verify row counts and sample learners before switching DNS/production traffic.

No guessed or name-based identity matching is permitted.

## CI/CD

Normal CI runs on all branches and pull requests to `main`, executes the regression suite and verifies the Vite production artifact.

The Pages preview workflow runs on every branch push (including `main`) and supports manual dispatch; it always deploys with `--branch=preview-<branch>` so nothing it does reaches the Production environment. Its GitHub job uses the `production` environment for build/deployment credentials; this does not select the Cloudflare Pages runtime environment. Branch previews need runtime bindings configured under Cloudflare **Preview**.

The standalone Supabase migration workflow remains manual. The separate Production release workflow is manual dispatch only; it applies migrations before deploying with `--branch=main`. Do not dispatch it until the cutover exit criteria below are evidenced and the operator authorises Production.

The dependency lockfile required by `npm ci` is committed (`0310901`); CI and the release workflow both install with `npm ci`. Disable the obsolete standalone Worker Git build after confirming the Pages workflow is the intended deployment path; keep the rollback source intact.

Required GitHub configuration at cutover:

- secret `CLOUDFLARE_API_TOKEN`
- secret `CLOUDFLARE_ACCOUNT_ID`
- variable `CLOUDFLARE_PAGES_PROJECT`
- secret `SUPABASE_DB_URL`
- variable `VITE_SUPABASE_URL` (GitHub Actions build)
- secret `VITE_SUPABASE_ANON_KEY` (GitHub Actions build; publishable key only)

Required Cloudflare Pages runtime bindings in **both Preview and Production** (save changes, then redeploy the affected environment):

- `SUPABASE_URL` (runtime)
- `SUPABASE_ANON_KEY` (runtime)
- `SUPABASE_SERVICE_ROLE_KEY` (runtime secret)
- `ADMIN_EMAILS` or Supabase app-metadata admin role

## Cutover exit criteria

Do not release to Production until all are true (merge to `main` is permitted once every item except the Production deployment itself is evidenced on Preview):

- Supabase project created and Google OAuth configured;
- baseline migration applied successfully;
- Cloudflare Pages project created and permanent `pages.dev` URL verified;
- student Google sign-in works;
- progress persists across devices;
- Chapter 1→2 assessment gate still works;
- Project Workspace save/submit/review works;
- one learner cannot read another learner's data;
- admin routes reject non-admin users;
- CI is green;
- pilot data migration is either successfully reconciled or explicitly waived for the pilot;
- rollback path remains available until post-cutover verification is complete.

## Validation record — 2026-09-11

- Phase 1 code exists; production acceptance is not yet signed off.
- Commit `1bc730572812747ba121195ce8641de60b1bed2d` passed 54 tests and Pages deployment; this does not establish authenticated end-to-end acceptance.
- The operator reports runtime bindings configured in both Preview and Production. Their values have not been read or verified here.
- Database migration history reconciled 2026-09-11. Because the migration workflow only exists on this branch and cannot be dispatched before merge, the operator applied `20260910120000_lock_down_auth_trigger.sql` from a linked Supabase CLI session (project ref `fnnftbsalquzwgzlsovx`) after a dry-run listed exactly that file. `supabase migration list --linked` now reports both `20260910115137` and `20260910120000` applied remotely. The change is a single idempotent `revoke execute` on `public.handle_new_auth_user()`.
- Latest Preview deployment: `2836a238-f5d3-4d5e-86aa-7d327cc40f23` (commit `1563d39`, https://2836a238.ty-ai-learning.pages.dev). No Production deployment exists yet. `SUPABASE_SERVICE_ROLE_KEY` is confirmed present as an encrypted secret in both Preview and Production; plain-text bindings are not listable via CLI and remain operator-reported.
- Automated acceptance (2026-09-11) against Preview deployment `2836a238` (commit `1563d39`), using throwaway password-auth users created and deleted through the Supabase admin API: `tests/acceptance/cutover-acceptance.mjs` 32/32 and `tests/acceptance/ui-acceptance.mjs` (Playwright) 19/19. Evidenced: unauthenticated 401s; server-side progress persistence read back in a fresh browser context (cross-device); capstone submission rejected with 409 until all Chapter 1 sessions complete and 400 for thin answers, accepted afterwards; Chapter 2 card rendered locked until the capstone exists and unlocked after; project save/submit/review round-trip with the exact submitted snapshot visible to admin; RLS denies cross-learner reads of `student_projects`, `learner_progress` and `learners` and denies direct browser writes; non-admin callers receive 403 on every admin route and the `/admin` page shows the rejection message; app-metadata `role=admin` is honoured and the dashboard lists the student.
- Manual validation by the operator (2026-09-11): Google OAuth sign-in works on the Preview deployment, and the real teacher account listed in `ADMIN_EMAILS` can open `/admin`.
- Known gap, not blocking cutover: chapter unlock is evaluated client-side from `state.chapterAssessments`, which the learner's own progress `PUT` can set. The server enforces the session prerequisite for capstone submission but does not derive qualification from `chapter_assessments`. Track as a Phase 2 hardening item.
- Operator decision (2026-09-11): defer the Production deployment until every roadmap phase has been accepted on Preview. The migration branch merges to `main`; `main` deploys to the Preview environment as `preview-main`; the Production release workflow is manual only. All ADR-007 exit criteria except the Production deployment itself are evidenced above, so Phase 2 may begin.
- Before the eventual Production release: rerun `npm run acceptance` against `preview-main`, dispatch the release workflow, verify the deployed commit with `wrangler pages deployment list`, then rerun `npm run acceptance` against `https://ty-ai-learning.pages.dev`.
