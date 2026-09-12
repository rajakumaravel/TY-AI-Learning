# Phase 7 — Chapter 6: AI for Learning & Work

**Status:** implemented on `phase7-chapter6-impl` against `docs/product/phase-7-contract.md`, continuing WIP commit `51173a5`. Chapter 6 joins the five existing chapters. Unit and build verification is recorded below; Preview acceptance remains pending and is not run in this worktree. Production deferred (ADR-007). No push or deployment is part of this completion.

**Sources.** `docs/source/student-book.txt` pp. 28–31 (Student Book v1.0, September 2026), `docs/source/curriculum-pilot-v1.txt` section 10 "Block 6" with Appendix A's universal evidence prompts (A1), verification log (A2) and rubric B1, and `docs/source/curriculum-review-data-integrity.txt` section 9. The review supplies the eight-step cleaning method and six-column Data Cleaning Log. The mission, timed route labels, myth-busters and level-up are verbatim; self-check descriptors follow the book and curriculum. The opening description uses the book's first two sentences. The learning contract has no invented Appendix A sheet number.

## Tool decision and deployment context

The contract selects **DuckDuckGo AI Chat**, `https://duck.ai`, using free text chat without an account. First fallback: **Microsoft Copilot**, `https://copilot.microsoft.com`, without signing in. Second fallback: the matching session in `ai-work-sample-outputs.txt`. An account, payment or unavailable-feature request means moving to the next fallback. No uploads or account-dependent office integrations are required. These are the contract's selected routes; live provider availability was not rechecked during this test-and-documentation completion.

Each of b6s1, b6s2, b6s4 and b6s6 independently renders all four standing notices: no personal details, no accounts, check claims independently, and manually copy between portal and tool. Each tool link requires its own acknowledgement, including when the student uses samples. Samples replace chatbot interaction; students still attempt tutor questions, clean their own spreadsheet, calculate results and produce their own briefing.

The third-party training centre supplies **LibreOffice Calc**, installed before the session, and **Writer** for an optional separate document (`https://www.libreoffice.org/download/`). The portal fields can hold the final briefing. b6s3 closes the AI tool and hides saved conversation before a written memory explanation; b6s5 reviews saved output independently. b6s7 and b6s8 open no AI tool. Professional communication is a draft; the portal sends no email.

## Scope

**Curriculum (`curriculum.json`, `block6`, 180 minutes, badge Digital Collaborator, outcome LO7, every `pageRef` "Student Book pp. 28–31").** All ten book key words appear in `study.keywords`. Each session has an introduction, three study paragraphs, a separate example, keywords and reflection. Three myth pairs, self-check descriptors grouped 1 / 2 / 2 and the level-up use existing chapter rendering.

| Session | Title (book label) | Minutes | Type | Activity |
| --- | --- | --- | --- | --- |
| b6s1 | “Do it for me” vs “teach me” | 20 | PREDICT + TEST | `lab`, five steps, four comparison fields |
| b6s2 | AI Tutor challenge | 30 | TRY + LEARN | `lab`, five steps, four tutor-prompt and learning fields |
| b6s3 | Explain it without AI | 20 | TEST + REFLECT | `textfields` ×3, memory attempt before reopening notes |
| b6s4 | Workplace workflow | 30 | MAKE + INVESTIGATE | `lab`, raw CSV reference, eight visible workflow steps, seven evidence fields |
| b6s5 | Human review | 25 | TEST + IMPROVE | `textfields` ×4, every claim checked and final work signed off |
| b6s6 | Professional communication | 25 | MAKE + IMPROVE | `lab`, five steps, four draft/edit/decision/final fields |
| b6s7 | Disclosure scenarios | 20 | QUESTION | `chain`, five complete scenario/decision/reason/wording rows |
| b6s8 | Your learning contract | 10 | REFLECT + EVIDENCE | `textfields` ×3, personal rules and repeatable human checkpoints |

Reflections b6s3, b6s5, b6s6 and b6s7 carry the book's four questions, with b6s7 adapted from "a teacher" to "the training centre". b6s8 uses the contract's checkpoint question. The six Experience Lab stages are DO b6s2, TEST b6s3, MAKE b6s4, BREAK b6s5, IMPROVE b6s6 and PROVE b6s8. Existing `lab`, `textfields` and `chain` kinds and state shapes are reused; no new activity kind or automatic cleaning model is introduced.

