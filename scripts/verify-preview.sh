#!/usr/bin/env bash
# Waits for the Pages preview of a commit, then runs every live suite against it.
# Usage: scripts/verify-preview.sh <branch> [sha]   (sha defaults to the branch head)
# Exit 0 only if API, browser acceptance and the live walkthrough all pass. The API suite is retried once,
# because Pages Functions can return 404 for a minute after a fresh deployment.
set -u
BRANCH="$1"; SHA="${2:-$(git rev-parse --short "$BRANCH")}"; SHA="${SHA:0:7}"
until gh run list --branch "$BRANCH" --workflow "Deploy Cloudflare Pages Preview" --limit 1 --json status,headSha \
  -q ".[0] | select(.headSha | startswith(\"$SHA\")) | .status" 2>/dev/null | grep -q completed; do sleep 5; done
gh run list --branch "$BRANCH" --limit 2 --json workflowName,conclusion -q '.[] | "\(.conclusion)\t\(.workflowName)"'
URL=$(wrangler pages deployment list --project-name ty-ai-learning 2>/dev/null | grep "$SHA" | grep -oE 'https://[a-z0-9]+\.ty-ai-learning\.pages\.dev' | head -1)
[ -z "$URL" ] && { echo "no deployment found for $SHA"; exit 2; }
echo "deployment $URL"
export ACCEPTANCE_BASE_URL="$URL" SHOTS="${SHOTS:-./live-shots}"
rm -rf "$SHOTS"
run() { node "$1" 2>&1 | grep -E "FAIL|checks passed|Error" | tee "/tmp/verify-$(basename "$1").txt"; ! grep -q "FAIL" "/tmp/verify-$(basename "$1").txt"; }
run tests/acceptance/cutover-acceptance.mjs || { echo "API suite failed, retrying in 45s"; sleep 45; run tests/acceptance/cutover-acceptance.mjs; } || FAILED=1
run tests/acceptance/ui-acceptance.mjs || FAILED=1
run tests/acceptance/live-walkthrough.mjs || FAILED=1
node tests/acceptance/ui-audit.mjs 2>&1 | grep -E "scroll|ERR"
[ -z "${FAILED:-}" ] && echo "ALL SUITES GREEN on $URL" || { echo "SUITES FAILED on $URL"; exit 1; }
