# AI in Practice — TY Student Portal V2.1

The portal follows **AI in Practice · Student Book v1.0 · September 2026** as the curriculum source of truth.

## Platform status

This branch (`infra-cloudflare-supabase`) targets Cloudflare Pages, Pages Functions, Supabase Auth with Google OAuth, and Supabase Postgres. Production cutover and Phase 1 live acceptance remain pending; see [ADR-007](docs/decisions/ADR-007-cloudflare-supabase-platform.md). Netlify code is retained as rollback/reference, not as the runtime for the Cloudflare deployment.

## Pilot features

- Chapters 1–2, practical evidence and reflections
- Applied chapter capstones, progression gates and badges
- Google sign-in and account-owned progress
- Chapter 2 Project Workspace with work logs, evidence and submitted snapshots
- Protected teacher/admin review at `/admin`
- Formative feedback with teacher overrides
- Automated curriculum, auth-contract and build checks

## Configuration

GitHub Actions builds use variable `VITE_SUPABASE_URL` and secret `VITE_SUPABASE_ANON_KEY` (a publishable key, never a server secret).
Deployment uses secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and variable `CLOUDFLARE_PAGES_PROJECT`.
The migration workflow uses secret `SUPABASE_DB_URL`; ensure it is accessible to that job.

Cloudflare Pages Functions require these bindings in both Preview and Production:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- `ADMIN_EMAILS` (comma-separated allowlist), or an authorised Supabase app-metadata admin role

After updating bindings, redeploy the affected environment. A GitHub job named `production` does not select Cloudflare's runtime environment.

Enable Google in Supabase Auth and configure the Google callback and approved application redirect URLs. Never commit populated environment files or expose server secrets through `VITE_*` values.

## Validation and release

```bash
npm ci
npm run check
```

Live cutover acceptance against a deployment (needs `supabase login` and `npx playwright install chromium`; creates and deletes throwaway auth users, prints no keys). The API script covers persistence, the capstone gate, RLS isolation, admin authorisation and project submit/review; the browser script covers cross-device persistence, the Chapter 1→2 lock as rendered, and admin-page rejection:

```bash
ACCEPTANCE_BASE_URL=https://<deployment>.ty-ai-learning.pages.dev npm run acceptance
```

Branch pushes trigger the Pages preview workflow. The Production release workflow is configured for successful CI on `main` and manual dispatch; it applies database migrations before deployment. The dependency lockfile required by `npm ci` is committed.

Complete the [ADR-007 acceptance checklist](docs/decisions/ADR-007-cloudflare-supabase-platform.md), including cross-device persistence, project submission/review, student isolation and the legacy-data decision, before merging. Phase 2 follows successful cutover and Phase 1 acceptance; see [ROADMAP](ROADMAP.md).
