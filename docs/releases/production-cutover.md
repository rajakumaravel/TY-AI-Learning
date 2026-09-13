# Production cutover runbook

- **Status:** drafted 2026-09-13, not executed. Production has never been deployed.
- **Authority:** the operator alone dispatches the release workflow (ADR-007, operator decision 2026-09-11).
- **Target:** https://ty-ai-learning.pages.dev (Cloudflare Pages project `ty-ai-learning`, account `1a3b2dfb2a9f6ee704569b2ea0d357bf`)
- **Database:** Supabase project ref `fnnftbsalquzwgzlsovx` — the *same* project Preview already uses. There is no separate production database.

## State at drafting

| Check | State |
|---|---|
| Roadmap phases 1–10 | complete and accepted on Preview |
| Cloudflare Production deployments | none — every deployment is Preview |
| Latest `preview-main` | `380fa82`, deployment `f58928e7` (API 94, browser 234, walkthrough 257) |
| `design-audit` | 4 commits ahead of `main`, unmerged |
| Supabase migrations | `20260910115137` and `20260910120000` applied remotely; local and remote in sync |

## Step 0 — decide what ships

`design-audit` carries `78965e0` ("close the student portal's data-loss, safeguarding and a11y gaps") and `30b97d7`. Those are student-facing safeguarding and data-loss fixes, so they should ship in the first Production release rather than after it.

Either merge `design-audit` into `main` through a PR first, or consciously release `main` at `380fa82` and follow up. Do not release a commit that is not on `main`: the workflow defaults to `main` and the `head_sha` input exists for re-releasing an older commit, not for shipping unmerged work.

## Step 1 — verify the release commit on Preview

Run from a worktree checked out at the release branch, never from a stale `main` checkout:

```bash
scripts/verify-preview.sh main
```

Exit 0 and `ALL SUITES GREEN` is the gate. Record the deployment id.

## Step 2 — confirm Production runtime bindings exist

This is the highest-risk item and the only one never verified here. Cloudflare Pages keeps **separate** Preview and Production bindings; a Production deployment with missing bindings serves a working frontend over a broken `/api/*`.

In the Cloudflare dashboard, under Pages → `ty-ai-learning` → Settings → Variables and Secrets → **Production**, confirm all of:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (encrypted secret)
- `ADMIN_EMAILS`

Also confirm the project's production branch is `main`, since the release workflow deploys with `--branch=main`.

## Step 3 — confirm Supabase state

```bash
npx supabase migration list --linked
```

Both migrations already show local and remote in sync, so the workflow's `db push` should be a no-op. If it is not a no-op, stop and read the dry-run output before continuing — the workflow applies migrations before it deploys.

## Step 4 — add the Production redirect URL to Supabase Auth

Google sign-in has only ever been exercised against `*.ty-ai-learning.pages.dev` preview URLs. Before release, add `https://ty-ai-learning.pages.dev` to the Supabase Auth redirect allow-list (and set it as the Site URL if the pilot is to run from Production), otherwise the first real sign-in fails.

## Step 5 — dispatch the release

GitHub → Actions → **Release Cloudflare + Supabase** → Run workflow, leaving `head_sha` blank to deploy `main`.

The job runs `npm run check`, a migration dry-run, the migration apply, a build, an artifact check, and then deploys the exact commit with `--branch=main`.

## Step 6 — verify Production

```bash
npx wrangler pages deployment list --project-name ty-ai-learning | head -5   # expect Environment=Production at the release commit
ACCEPTANCE_BASE_URL=https://ty-ai-learning.pages.dev npm run acceptance
ACCEPTANCE_BASE_URL=https://ty-ai-learning.pages.dev node tests/acceptance/live-walkthrough.mjs
```

The API suite can 404 for a minute after a fresh deployment; retry once before treating it as a failure.

Note that the acceptance suites create and delete throwaway auth users in the live Supabase project. That project is already shared with Preview, so this is not new exposure, but it does mean the suites write to the same database real pilot learners use.

Then have the operator confirm by hand: Google sign-in on the Production URL, and `/admin` opening for the real teacher account in `ADMIN_EMAILS`.

## Step 7 — record it

Append to the ADR-007 validation record: the release commit, the Production deployment id, the suite counts, and the date. Update the cutover status note so the "never deployed" line stops being true.

## Rollback

There is no earlier Production deployment to roll back to — this is the first. Rollback means re-dispatching the workflow with `head_sha` set to a known-good earlier commit, or promoting a previous deployment from the Cloudflare dashboard once more than one Production deployment exists.

The migrations have no down path. Neither pending migration is new, so this release should not change the schema at all; if that stops being true for a future release, plan the database rollback separately before dispatching.
