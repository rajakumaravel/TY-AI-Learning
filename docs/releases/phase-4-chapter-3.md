# Phase 4 — Chapter 3: Data Detective

**Status:** in progress on `phase4-chapter3`; content slice implemented per `docs/product/phase-4-contract.md`. Verified on Cloudflare Pages Preview only once the student-UI and workspace/API slices land; Production is deferred until all phases are accepted (ADR-007).

Chapter 3 is the first chapter built directly on the Experience Lab standard (ADR-005) without a Student Book chapter to follow. Every `pageRef` reads `Draft · pending Student Book alignment`.

## Scope

**Curriculum (`curriculum.json`, block `block3`, 180 minutes, badge Data Detective, outcomes LO2 and LO5).** Mission: investigate a flawed dataset for a school app, fix or flag every problem, and publish a Responsible Data Card.

| Session | Title | Minutes | Activity |
| --- | --- | --- | --- |
| b3s1 | Volunteered, observed, inferred | 25 | `quiz`: eight items sorted into Volunteered / Observed / Inferred |
| b3s2 | Meet the dataset | 35 | `lab`: built-in dataset viewer at `/datasets/club-signups-flawed.csv`, four privacy notes, five steps, spreadsheet fallback, four evidence fields |
| b3s3 | Find what is wrong | 45 | `dataset` (new kind): audit table over the same CSV, six issue types, at least five findings |
| b3s4 | Propose the fix | 35 | `textfields`: fix, flag, remove, collect differently |
| b3s5 | Responsible Data Card | 40 | `textfields`: the six card sections |

Lab stages: DO b3s2, TEST b3s3, MAKE b3s4, BREAK b3s3, IMPROVE b3s4, PROVE b3s5.

**Datasets (`scripts/generate-datasets.mjs`, deterministic, seeded).**

| File | Contents |
| --- | --- |
| `club-signups-flawed.csv` | 120 synthetic after-school club sign-ups, 14 columns, with every flaw in the contract planted: 9 missing `club_choice`, 6 missing `year_group`, 3 blank `interests`; three `signup_date` formats; four spellings of Transition Year; 4 exact and 2 case-only duplicates; `attendance_pct` of 104, -5 and n/a; Coding is 88% one gender and entirely Transition Year; `home_eircode`, `parent_phone`, `date_of_birth`, `inferred_income_band` and judgemental `notes` |
| `club-signups-flawed.README.txt` | Teacher key: every planted flaw with counts computed from the generated data. Served but never listed as a student download |
| `club-signups-cleaned-template.csv` | Same header minus the four sensitive columns, 120 empty rows |
| `responsible-data-card-template.md` | The six card headings |

Names are clearly synthetic (a fixed list of fictional surnames), Eircodes use the unassigned routing key `Z99`, and phone numbers use the unallocated prefix 080. No field needs CSV quoting, so any simple parser reads it.

**Tests.** `tests/v21.test.mjs` expects three chapters and 120/240/180 minutes; `tests/experience-labs.test.mjs` accepts a same-origin `/datasets/` lab tool URL; `tests/lab-datasets.test.mjs` checks the four new files are generated, in the manifest, offered in b3s2 and b3s3, and that the teacher key is not a student download.

## Delivered by the other Phase 4 slices

- Student UI: `dataset` activity renderer (table, column summary, findings form), `activityReady` rule, capstone `block3-capstone` and data-detective keywords, `block3` project brief.
- Workspace and API: `projectUnlocked(state, projectId)`, generalised project modal, `requiredSessions.block3`, acceptance scripts, `tests/data-detective.test.mjs`.

## Verification

- `npm test` for the content slice on its own: the pre-existing suites pass; the contract's cross-slice tests are owned by the other slices.
- `node scripts/generate-datasets.mjs` twice produces byte-identical CSV, README and templates.
- Manual read of the flawed CSV: the near-duplicates sit within ten rows of their originals; the imbalance and sensitive columns are visible without tooling.

## Pending

- **Student Book alignment.** No Chapter 3 text exists yet. When it does: replace every `Draft · pending Student Book alignment` page reference, re-check the LO2/LO5 mapping, and align the quiz items and study text with the book's vocabulary.
- Preview acceptance (`npm run acceptance`) once all three slices are merged.
- First real classroom run should record whether five findings in 45 minutes is the right bar.
