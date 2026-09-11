# Phase 4 contract — Chapter 3: Data Detective

Shared contract for parallel implementation. Every agent builds against these exact identifiers and shapes. Source for outcomes: ROADMAP Phase 4 and ADR-005. No Student Book text exists for Chapter 3 yet; `block3.pageRef` values say `Draft · pending Student Book alignment`.

## Chapter block

```text
id: block3   number: "03"   title: "Data Detective"   duration: "3 hours" (sessions total 180 minutes)
badge: "Data Detective"   outcomes: ["LO2","LO5"]
mission: "Investigate a flawed dataset for a school app, fix or flag every problem you find, and publish a Responsible Data Card that says what the data can and cannot be trusted for."
lab: { title: "Fix a bad dataset", summary: ..., stages: [DO b3s2, TEST b3s3, MAKE b3s4, BREAK b3s3, IMPROVE b3s4, PROVE b3s5] }
```

Sessions, in order (ids fixed):

| id | title | minutes | type | activity.kind |
| --- | --- | --- | --- | --- |
| b3s1 | Volunteered, observed, inferred | 25 | PREDICT + DISCOVER | `quiz` (8 items, options `Volunteered`/`Observed`/`Inferred`) |
| b3s2 | Meet the dataset | 35 | TRY | `lab` (tool = built-in, see below) |
| b3s3 | Find what is wrong | 45 | TEST + INVESTIGATE | `dataset` (new kind) |
| b3s4 | Propose the fix | 35 | IMPROVE | `textfields` (4 fields) |
| b3s5 | Responsible Data Card | 40 | REFLECT + EVIDENCE | `textfields` (6 fields: purpose, what is collected, volunteered/observed/inferred split, who could be harmed, what was removed or fixed, what the data must not be used for) |

Every session has `pageRef`, `intro`, `study{title,body[3],example,keywords}`, `activity`, `reflection`, matching existing sessions.

`b3s2` lab: `tool: { name: "Dataset viewer (built in)", url: "/datasets/club-signups-flawed.csv", free: true }`, `privacy` (4 notes: the data is synthetic, treat it as if real, never add real classmates, no accounts), `steps` (5), `fallback` (open the CSV in any spreadsheet), `fields` (4: what the dataset is for, how many rows and columns, three things that look odd, one field that should not be there), `downloads` (the flawed CSV and the data-card template).

## New activity kind `dataset` (b3s3)

Curriculum shape:

```json
{
  "kind": "dataset",
  "title": "Data audit table",
  "instructions": "...",
  "file": "club-signups-flawed.csv",
  "issueTypes": ["Missing value", "Inconsistent format", "Duplicate", "Sensitive or unnecessary field", "Imbalance or bias", "Suspicious value"],
  "minFindings": 5,
  "downloads": [ { "label": "...", "file": "club-signups-flawed.csv", "note": "..." } ]
}
```

Student UI (`app.js`) renders the CSV fetched from `/datasets/<file>` as a table (first 60 rows, all columns), a column summary strip above it (name, filled count, distinct count, sample), and a findings list. A finding is `{ target: "column:<name>" | "row:<n>" | "table", issue: <one of issueTypes>, note: string }`. Students add findings with a small form (target select, issue select, note); findings render as a list with remove buttons. Column headers and row numbers are clickable to prefill the target. State shape: `state.activity["b3s3"] = { findings: [...] }`. `activityReady`: at least `minFindings` findings with a note of 12+ characters, covering at least 3 distinct issue types. Admin label: `activityLabel` for kind `dataset` returns `Finding <n>` and `renderValue` already renders the object.

CSV parsing is a small local function (quoted fields, commas, newlines); no library.

## Dataset files (`scripts/generate-datasets.mjs`, deterministic)

`public/datasets/club-signups-flawed.csv`: 120 rows of after-school club sign-ups for a fictional school. Columns: `student_id, first_name, surname, date_of_birth, year_group, gender, home_eircode, interests, club_choice, signup_date, attendance_pct, parent_phone, inferred_income_band, notes`. Deliberate flaws, each documented in `club-signups-flawed.README.txt`:

- 9 missing `club_choice`, 6 missing `year_group`, 3 blank rows of `interests`
- `signup_date` in three formats (`2026-09-03`, `03/09/2026`, `3 Sept 2026`)
- `year_group` as `TY`, `4`, `Transition Year`, `ty`
- 4 exact duplicate rows, 2 near-duplicates (case differences)
- `attendance_pct` with values `104`, `-5`, and `n/a`
- `gender` imbalance in `club_choice` = `Coding` (88% one value) and year-group imbalance
- sensitive or unnecessary: `home_eircode`, `parent_phone`, `date_of_birth`, `inferred_income_band` (inferred, never collected), `notes` containing free-text judgements about students
- names are synthetic and clearly so (fictional first names, surnames from a fixed list); no real Eircodes (use the format `X99 XX99` with `X` letters not forming real routing keys, e.g. `Z99`)

