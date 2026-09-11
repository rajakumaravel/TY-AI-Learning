# AI in Practice — TY Student Portal V2.1

The portal follows **AI in Practice · Student Book v1.0 · September 2026** as the curriculum source of truth.

## Platform status

This branch (`infra-cloudflare-supabase`) targets Cloudflare Pages, Pages Functions, Supabase Auth with Google OAuth, and Supabase Postgres. Phase 1 live acceptance is evidenced on Preview; Production cutover is deferred until all phases are accepted; see [ADR-007](docs/decisions/ADR-007-cloudflare-supabase-platform.md). Netlify code is retained as rollback/reference, not as the runtime for the Cloudflare deployment.

## Pilot features

- Chapters 1–2, practical evidence and reflections
- Experience Labs in both chapters: safety-gated free tools, fallbacks, and structured evidence
- Downloadable lab datasets and templates in each Chapter 2 session (`npm run datasets` regenerates them)
- Chapter 3, Data Detective, following Student Book pp. 14–17: a category-level audit of one real service, collection → purpose → benefit → risk chains, a dataset fairness challenge over a synthetic, deliberately flawed club sign-up dataset, and a Responsible Data Card (Sheet A5) with a better data plan
- Chapter 4, Generative AI & Prompting, following Student Book pp. 18–22: a three-version prompt experiment (Sheet A4) run through DuckDuckGo AI Chat with no account, a C-T-C-F prompt builder, the four useful roles, a three-claim verification log (Sheet A2) over synthetic sample outputs with a teacher key, injecting doubt, a reusable prompt template and a red-team check
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

Every branch push, including `main`, deploys to the Cloudflare Pages Preview environment as `preview-<branch>` (so `main` is served at `https://preview-main.ty-ai-learning.pages.dev`). The Production release workflow is manual dispatch only; it applies database migrations before deploying. Production is deferred until all roadmap phases are accepted on Preview.

The [ADR-007 acceptance checklist](docs/decisions/ADR-007-cloudflare-supabase-platform.md) is evidenced on Preview; only the Production release itself is outstanding. Phase 2 follows; see [ROADMAP](ROADMAP.md).
