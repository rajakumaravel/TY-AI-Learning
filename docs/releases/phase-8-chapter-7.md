# Phase 8 — Chapter 7: Our AI Future

**Status:** content implemented on `phase8-chapter7-impl-content` against `docs/product/phase-8-contract.md`. Chapter 7 joins the six existing chapters. This note covers the content agent's files only: curriculum, generated datasets, the teacher key, the three shared suites and these docs. Student UI, capstone, project brief, workspace and API belong to the parallel agents on the same contract. Preview acceptance remains pending; Production stays deferred (ADR-007). No push or deployment is part of this work.

**Sources.** `docs/source/student-book.txt` pp. 32–35 (Student Book v1.0, September 2026) and `docs/source/curriculum-pilot-v1.txt` section "11. Block 7 - Our AI Future (3 hours)" with Appendix A's universal evidence prompts (A1) and rubric B1. `docs/source/curriculum-review-data-integrity.txt` has no Chapter 7 revision section; its counts-and-estimates, privacy, residual-risk, decision-log and monitoring sections inform the simulator's evidence and consequences only. The mission, the eight timed route labels, the three myth pairs, the self-check descriptors, the level-up and the "Think about it" reflections are verbatim; the opening description uses the book's first two sentences. Block 7 names a 2035 scenario canvas but no numbered Appendix A sheet, and none was invented.

## Tool decision and deployment context

No session opens an AI or external tool. The **AI Adoption Decision Simulator** is built in-product from fixed synthetic evidence, choices and consequences supplied by the contract. It needs no account, API key, model service, upload or external dependency, so Chapter 7 has no `lab` activity, tool link, acknowledgement or fallback, and repeats none of the four standing safety notes. They remain available for any later contract change that introduces a tool. The book's optional AI stress-test is replaced by the simulator's consequence cards and the student's own counterarguments; the verbatim level-up is ordinary source research, not an instruction to open an AI tool.

The portal runs in a third-party training centre, not a school. The centre supplies the fictional retailer case; the student works individually as its AI Adoption Adviser, with optional partner discussion in the debate. Downloads carry the same evidence and a branching paper walkthrough for an offline run, but students still enter their own choices and reasoning in the portal, and no pre-filled recommendation exists anywhere in a public file.

## Scope

**Curriculum (`curriculum.json`, `block7`, 180 minutes, badge Future Thinker, outcomes LO4 and LO8, every `pageRef` "Student Book pp. 32–35").** All ten book key words appear in `study.keywords`. Each session has an introduction, three study paragraphs, a separate example in a different domain (a library lending desk), keywords and a reflection. Myth-busters, self-check and level-up render through the existing block fields.

| Session | Title (book label) | Minutes | Type | Activity |
| --- | --- | --- | --- | --- |
| b7s1 | 2026 vs 2035 | 20 | PREDICT + TEST | `chain`, 4 rows, observation and prediction kept apart |
| b7s2 | Discover: narrow AI and AGI | 20 | DISCOVER | `quiz`, 6 fixed items, three concept options |
| b7s3 | Career transformation map | 30 | TRY + INVESTIGATE | `chain`, 5 rows, one task per category justified from evidence |
| b7s4 | Three futures | 30 | MAKE + TEST | `decision` (new kind), branching adoption simulator |
| b7s5 | The stakeholder lens | 25 | BREAK + QUESTION | `chain`, 5 rows, the five named stakeholders |
| b7s6 | Policy choice debate | 25 | QUESTION + IMPROVE | `textfields` ×4, both sides then the strongest objection |
| b7s7 | Future skills card | 20 | MAKE + REFLECT | `textfields` ×4, three capabilities and one TY action |
| b7s8 | Reflection | 10 | REFLECT + EVIDENCE | `textfields` ×3, final recommendation and governance commitment |

Reflections b7s3, b7s4, b7s5 and b7s7 carry the book's four "Think about it" questions and b7s8 the book's final route question. The six Experience Lab stages are DO b7s3, TEST b7s1, MAKE b7s4, BREAK b7s5, IMPROVE b7s6 and PROVE b7s8. `chain`, `quiz` and `textfields` keep their existing state shapes; only `decision` is new, and every earlier chapter's JSON is byte-identical.

