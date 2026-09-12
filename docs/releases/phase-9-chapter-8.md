# Phase 9 — Chapter 8: AI Innovation Project

**Status:** content implemented on `phase9-chapter8-content` against `docs/product/phase-9-contract.md`. Chapter 8 joins the seven existing chapters and is the last chapter in the programme. This note covers the content agent's files only: curriculum, generated datasets, the teacher key, the three shared suites and these docs. Student UI (including the `rubric` table and the programme-complete state), capstone, project brief, workspace and API belong to the parallel agents on the same contract. Preview acceptance remains pending; Production stays deferred (ADR-007). No push or deployment is part of this work.

**Sources.** `docs/source/student-book.txt` pp. 36–41 (Student Book v1.0, September 2026) and `docs/source/curriculum-pilot-v1.txt` section "12. Block 8 - AI Innovation Project (8 hours)". `docs/source/curriculum-review-data-integrity.txt` informs the evidence, testing and residual-risk wording only. Verbatim from the book: the mission, the eight hour labels with their sprint prefixes, the five tests, the ten starting points, the eight presentation points, the three myth pairs, the self-check descriptors, the six judging criteria, the level-up and the five "Think about it" questions. The opening description keeps the book's words and its "AI is optional. Part of the project is deciding whether it genuinely helps."

## No new activity kind

**This chapter is the culmination, so it reuses and does not reinvent.** It introduces no new activity kind. The nine portfolio artefacts map onto the existing `chain`, `textfields`, `testlog` and one `lab`. `b8s6` reuses the Chapter 2 `testlog` shape with this chapter's six columns and a three-tester minimum. The only new *data* is the optional block field `rubric`, which only `block8` sets; every earlier chapter renders unchanged and every earlier block's JSON is byte-identical (the chapter was appended textually rather than by re-emitting the file).

## Tool decision, non-AI fallback and deployment context

No session requires an AI tool, and the chapter's mission says so. Only **b8s5**, the build session, offers one, as a `lab` with the standing acknowledgement gate. Primary: **DuckDuckGo AI Chat** (`https://duck.ai`), free, no account, as in Chapters 4 and 6. Fallback: **Microsoft Copilot** (`https://copilot.microsoft.com`) without signing in — and then, deliberately, **not a sample download but building the non-AI version**. A student whose tool is blocked, or whose evidence says AI adds nothing, follows the same steps with a spreadsheet, a paper mock-up, a simple page or a written workflow, records the same four things, and counts as complete. Nothing in the curriculum data requires the tool to have been opened; the `activityReady` change that lets the fallback route satisfy the gate lives in the student-ui agent's `app.js`.

b8s5 carries the four standing safety notes with the tool name filled. **Research safety is a fifth note and belongs to b8s2, not b8s5:** approved questions only, no personal data that is not needed, everything from Chapter 3 applied to the student's own project, participants recorded as Person A, Person B, Person C. No field in b8s2 asks for a real person's name or contact detail, and the interview guide says what to do when someone volunteers personal information anyway.

The portal runs in a third-party training centre, not a school. Portal copy says "the training centre" or "the training centre or the community around it"; text quoted as the book (the mission, the myths, the starting points, the judging criteria) stays verbatim and keeps the book's "school". The book assumes a team; the portal is self-paced and individual, so every "your team" becomes the student's own decision with an optional partner, and the peer test is "classmates, people at the training centre, or someone at home".

## Scope

**Curriculum (`curriculum.json`, `block8`, 480 minutes, badge AI Innovator, outcomes LO1–LO9, every `pageRef` "Student Book pp. 36–41").** All eleven book key words appear in `study.keywords`. Each session has an introduction, three study paragraphs, a separate worked example, keywords and a reflection. The worked example throughout is "the training centre's bike rack is full by 9am and nobody knows which days are worst" — deliberately not on the book's starting-points list and unlikely to be a student's own choice, so no example hands over an answer.

