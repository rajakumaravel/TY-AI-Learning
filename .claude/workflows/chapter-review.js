export const meta = {
  name: 'chapter-review',
  description: 'Multi-lens review of a chapter branch against main with one refuter per finding',
  whenToUse: 'After the chapter branches are merged and unit tests pass. args: { branch, contract, pages, extraLenses? }',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}
const { branch, contract, pages, extraLenses = [] } = args
const FINDINGS = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: {
  file: { type: 'string' }, line: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] },
  title: { type: 'string' }, detail: { type: 'string' }, failure: { type: 'string' }, fix: { type: 'string' } },
  required: ['file', 'line', 'severity', 'title', 'detail', 'failure', 'fix'] } } }, required: ['findings'] }
const VERDICT = { type: 'object', properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } }, required: ['refuted', 'reason'] }
const LENSES = [
  ['book-fidelity', `Compare the new block in curriculum.json against docs/source/student-book.txt pages ${pages} and the matching docx block in docs/source/curriculum-pilot-v1.txt. Outcomes, mission, route labels, key words, myths, self-check, level-up, reflections, study accuracy. Report drift.`],
  ['fact-check', 'Read every new file under public/datasets and docs/teacher from this branch. For each factual claim a key marks supported or wrong, check it against your own knowledge; flag anything marked definite that is unverifiable, any dissolved body or dead URL named as a source, and any fabricated citation that could be mistaken for a real one.'],
  ['correctness', 'Runtime correctness of any new activity kind (render, wiring, activityReady, state shape), the server session list, project-workspace summariseActivity, and selector agreement with tests/acceptance/*.mjs. Trace a student path through every session.'],
  ['safety-privacy', 'XSS via innerHTML; any copy, step, placeholder or download that invites a student to enter personal data or sign in; safety notes and gated link present on every session that opens a tool; teacher keys outside public/; synthetic samples labelled as such.'],
  ['pedagogy-ux', 'Read the chapter as a 15-year-old alone on a phone: each session completable in its minutes; ready rules block no honest answer; study examples never hand over the session\'s own answer; no duplicated prompts; no generated-sounding filler; sessions written for pairs adapted for a self-paced learner.'],
  ...extraLenses,
]
phase('Review')
const rounds = await parallel(LENSES.map(([name, brief]) => () => agent(
`Branch ${branch} is checked out in this repo. Get the change set with \`git diff main...${branch} --stat\` and \`git diff main...${branch}\`; read ${contract}, surrounding files and sources as needed. Lens: ${name}. ${brief}
Report only real, specific defects with file, 1-indexed line in the CURRENT file, a concrete failure scenario and a concrete fix. No style nits, no praise. Empty list if nothing real.`,
  { label: `review:${name}`, phase: 'Review', schema: FINDINGS })))
const all = rounds.filter(Boolean).flatMap(r => r.findings)
const seen = new Set()
const deduped = all.filter(f => { const k = `${f.file}:${f.title.toLowerCase().slice(0, 40)}`; if (seen.has(k)) return false; seen.add(k); return true })
log(`${all.length} raw findings, ${deduped.length} after dedup`)
phase('Verify')
const verified = await parallel(deduped.map(f => () => agent(
`Branch ${branch} is checked out. A reviewer claims this defect:
File: ${f.file} line ${f.line}
Title: ${f.title}
Detail: ${f.detail}
Failure scenario: ${f.failure}
Try hard to REFUTE it by reading the actual code, data files and sources and, where possible, running node snippets. For real-world factual claims use your own knowledge carefully and say how confident you are. If the failure cannot happen as described, refuted=true. If uncertain, refuted=true. Give the decisive reason.`,
  { label: `verify:${f.file.split('/').pop()}`, phase: 'Verify', schema: VERDICT }).then(v => ({ ...f, refuted: v ? v.refuted : null, reason: v ? v.reason : 'verifier unavailable' }))))
const confirmed = verified.filter(f => f.refuted === false)
const unverified = verified.filter(f => f.refuted === null)
log(`${confirmed.length} confirmed, ${unverified.length} unverified, ${verified.length - confirmed.length - unverified.length} refuted`)
return { confirmed, unverified }