**Cleaning workflow.** Preserve an untouched `raw_v1`; Profile row/field counts and issues; Define rules from the brief; Clean only with a recorded justification; Validate counts, changes and unresolved flags; Analyse with spreadsheet formulas and stated exclusions; use AI assist for critique or wording; perform Human review independently in b6s5. All eight labels are visible in b6s4; its seven fields assess the first seven steps, and b6s5 supplies the final review evidence. The review's "Human verify" is labelled "Human review" to match the book. The integrity rule stays verbatim: "Never silently change the data. If a change cannot be justified, flag the value rather than inventing a correction."

Students keep raw, working, profile, rules, cleaning log, validation and analysis sheets locally. The portal's CSV viewer is a read-only raw reference. A filename alone is not assessable: paste compact logs, formulas, results, decisions and limitations into the evidence fields. Each imported project note allows 4,000 characters; add evidence notes for overflow.

**Datasets (`scripts/generate-datasets.mjs`, fixed Chapter 6 fixture and repeatable generated files).**

| File | Contents |
| --- | --- |
| `ai-work-tutor-cards.txt` | Answer-giving and question-led prompts, a tutor scaffold, safe recipe-fraction concept, starting-point and memory-attempt instructions |
| `ai-work-workplace-brief.txt` | Fictional open-day request, spreadsheet preparation, category/unit/range/duplicate rules and explicit limits on what the evidence supports |
| `ai-work-event-budget-raw.csv` | Twelve rows and five fields, preserving trailing whitespace, an explicit euro price, case/spelling issues, blank and negative quantities, one exact duplicate surplus and two conflicting-ID records |
| `ai-work-data-dictionary.csv` | Seven-column dictionary with five field-name rows and empty response cells |
| `ai-work-cleaning-log.csv` | Empty Row / field, Original, Issue, Action, Reason, Verified by records; verification names a source or rule, not a student's name |
| `ai-work-validation-checklist.csv` | Named checks for preservation, counts, blanks, duplicates, conflicts, categories, units, ranges, held rows and reconciliation; empty responses |
| `ai-work-human-review-checklist.csv` | Empty claim, source/cell, independent check, verdict, change and sign-off records for every claim |
| `ai-work-sample-outputs.txt` | Labelled synthetic b6s1/b6s2 tutor samples with student-attempt pauses, b6s4 interpretation and b6s6 editing sample; flaws remain unmarked |
| `ai-work-briefing-template.md` | Draft, verified figures/formulas, unresolved items, suggested edits, decisions/reasons, final summary, disclosure and approval checkpoint |
| `ai-work-disclosure-cards.txt` | Private brainstorming, assessed work, fictional CV, workplace report and creative project; audience/expectation prompts and reasonable disagreement |
| `ai-work-learning-contract.md` | AI helps me / does not replace / I disclose rules and repeatable workflow checkpoints |
| `docs/teacher/ai-work-event-budget.KEY.txt` | Raw profile and source records, justified cleaning log, unresolved flags, formulas, reference results, every sample claim/edit reviewed and contextual disclosure guidance; outside `public/` |

Chapter 4's `verification-log-A2.csv` is reused in b6s5. No student download contains a completed cleaned answer or teacher key. The full generator is tested twice in separate temporary directories, so timestamp changes to unrelated cup/bottle zips never modify the worktree.

The teacher reference removes source row 11 only after matching every field with row 3. It holds both conflicting E07 records (7 and 12), missing quantity row 9 and invalid quantity row 10, leaving those values traceable. Seven eligible rows (1, 2, 3, 4, 5, 6, 8) give a partial subtotal of **€249.00**: Venue €100.00, Materials €35.00, Catering €54.00 and Transport €60.00. Mean eligible line cost is **€35.57**, using seven as the denominator. The key identifies the sample's €300 subtotal as wrong, its predicted 20% attendance rise as unsupported, and the edit claiming complete figures as an unjustified removal of a caveat.

## Verification