`public/datasets/club-signups-cleaned-template.csv`: same header minus the four sensitive columns, empty rows, for students who prefer a spreadsheet. `public/datasets/responsible-data-card-template.md`: the six card headings.

## Capstone (`lib/chapter-capstone.mjs`)

```text
block3: { id: "block3-capstone", title: "Data Card review", brief: "<a second, different dataset described in prose: a library app logging every search, with reading level inferred from borrow history>", prompts: [3] }
```

Extend the concept and action keyword lists in `assessChapterCapstone` with data-detective vocabulary (`missing`, `duplicate`, `inconsistent`, `imbalance`, `sensitive`, `inferred`, `volunteered`, `observed`, `remove`, `collect`, `consent`, `anonymise`). Existing chapters' scoring must not change for existing test inputs.

## Project brief (`lib/project-briefs.mjs`)

`block3`: title `Dataset Clean-up Investigation`, role `Junior Data Analyst`, client `School Activities Office`, objective, 6 acceptance criteria, 6 deliverables (audit findings, cleaning plan, cleaned or annotated dataset, imbalance note, Responsible Data Card, recommendation), `prompts.recommendation`.

## Project Workspace generalisation (`project-workspace.js`)

- One launcher button per unlocked project: label `Project: <brief.chapter>`; `chapter2Unlocked` becomes `projectUnlocked(state, projectId)` using the previous block's completion and qualification from `COURSE` order (same rule as the server).
- Modal takes a `projectId`; eyebrow `CHAPTER <n> PROJECT`; all `req('block2', …)` become `req(projectId, …)`.
- `labEvidenceItems(state, blockId)` uses that block's `lab.stages` and includes the `dataset` kind: note = findings summarised as `<issue> at <target>: <note>` joined by `; `.
- Existing Chapter 2 behaviour unchanged for a student who only has block2 unlocked.

## Server (`functions/api/[[path]].js`)

`requiredSessions.block3 = ['b3s1','b3s2','b3s3','b3s4','b3s5']`. `blockOrder` derives from it, so Chapter 3 capstone and project writes return 409 until `block2` is qualified. Nothing else changes.

## Tests

- `tests/v21.test.mjs`: chapter list becomes `['AI & Me','Teaching a Machine','Data Detective']`; durations 120, 240, 180.
- `tests/experience-labs.test.mjs`: unchanged rules now cover block3 automatically; the b3s2 lab tool URL may be a same-origin `/datasets/...` path, so relax the `https://` assertion to `^(https://|/datasets/)`.
- `tests/lab-datasets.test.mjs`: new files must appear in the manifest.
- New `tests/data-detective.test.mjs`: block3 shape per this contract; flawed CSV has every documented flaw (parse it in the test); `dataset` renderer and `activityReady` rule present in `app.js`; workspace generalised (`projectUnlocked`, no hard-coded `'block2'` request path); server requires the five sessions; capstone keywords present.
- `tests/acceptance/lib.mjs`: add `CHAPTER2_SESSIONS` and `CAPSTONE2_ANSWERS` (already fixed text style), `CHAPTER3_SESSIONS`.
- `tests/acceptance/cutover-acceptance.mjs`: after the block2 project review, qualify block2 (complete b2 sessions, submit block2 capstone), then: block3 capstone 409 before b3 sessions, project block3 save 409 before block2 qualified was already covered by ordering; block3 project save and submit succeed after b3 sessions complete.
- `tests/acceptance/ui-acceptance.mjs`: Chapter 3 card locked until Chapter 2 qualified; the b3s3 dataset table renders 60 rows from the served CSV; adding a finding via the form appears in the list.
- `tests/acceptance/live-walkthrough.mjs`: extend after the teacher review: complete Chapter 2 capstone, open Chapter 3, complete b3s1–b3s5 with at least five findings on the audit table, submit the block3 capstone, open the Chapter 3 project, import lab evidence, submit.

## Docs

`docs/releases/phase-4-chapter-3.md` (scope, verification, pending Student Book alignment), README pilot features line, ROADMAP current-work pointer to Phase 5.

## File ownership for parallel agents

| Agent | Owns (may edit only these) |
| --- | --- |
| content | `curriculum.json`, `scripts/generate-datasets.mjs`, `public/datasets/*`, `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`, `docs/releases/phase-4-chapter-3.md`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `styles.css`, `admin.js`, `lib/chapter-capstone.mjs`, `lib/project-briefs.mjs`, `tests/chapter-capstone.test.mjs`, `tests/data-detective.test.mjs` |
| workspace-api | `project-workspace.js`, `functions/api/[[path]].js`, `tests/cloudflare-runtime.test.mjs`, `tests/project-workspace.test.mjs`, `tests/project-workspace-gate.test.mjs`, `tests/acceptance/*` |