**The decision fixture.** One scenario, `harbour-retail`, with 100 routine requests in a modelled week: 80 standard digital requests (group A) and 20 needing language or access support (group B). Eight evidence cards (E1–E4 at the root, EP/EH/EF/EN revealed by the four starting choices), thirteen nodes, twelve edges and eight terminal outcomes. Every complete path has exactly two choices; metrics replace rather than accumulate; there is no random event, hidden threshold, combined score or correct terminal. The eight metric keys are `humanHours, costEUR, automated, assisted, wrongA, wrongB, retentionDays, energyUnits`, and the browser derives `hoursReleased = 10 − humanHours`, `capacityValueEUR = hoursReleased × 20 − costEUR`, `manual = 100 − automated − assisted`, the two group rates and the gap in percentage points.

Worked results, recomputed by the tests and printed in the teacher key: the baseline and `none → wait` give 8/100 wrong, A 5.00%, B 20.00%, a 15.00-point gap and €0.00 capacity value; `pilot → support` gives 0.5 hours released, −€30.00, 5/100 wrong and a 6.25-point gap; `human → resource` gives 2.0 hours, −€10.00, 3/100 wrong and an 8.75-point gap; `full → speed` gives 8.0 hours, €100.00, 14/100 wrong and a 45.00-point gap; `none → train` gives 1.0 hour, −€10.00, 6/100 wrong and an 11.25-point gap. The route with the largest capacity value has the worst group B outcome, so no number selects the recommendation.

**Synthetic evidence and model limits.** Every person, observation and count is invented. The audit is one small week of routine request handling only; the sandbox replay reuses the cases used while developing the prototype, so it is not independent evidence. Intermediate vectors are fictional observations; all eight terminal vectors are modelled possibilities, not measured follow-up results. Capacity value compares released task capacity less extra cost — not profit, wages saved or a redundancy forecast — and negative values are valid. Retention counts days of new AI transcript storage only, and energy units are an invented comparison index, not kWh or carbon, so a zero does not mean the service uses no energy or holds no personal data. Group B names a support route, not a kind of person, and one error rate does not settle fairness.

**Datasets (`scripts/generate-datasets.mjs`, deterministic; the branch, evidence and teacher arithmetic are generated from the `block7` fixture in `curriculum.json`, so there is one consequence-data source).**

| File | Contents |
| --- | --- |
| `ai-future-evidence-cards.txt` | E1–E4 and EP/EH/EF/EN with their ids and status labels, the two group definitions, the baseline vector and the scope caveats |
| `ai-future-career-cards.txt` | The Harbour Co-op card with its eight retail tasks and five stakeholder roles, plus the book's career list as optional transfer prompts and a warning against transplanting these counts |
| `ai-future-career-map.csv` | Task, possible change, evidence and assumption, human capability and responsibility; five empty rows |
| `ai-future-branch-cards.txt` | Root, four intermediate nodes and eight terminals with choice ids, next ids, evidence references, vectors, computed results, consequence, accountability and uncertainty; units and arithmetic, no ranked outcome |
| `ai-future-decision-log.csv` | Run, node, choice, evidence available, alternatives considered, reason, consequence, would I decide differently now; empty rows |
| `ai-future-scenario-canvas.md` | Blank Optimistic / Concerning / Balanced sections, stakeholder impacts, future skills, governance choice, final recommendation, the book's no-scenario-is-entirely-fine rule and the A1 evidence prompts |
| `ai-future-stakeholder-analysis.csv` | Five stakeholder names filled, every response cell empty |
| `ai-future-policy-cards.txt` | The human-review proposal, prompts for both sides, the routine-versus-high-stakes distinction, the EH counterpoint and who can correct, override or stop; no legal claim |
| `ai-future-skills-card.md` | Three blank capability sections with reasons and one TY action with a time and evidence of trying |
| `docs/teacher/ai-future-adoption.KEY.txt` | All eight path identities and computed results, the concept quiz key, the observation-versus-assumption split, the reused-sample limits, and the task-versus-job, residual-risk, privacy, exclusion, accountability and sustainability discussion points; outside `public/` and never linked as a download |