- `npm run check`: **138 tests, 138 passed, 0 failed, 0 skipped; Vite v8.3.0 built successfully in 380 ms**. The first run exposed the stale chapter count. After correcting it, the build initially lacked Vite because this worktree had no `node_modules`; dependencies were copied from the main checkout after confirming byte-identical lockfiles. No package or lockfile change was needed.
- `tests/ai-for-work.test.mjs`: exact contract metadata, quotations, evidence fields and labels; eight sessions, ten key words, reflections, six lab stages and workflow mapping; four separate tool notices and fallbacks; actual renderer output and control handlers; saved evidence surviving route changes; acknowledgement and the 11/12-character boundary; all five disclosure rows with short decisions; admin labels and complete imported evidence.
- Dataset checks independently calculate the raw profile, distinguish exact and conflicting duplicates, verify source-justified conversions, retain unresolved originals and reconcile 12 raw / 1 removed / 11 retained / 7 eligible / 4 held. They check line costs, subtotal, all category totals, mean, sample flaws, blank templates, downloads and manifest sizes, teacher-key separation and two full generator runs against checked-in files.
- Project/server/capstone checks cover the exact Chapter 5 and Chapter 6 server lists and order, Chapter 6 role/client/objective/deliverables, imported cleaning/validation/review decisions, separate disclosure evidence and a final recommendation. Feedback-specific capstone evidence earns credit; generic or copied event-budget figures alone do not. Concept/action/scenario vocabulary and earlier-chapter scoring are checked.
- `tests/chapter-capstone.test.mjs`: the pilot count is exactly six, with the Chapter 6 workshop-feedback scenario, id, title and three prompts asserted alongside all existing chapter cases. This corrects the stale five-chapter assertion.
- The new earlier-chapter regression expectation was corrected after checking the pre-Chapter 6 scorer: `human-in-the-loop` already earns one action/reasoning point through the existing word `human`; it earns no new concept credit in Chapters 1–5. Production scoring is unchanged.
- Existing `v21`, `experience-labs` and `lab-datasets` suites remain part of the full check.
- `node --check` validates all five `tests/acceptance/*.mjs` files. Acceptance scripts are not executed here.

## Book alignment

| Book (pp. 28–31) | Portal |
| --- | --- |
| Opening, badge, three hours, LO7 and ten key words (p. 28) | Block metadata and session study keywords |
| What you'll need (p. 29) | Named chat routes, centre-installed Calc/Writer, supplied raw dataset and learning contract |
| Mission and first five route segments (p. 29) | Verbatim mission/route; b6s1–b6s5 with the prescribed timings |
| Workplace workflow and human review (p. 29) | Eight-step method across b6s4/b6s5, spreadsheet analysis and independent claim checks |
| Professional communication (p. 30) | Own draft, AI editing, justified acceptance/rejection and disclosure in b6s6 |
| Disclosure scenarios (p. 30) | Five individual decisions, optional partner comparison and one reasonable disagreement |
| Learning contract (p. 30) | Three concrete rules in b6s8, including disclosure and human checkpoints |
| Think about it and myth-busters (p. 30) | Four reflections and three verbatim myth pairs |
| Portfolio, self-check and level up (p. 31) | `final`, 1 / 2 / 2 self-check descriptors and verbatim `levelUp` |

## Delivered by the Phase 7 implementation

- Student UI: reused lab/raw-viewer/textfields/chain rendering, readiness, admin labels and project summaries; `.block-6` colour; `block6-capstone` "Digital Collaborator review" in a distinct workshop-feedback scenario; block6 vocabulary gating; "AI-assisted Workplace Briefing" project brief.
- Workspace and API: `requiredSessions.block6`, derived chapter order and existing Chapter 5 qualification gate; six imported lab stages plus separately added disclosure choices and a final recommendation. Existing capstone/project writes require the preceding chapter's practical work and capstone qualification.
- Acceptance fixtures and scripts: `CHAPTER6_SESSIONS`, `CAPSTONE6_ANSWERS`, eight-session sample-route evidence, Chapter 5→6 progression, independent acknowledgements, raw viewer, project completion and b6s4/b6s5 audit screenshots. README and ROADMAP already carry Chapter 6 and the Phase 8 pointer in the WIP commit.
- Completion scope: only `tests/ai-for-work.test.mjs`, `tests/chapter-capstone.test.mjs` and this release note. The WIP commit already contained a partial Chapter 6 suite despite describing it as missing; it has been completed and strengthened. No product defect requiring another file change was exposed.

## Pending

- Preview API/UI acceptance and live walkthrough after integration; production remains deferred. No acceptance run, push or deployment was performed here.
- First facilitated run should check whether students can complete the first seven cleaning steps in 30 minutes and keep sufficient evidence within the imported-note limit, and whether the no-account routes remain available in the centre.
- No implementation deviation from the Phase 7 contract was needed. The self-paced discussion/memory tasks, training-centre wording and "Human review" label are the contract's explicit adaptations.
