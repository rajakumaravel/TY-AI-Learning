export const meta = {
  name: 'chapter-build',
  description: 'Build one chapter in three parallel worktrees (content, student-ui, workspace-api) from a chapter contract',
  whenToUse: 'After a phase contract is committed and pushed on its branch. args: { branch, contract, block, slug, sessions }',
  phases: [{ title: 'Implement', detail: 'three agents in isolated worktrees, disjoint file ownership', model: 'sonnet' }],
}
const { branch, contract, block, slug, sessions } = args
const RESULT = { type: 'object', properties: {
  branch: { type: 'string' }, commit: { type: 'string' },
  filesChanged: { type: 'array', items: { type: 'string' } },
  summary: { type: 'string' },
  deviations: { type: 'array', items: { type: 'string' } },
  testsRun: { type: 'string' },
}, required: ['branch', 'commit', 'filesChanged', 'summary', 'deviations', 'testsRun'] }

const common = (name, owns, task) => `You are the "${name}" implementation agent for ${block} of the TY AI Learning portal.
You are in an isolated git worktree. FIRST run: git fetch origin && git reset --hard origin/${branch} && git checkout -b ${branch}/${name}
Then read ${contract} in full, including its standing-policy section, and the sources it names in docs/source/. Quote the book where the contract says verbatim. Two other agents work in parallel on other files against the same contract; the selector contract is binding for all three. Look at how the previous chapter was done in the same files and follow the same patterns and the dense single-line style of the student files.

You may edit ONLY these files: ${owns.join(', ')}. Do not touch any other file; list anything else you notice under deviations.

Task:
${task}

When done: run npm test (tests depending on other agents' files may fail; say which). git add only your owned files and commit with a clear message ending in the Co-Authored-By line this session's attribution guidance gives you. Return branch, commit sha, files changed, summary, deviations with reasons, and the npm test result line.`

phase('Implement')
const results = await parallel([
  () => agent(common('content',
    ['curriculum.json', 'scripts/generate-datasets.mjs', 'public/datasets/*', 'docs/teacher/*', 'tests/v21.test.mjs', 'tests/experience-labs.test.mjs', 'tests/lab-datasets.test.mjs', 'docs/releases/*', 'README.md', 'ROADMAP.md'],
    `1. Add ${block} to curriculum.json exactly per the contract's Chapter-specific section (block fields, sessions ${sessions}, shapes, verbatim book text, all key words, reflections, pageRef). Re-emit with the repo convention (objects multiline, scalar arrays inline, 2-space) so earlier blocks are byte-identical; verify with git diff.
2. scripts/generate-datasets.mjs: add the contract's files, deterministic (no Date/Math.random), teacher keys to docs/teacher. Run the generator, commit outputs and manifest.json; do not re-commit zips whose only change is bytes.
3. Keep tests/v21.test.mjs, tests/experience-labs.test.mjs and tests/lab-datasets.test.mjs green and covering the new chapter and downloads.
4. Docs: release note, README pilot-features line, ROADMAP current-work pointer.`), { label: 'impl:content', isolation: 'worktree', schema: RESULT, model: 'sonnet' }),

  () => agent(common('student-ui',
    ['app.js', 'index.html', 'styles.css', 'admin.js', 'lib/chapter-capstone.mjs', 'lib/project-briefs.mjs', 'tests/chapter-capstone.test.mjs', `tests/${slug}.test.mjs`],
    `1. app.js/styles.css/admin.js: implement any new activity kind the contract defines (renderer, DOM-only wiring like the lab/dataset/prompt kinds, activityReady rule, admin label, phone-width styles). If the contract defines no new kind, change nothing in these files beyond what the contract asks.
2. lib/chapter-capstone.mjs: CAPSTONES.${block} per contract; block-gated vocabulary; earlier chapters' scoring unchanged; add a case to tests/chapter-capstone.test.mjs.
3. lib/project-briefs.mjs: ${block} brief per contract.
4. Write tests/${slug}.test.mjs per the contract's standing Tests policy; note which assertions fail only because other agents' files are absent in your worktree.`), { label: 'impl:student-ui', isolation: 'worktree', schema: RESULT, model: 'sonnet' }),

  () => agent(common('workspace-api',
    ['project-workspace.js', 'functions/api/[[path]].js', 'tests/project-workspace.test.mjs', 'tests/project-workspace-gate.test.mjs', 'tests/cloudflare-runtime.test.mjs', 'tests/acceptance/lib.mjs', 'tests/acceptance/cutover-acceptance.mjs', 'tests/acceptance/ui-acceptance.mjs', 'tests/acceptance/live-walkthrough.mjs', 'tests/acceptance/ui-audit.mjs'],
    `1. functions/api/[[path]].js: requiredSessions.${block} with the session ids. Nothing else.
2. project-workspace.js: summariseActivity for any new kind. Nothing else.
3. Keep the three unit test files green; add one assertion each for the new list and any new summary.
4. tests/acceptance: lib.mjs CHAPTER<k>_SESSIONS and CAPSTONE<k>_ANSWERS; cutover-acceptance.mjs covers the gate from the previous chapter (409 before, 200 after) and the project save; ui-acceptance.mjs covers the chapter card lock and any new kind; live-walkthrough.mjs qualifies the previous chapter via UI then drives every session of ${block} with real clicks using the selector contract, submits the capstone, opens the project, imports lab evidence, submits. Keep every existing step unchanged. ui-audit.mjs screenshots any new kind. node --check every script; they run only against a live deployment.`), { label: 'impl:workspace-api', isolation: 'worktree', schema: RESULT, model: 'sonnet' }),
])
return results