| Session | Title (book label) | Minutes | Type | Activity |
| --- | --- | --- | --- | --- |
| b8s1 | Sprint 1 · Problem hunt | 60 | DISCOVER + QUESTION | `chain`, 5 rows, five problems screened by the five tests, exactly one chosen |
| b8s2 | Sprint 1 · Understand the user | 60 | INVESTIGATE | `textfields` ×5, research safety, Person A onward |
| b8s3 | Sprint 2 · Design options | 60 | PREDICT + TRY | `chain`, 3 rows, at least one "no AI", exactly one chosen |
| b8s4 | Sprint 2 · Responsible design | 60 | QUESTION + MAKE | `textfields` ×5, success criteria written before the build |
| b8s5 | Sprint 3 · Build the prototype | 60 | MAKE | `lab`, 5 steps, 4 fields, optional AI tool, non-AI build as a full route |
| b8s6 | Sprint 3 · Test | 60 | TEST | `testlog`, 6 columns, 3 testers minimum, watch-don't-help |
| b8s7 | Sprint 4 · Improve and red-team | 60 | IMPROVE + BREAK | `chain`, 5 rows, iteration log and risk register in one table |
| b8s8 | Sprint 4 · Demo and reflection | 60 | REFLECT + EVIDENCE | `textfields` ×9, the eight presentation points then the individual reflection |

Reflections: b8s1 names the rejected problem and the test it failed; b8s2 the need behind the request; b8s3, b8s5, b8s4, b8s6 and b8s7 carry the book's five "Think about it" questions; b8s8 asks what is still uncertain. The six Experience Lab stages are DO b8s1, TEST b8s6, MAKE b8s5, BREAK b8s7, IMPROVE b8s7 and PROVE b8s8 — the one chapter whose workspace is the whole chapter.

Contract-mandated verbatim placements: the five tests (`real, understandable, useful, testable, safe`) in b8s1's study body; "at least one must not use AI" in b8s3; "Rough is fine. Rough is the point." in b8s5; the eight presentation points in order in b8s8. b8s7 requires at least one evidence-driven change and at least three red-team rows across the book's five attacks, and states that a residual of "none" is not accepted.

**The `rubric` block field.** Six criteria — Problem, Solution choice, Prototype, Testing, Responsible AI, Presentation — each with Getting started / Getting there / Going further, verbatim from p.41. The book says "Read them before you start, not after", so the student-ui agent renders them above the session list rather than after the capstone. Only `block8` sets the field.

**Datasets (`scripts/generate-datasets.mjs`, deterministic; the rubric, the eight hours and the five attacks are generated from the `block8` fixture in `curriculum.json`, so the downloads cannot drift from the chapter).**

| File | Contents |
| --- | --- |
| `innovation-project-canvas.md` | Blank headed sections for all eight hours with each session's own prompts and "Think about it" question, plus the nine-item portfolio checklist. No filled example |
| `innovation-problem-cards.txt` | The five tests written out, the book's ten starting points verbatim including the non-AI one, and the rule that you generate at least five problems of your own first — a place to look, not a menu |
| `innovation-interview-guide.txt` | Six approved, non-identifying questions about a task and its pain points; the Person A labelling rule; what to do if someone volunteers personal information anyway; blank recording sheet |
| `innovation-responsible-canvas.md` | Blank data flow, human decision points, failure modes, safeguards and success criteria, with success criteria placed before the build section so the ordering is visible |
| `innovation-prototype-starters.txt` | The book's seven prototype forms, each with one honest line on what it tests and what it cannot, and the reminder that rough is the point |
| `innovation-peer-test-sheet.csv` | `tester,task_given,what_worked,where_confused,what_failed,unexpected`; three empty rows |
| `innovation-risk-register.csv` | `change_or_risk,evidence_or_attack,safeguard,what_remains`; five empty rows |
| `innovation-presentation-guide.md` | The eight points in order with the 3–5 minute timing, one line on what each must contain, the hiding-limitations myth and a blank timing sheet |
| `innovation-rubric.txt` | The six criteria at all three levels, the level-up and "Badge earned: AI Innovator ✓ · Programme complete" — the student-facing copy of what `rubric` renders |
| `docs/teacher/innovation-project.KEY.txt` | Good and weak evidence at each of the six criteria; the five-test screen applied to three worked problems; the point that a non-AI chosen solution scores at the highest level; the common failure patterns; guidance for assessing an individual on a chapter the book writes for teams. **Outside `public/`, never served and never offered as a download** |

