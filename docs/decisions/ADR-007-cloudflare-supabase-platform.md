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

The migration-branch Pages workflow runs on pushes to `infra-cloudflare-supabase` and supports manual dispatch. Its GitHub job uses the `production` environment for build/deployment credentials; this does not select the Cloudflare Pages runtime environment. Branch previews need runtime bindings configured under Cloudflare **Preview**.

The standalone Supabase migration workflow remains manual. The separate Production release workflow is configured to run after successful CI on `main`, or by manual dispatch; it applies migrations before deploying with `--branch=main`. Do not merge or manually release until the cutover exit criteria below are evidenced.

Before release, commit and verify a dependency lockfile: the Production workflow currently uses `npm ci` and npm caching, which require a lockfile. Disable the obsolete standalone Worker Git build after confirming the Pages workflow is the intended deployment path; keep the rollback source intact.

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

Do not merge the migration into `main` until all are true:

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
- Database migration history currently records only `20260910115137_initial_platform_schema`. Reconcile the existing `20260910120000_lock_down_auth_trigger.sql` through the repository migration workflow; do not invent a replacement timestamp. Confirm dry-run output before applying.
- Cross-device persistence, capstone gating, project save/submit/review, student isolation, non-admin rejection, and exact Production deployment remain pending validation.
- Legacy learner-data migration versus explicit pilot waiver remains an operator decision. Preserve legacy data until decided.
- Update this record with exact commit/deployment IDs and test evidence before marking cutover complete. Phase 2 remains blocked until then.
