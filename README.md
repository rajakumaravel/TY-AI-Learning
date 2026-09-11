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
npm install
npm run check
```

Branch pushes trigger the Pages preview workflow. The Production release workflow is configured for successful CI on `main` and manual dispatch; it applies database migrations before deployment. It currently requires a committed dependency lockfile for `npm ci` and npm caching. Resolve that prerequisite before release.

Complete the [ADR-007 acceptance checklist](docs/decisions/ADR-007-cloudflare-supabase-platform.md), including cross-device persistence, project submission/review, student isolation and the legacy-data decision, before merging. Phase 2 follows successful cutover and Phase 1 acceptance; see [ROADMAP](ROADMAP.md).