The key shows how opposing recommendations are each justified by different priorities and names the unsupported claims to challenge: saved hours meaning guaranteed job losses, no AI meaning no existing risk, an audit removing all harm, an approval click guaranteeing oversight, the sandbox proving performance, and the highest capacity value being the answer. No terminal is marked correct. Generation is byte-identical on repeated runs, and the only changes to existing files are the manifest's new entries; the cup/bottle zips were left untouched because only their bytes move.

## Verification

- `tests/v21.test.mjs`: seven chapters in order, durations 120/240/180/240/180/180/180, the Future Thinker badge and LO4/LO8, the exact eight session ids, kinds, types and minutes `[20,20,30,30,25,25,20,10]`, the shared page reference, all ten key words and the absence of any tool or safety notes.
- `tests/experience-labs.test.mjs`: the six lab stages; Chapter 7 joins Chapter 5 as a chapter with no `lab`-kind session; graph assertions over the fixture — eight evidence cards, thirteen nodes, four starting options, twelve edges, eight terminals, resolvable references, no self edge, distinct follow-up choices, one new card per intermediate node and terminal titles taken from the incoming choice. Every terminal vector is recomputed: disjoint work allocation, errors within their group denominators, and the four contract worked examples plus the baseline matched exactly. Negative capacity value is asserted as valid, and no combined score or correct terminal exists.
- `tests/lab-datasets.test.mjs`: the nine downloads exist on disk and in the manifest and are offered in the contract's sessions; branch and evidence text match the curriculum fixture node by node; the walkthrough carries the units and arithmetic and no ranked outcome; the worksheets keep their specified blank cells; the canvas carries the book's rule and the A1 prompts and names no recorded route; the key is outside `public/`, is not offered as a download, and contains all eight computed outcomes, the quiz key and the reasons there is no single correct adoption future.
- Full `npm test` result is recorded in the implementation branch's commit message. Suites owned by the parallel agents (`tests/our-ai-future.test.mjs`, `tests/chapter-capstone.test.mjs`, `tests/project-workspace*.test.mjs`) are expected to fail until their files land; `npm run check` runs after all three agents are integrated.

## Book alignment

| Book (pp. 32–35) | Portal |
| --- | --- |
| Opening, badge, three hours, LO4/LO8 and ten key words (p. 32) | Block metadata and session study keywords |
| What you'll need and the mission (p. 33) | In-product simulator and canvas; verbatim mission; no poster tool and no optional AI stress-test |
| 2026 vs 2035 and narrow AI / AGI (p. 33) | b7s1's separated observation and prediction rows; b7s2's three-way concept sort |
| Career transformation map (p. 33) | b7s3's five tasks judged automated, augmented or strongly human against the evidence |
| Three futures (p. 34) | b7s4's three recorded routes, labelled by the student, with the book's scenario rule quoted |
| The stakeholder lens (p. 34) | b7s5's five named lenses and the clash-and-safeguard column |
| Policy choice debate (p. 34) | b7s6's human-review proposal argued both ways, then the strongest objection answered |
| Future skills card and Reflection (p. 34) | b7s7's three capabilities and one TY action; b7s8's recommendation and the book's final question |
| Think about it and myth-busters (pp. 34–35) | Four reflections and three verbatim myth pairs |
| Portfolio, self-check and level up (p. 35) | `final`, 1 / 2 / 3 self-check descriptors and verbatim `levelUp` |

## Prerequisite and pending

- Chapter 6 remains the prerequisite: Chapter 7 capstone and project writes return 409 until Chapter 6 practical work and capstone qualification are complete. That gate lives in the workspace-api agent's files.
- The `decision` renderer, its selectors and readiness rule, the Chapter 7 capstone and project brief, the workspace import and the acceptance fixtures are delivered by the parallel agents against the same contract.
- Preview API/UI acceptance and the live walkthrough follow integration; Production stays deferred.
- First facilitated run should check whether students reach three complete routes and three linked narratives within b7s4's thirty minutes, and whether the eight-dimension comparison reads clearly without a combined score.
- No deviation from the Phase 8 contract's chapter content was needed.