Generation is byte-identical on repeated runs. The only change to an existing file is the manifest's nine new entries; the cup/bottle zips were left untouched because only their bytes move.

## Verification

- `tests/v21.test.mjs`: eight chapters in order, durations `120/240/180/240/180/180/180/480`, the AI Innovator badge and all nine outcomes, the exact eight session ids, types, kinds and minutes `[60,60,60,60,60,60,60,60]`, the shared page reference, and all eleven key words. A separate test asserts the six `rubric` criteria at three levels and that no earlier chapter sets the field.
- `tests/experience-labs.test.mjs`: the six lab stages importing from five different sessions; b8s5 as the chapter's only `lab`; the exact tool record and all four safety notes; five steps and four evidence fields; the fallback offering Copilot and the non-AI build and **not** a sample download; no other session carrying a tool or safety notes; b8s2 carrying the research-safety rule.
- `tests/lab-datasets.test.mjs`: the nine downloads exist on disk and in the manifest and are offered in exactly the contract's sessions; the two CSVs are byte-checked as blank; the ten starting points, the five tests and the generate-five-first rule appear in the problem cards; six approved questions and the Person A rule in the interview guide; success criteria before the build section in the responsible canvas; seven prototype forms each with what it can and cannot test; the eight presentation points in order; the six criteria at three levels and "Read them before you start, not after"; eight blank hour sections in the canvas; the teacher key outside `public/` and never offered; and no student download containing a filled canvas, the worked problem choice or anything from the capstone review scenario.
- The deeper block-shape suite (`tests/innovation-project.test.mjs`), the `activityReady`-on-fallback assertion, the capstone vocabulary gating and the acceptance fixtures belong to the parallel agents and are not in this branch.
- Full `npm test` result is recorded in this branch's commit message. Suites owned by the parallel agents are expected to fail until their files land; `npm run check` runs after all three agents are integrated.

## Book alignment

| Book (pp. 36–41) | Portal |
| --- | --- |
| Opening, badge, eight hours, LO1–LO9 and eleven key words (pp. 36–37) | Block metadata and session study keywords |
| What you'll need, the mission, Research safely (p. 37) | The canvas, peer test sheet and presentation guide as downloads; verbatim mission; the research-safety rule carried by b8s2 |
| The route: four sprints, eight hours (p. 38) | `route` with the verbatim hour labels, each prefixed by its sprint, and one 60-minute session per hour |
| Your presentation, in order (p. 39) | b8s8's first eight fields and `innovation-presentation-guide.md` |
| Stuck for a problem? Some starting points (p. 39) | `innovation-problem-cards.txt`, verbatim, framed as places to look |
| Think about it (p. 39) | The five reflections on b8s3, b8s5, b8s4, b8s6 and b8s7 |
| Myth-busters (p. 40) | Three verbatim pairs through the existing `myths` field |
| For your portfolio and How am I doing? (p. 40) | `final` with the nine artefacts; the three-level `selfCheck` |
| How your project will be judged (p. 41) | The new `rubric` field and `innovation-rubric.txt` |
| Level up (p. 41) | Verbatim `levelUp` |
| Badge earned: AI Innovator ✓ · Programme complete (p. 41) | The programme-complete state, delivered by the student-ui agent |

## Prerequisite and pending

- Chapter 7 remains the prerequisite: Chapter 8 capstone and project writes return 409 until Chapter 7 practical work and capstone qualification are complete. That gate lives in the workspace-api agent's files.
- The `rubric` table (`.chapter-rubric [data-criterion]`), the programme-complete card (`.programme-complete`), the `testlog` column renderer for b8s6, the `activityReady` change that lets b8s5's fallback route satisfy the gate, the Chapter 8 capstone and project brief, the workspace import and the acceptance fixtures are delivered by the parallel agents against the same contract.
- Preview API/UI acceptance and the live walkthrough follow integration; Production stays deferred.
- First facilitated run should check whether one hour is enough for b8s1's five-problem screen, and whether students reach three testers in b8s6 or need the honest-limitation route instead.
