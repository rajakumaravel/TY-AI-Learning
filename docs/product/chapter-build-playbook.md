# Chapter build playbook

One chapter, one pass. Roughly 40 minutes wall clock when the review finds only small things.

1. **Sources.** Read the chapter in `docs/source/student-book.txt`, the matching block in `docs/source/curriculum-pilot-v1.txt`, and any review-document section the ROADMAP adopts.
2. **Contract.** Copy `docs/product/chapter-contract-template.md` to `docs/product/phase-<n>-contract.md`; fill the Chapter-specific section only. Decide any tool and any new activity kind here, with its selector ids.
3. **Branch.** `git checkout -b phase<n>-chapter<k> main`; commit and push the contract.
4. **Build.** Run the saved workflow `chapter-build` with `args: { branch, contract, block: "block<k>", slug: "<chapter-slug>", sessions: "b<k>s1-b<k>s<m>" }`. Three agents build in worktrees and each commits on `phase<n>-chapter<k>/<agent>`.
5. **Merge.** Merge the three agent branches into the phase branch. Conflicts are only ever appended blocks in `styles.css`; keep both sides. `npm run check` must be 100% green; fix cross-agent test drift here.
6. **Verify and review, in parallel.** Push, then `scripts/verify-preview.sh phase<n>-chapter<k>` (waits for the deploy, runs API with one retry, browser, walkthrough, audit). At the same time run the saved workflow `chapter-review` with `args: { branch, contract, pages: "<a>-<b>" }`.
7. **Fix.** Act on every confirmed review finding and every failed step. Commit with the finding list in the message. Re-run `npm run check`, push, re-run `verify-preview.sh`.
8. **Ship to preview-main.** PR to `main`, merge, `scripts/verify-preview.sh main`. Do not rebuild the walkthrough report artifact (operator decision, 2026-09-12): the suite output is the evidence and the artifact is not worth the tokens.
9. **Record.** ROADMAP pointer, release note, memory.

Production is never deployed in this loop (ADR-007, operator decision).
