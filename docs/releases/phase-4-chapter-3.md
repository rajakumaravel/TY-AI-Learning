# Phase 4 — Chapter 3: Data Detective

**Status:** all three slices merged on `phase4-chapter3`; verified on Cloudflare Pages Preview with `npm run acceptance` and the live walkthrough. Production deferred (ADR-007).

Chapter 3 was first built directly on the Experience Lab standard (ADR-005) without a Student Book chapter to follow; every `pageRef` then read `Draft · pending Student Book alignment`. Phase 4b (below) realigned it to Student Book pp. 14–17 once the book arrived.

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
| `club-signups-flawed.README.txt` | Teacher key: every planted flaw with counts computed from the generated data. Teacher key written to `docs/teacher/club-signups-flawed.KEY.txt`, never deployed |
| `club-signups-cleaned-template.csv` | Same header minus the four sensitive columns, 120 empty rows |
| `responsible-data-card-template.md` | The six card headings |

Names are clearly synthetic (a fixed list of fictional surnames), Eircodes use the unassigned routing key `Z99`, and phone numbers use the unallocated prefix 080. No field needs CSV quoting, so any simple parser reads it.

**Tests.** `tests/v21.test.mjs` expects three chapters and 120/240/180 minutes; `tests/experience-labs.test.mjs` accepts a same-origin `/datasets/` lab tool URL; `tests/lab-datasets.test.mjs` checks the four new files are generated, in the manifest, offered in b3s2 and b3s3, and that the teacher key is not a student download.

## Delivered by the other Phase 4 slices

- Student UI: `dataset` activity renderer (table, column summary, findings form), `activityReady` rule, capstone `block3-capstone` and data-detective keywords, `block3` project brief.
- Workspace and API: `projectUnlocked(state, projectId)`, generalised project modal, `requiredSessions.block3`, acceptance scripts, `tests/data-detective.test.mjs` (student UI slice)js`.

## Verification

- `npm test` for the content slice on its own: the pre-existing suites pass; the contract's cross-slice tests are owned by the other slices.
- `node scripts/generate-datasets.mjs` twice produces byte-identical CSV, README and templates.
- Manual read of the flawed CSV: the near-duplicates sit within ten rows of their originals; the imbalance and sensitive columns are visible without tooling.

## Pending

- **Student Book alignment.** No Chapter 3 text exists yet. When it does: replace every `Draft · pending Student Book alignment` page reference, re-check the LO2/LO5 mapping, and align the quiz items and study text with the book's vocabulary.
- Preview acceptance (`npm run acceptance`) once all three slices are merged.
- First real classroom run should record whether five findings in 45 minutes is the right bar.

## 4b — realigned to the Student Book

**Sources.** `docs/source/student-book.txt` pp. 14–17 (Student Book v1.0, September 2026), `docs/source/curriculum-pilot-v1.txt` section 7 "Block 3" with Appendix A sheet A5 and Appendix B rubric, and `docs/source/curriculum-review-data-integrity.txt` sections 5, 6 and 21 for the integrity additions. Contract: `docs/product/phase-4b-contract.md`.

**Curriculum (`curriculum.json`, block `block3`).** Outcomes are now LO5, LO6, LO9 as the book states; every `pageRef` reads `Student Book pp. 14–17`. The mission, the eight-segment route, the myth-busters, the self-check descriptors and the level-up challenge are quoted verbatim from the book; the description is the book's opening paragraph cut to two sentences. All thirteen key words from p. 14 appear in the sessions' `study.keywords`. Three new block fields carry the book's p. 17 material: `myths` (three "People say / Actually" pairs), `selfCheck` (Getting started / Getting there / Going further) and `levelUp`.

| Session | Title (book label) | Minutes | Activity |
| --- | --- | --- | --- |
| b3s1 | Data trail warm-up | 15 | `quiz`: eight items from p. 15 sorted into Volunteered / Observed / Inferred |
| b3s2 | Data Tracking Sherlock | 25 | `lab`: the student's chosen service's privacy policy or app-store listing, the book's "Investigate at category level only" notice first, five steps, "No policy to hand?" fallback onto the sample extracts, four evidence fields (data category audit) |
| b3s3 | Why collect it? | 25 | `chain` (new kind): five rows of COLLECTION → PURPOSE → USER BENEFIT → POSSIBLE RISK |
| b3s4 | Cookies, scraping and the fairness challenge | 45 | `dataset`: the club-recommendation scenario over `club-signups-flawed.csv`, seven issue types including "Inferred, not collected" and "Who is missing (representation)", at least six findings, one of them a representation finding (`requiredIssues`) |
| b3s5 | Your rights and the safeguards | 25 | `textfields` ×4: purpose, minimisation, rights, EU AI Act risk |
| b3s6 | Design a better data plan | 45 | `textfields` ×9: the eight Sheet A5 questions verbatim, then the before → after data plan |

Reflections: b3s2–b3s5 are the book's four "Think about it" questions in order; b3s6 is the book's reflection ("Just because data is available, does that mean it should be used?"). Lab stages: DO b3s2, TEST b3s3, MAKE b3s6, BREAK b3s4, IMPROVE b3s6, PROVE b3s6. Blocks 1–2 are byte-for-byte unchanged.

**Datasets (`scripts/generate-datasets.mjs`).**

| File | Change |
| --- | --- |
| `privacy-policy-extracts.txt` | New. Three fictional services (a music app, a maps app, a photo-sharing app), each with 8–12 "data we collect" categories mixing volunteered, observed and inferred data, at least one vague purpose ("to improve our services") and one surprising category. No real company names. |
| `fairness-scenario-cards.txt` | New. The book's three scenarios (school club recommendations, job shortlisting, transport planning), each with "Decide what data you'd collect" and the "who is missing?" prompts (students who joined mid-year, people without smartphones, those who work nights). |
| `responsible-data-card-template.md` | Replaced with Sheet A5's eight questions plus an optional Integrity section (quality, provenance, limitations, from review document section 6). |
| `club-signups-flawed.csv`, `club-signups-cleaned-template.csv`, `docs/teacher/club-signups-flawed.KEY.txt` | Unchanged; the teacher key stays in `docs/teacher` and is never served. |

**Tests.** `tests/v21.test.mjs` checks block3's outcomes, badge, session ids, kinds, route, mission, myths, self-check, level-up and page references; `tests/experience-labs.test.mjs` checks the Sherlock lab's tool, first notice, fallback title, extracts download and the stage map; `tests/lab-datasets.test.mjs` checks the two new downloads exist, are in the manifest, are offered in the right sessions, and that the card template carries the A5 questions and the Integrity section. The contract's cross-slice tests (`chain` renderer and ready rule, `requiredIssues`, myth-busters and self-check rendering, capstone vocabulary, `requiredSessions.block3`, acceptance scripts) belong to the student-ui and workspace-api slices.

**Pending.** The 4b student-ui and workspace-api slices (chain renderer, `requiredIssues`, myth-busters and self-check sections, capstone and brief retitling, six required sessions, acceptance scripts) must merge with this slice; until then the `chain` activity has no renderer and the sixth session is not required by the server. Preview acceptance once all three merge.
