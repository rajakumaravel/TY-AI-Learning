# Production cutover runbook

- **Status:** executed 2026-09-14. Production is deployed; deployment `228b8cd3` serves commit `64fad52`.
- **Authority:** the operator alone dispatches the release workflow (ADR-007, operator decision 2026-09-11).
- **Target:** https://ty-ai-learning.pages.dev (Cloudflare Pages project `ty-ai-learning`, account `1a3b2dfb2a9f6ee704569b2ea0d357bf`)
- **Database:** Supabase project ref `fnnftbsalquzwgzlsovx` — the *same* project Preview already uses. There is no separate production database.

## State at drafting

| Check | State |
|---|---|
| Roadmap phases 1–10 | complete and accepted on Preview |
| Cloudflare Production deployments | none — every deployment is Preview |
| Latest `preview-main` | `64fad52`, deployment `2a80d962` (API 94, browser 235, walkthrough 258) |
| `design-audit` | merged via PR #24 on 2026-09-13 |
| Supabase migrations | `20260910115137` and `20260910120000` applied remotely; local and remote in sync |

This table records the state at drafting on 2026-09-13. What actually happened on execution is at the foot of this file.

## Step 0 — decide what ships

Done for this release: the portal hardening merged via PR #24 on 2026-09-13, so the safeguarding, data-loss and accessibility fixes are on `main` and will ship with the first Production deployment.

For any future release, do not deploy a commit that is not on `main`: the workflow defaults to `main` and the `head_sha` input exists for re-releasing an older commit, not for shipping unmerged work.

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

GitHub → Actions → **Release Cloudflare + Supabase** → Run workflow. Pass the full 40-character SHA of the release commit in `head_sha` rather than leaving it blank: blank sets `DEPLOY_SHA=main`, which is passed verbatim to `wrangler pages deploy --commit-hash=main` and is not a valid commit hash.

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

As of 2026-09-14 exactly one Production deployment exists (`228b8cd3`), so there is still nothing earlier to roll back to. Rollback means re-dispatching the workflow with `head_sha` set to a known-good earlier commit, or promoting a previous deployment from the Cloudflare dashboard once more than one Production deployment exists.

The migrations have no down path. Neither pending migration is new, so this release should not change the schema at all; if that stops being true for a future release, plan the database rollback separately before dispatching.

## Execution record — 2026-09-14

Executed by the operator with Claude Code driving the CLI steps.

| Item | Value |
|---|---|
| Release commit | `64fad52c1c78ede32a25e6471b01f2ced8fbbeff` (`main`, PR #24 merge) |
| Successful release run | `34835574318` |
| Production deployment | `228b8cd3` (branch `main`, https://228b8cd3.ty-ai-learning.pages.dev) |
| Step 1 gate | `ALL SUITES GREEN` on preview `2a80d962` — API 94/94, browser 235/235, walkthrough 258/258 |
| Step 6 Production acceptance | API 94/94, browser 235/235, walkthrough 258/258 against https://ty-ai-learning.pages.dev |
| Database | dry-run and apply both reported `Remote database is up to date.` — no schema change |

Step 2 was verified by CLI rather than by eye: `wrangler pages secret list` confirmed `SUPABASE_SERVICE_ROLE_KEY`, and the Cloudflare API's `deployment_configs.production.env_vars` confirmed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_EMAILS` and `production_branch=main`. Only the presence of each binding was checked; the values were not compared against Preview.

### Three dispatches failed before this one

Runs `34834129171`, `34834429193` and `34834579198` all failed at the **Dry-run Supabase migrations** step and never reached the apply, the build or the deploy. Production stayed at zero deployments throughout and no migration ran.

The cause was the `SUPABASE_DB_URL` secret in the GitHub `production` environment, which this runbook had assumed good:

1. run 1 — `password authentication failed for user "postgres"` (SQLSTATE 28P01);
2. run 2 — `failed to parse connection string`, after the secret was rewritten;
3. run 3 — 28P01 again.

The password was then reset in the Supabase dashboard and the connection string verified with `psql` before the secret was set a final time. The host, port and user were never wrong; `supabase/.temp/pooler-url` matched what was being tried.

Worth carrying forward: `supabase migration list --linked` passing locally proves nothing about this secret, because the CLI authenticates from the keychain session rather than from `SUPABASE_DB_URL`. Validate the secret directly before dispatching:

```bash
psql "$SUPABASE_DB_URL" -c 'select 1'
```

### Still outstanding

- The operator has not yet hand-confirmed Google sign-in and `/admin` on the Production URL (the last line of Step 6). Step 4's redirect and Site URL entries were added but could not be read back here — no management-API token is configured — so that hand-check is the only evidence they are correct.
- `scripts/verify-preview.sh` hung for several minutes in its `until gh run list ... completed` poll even though the target run had completed the previous day; the same query run directly returned it immediately. It did eventually exit 0.
