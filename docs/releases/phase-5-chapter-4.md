# Phase 5 — Chapter 4: Generative AI & Prompting

**Status:** content slice implemented on `phase5/content` against `docs/product/phase-5-contract.md`; the student-ui and workspace-api slices (prompt renderer, capstone, project brief, server session list, acceptance scripts) land separately. Preview acceptance follows the merge of all three. Production deferred (ADR-007).

**Sources.** `docs/source/student-book.txt` pp. 18–22 (Student Book v1.0, September 2026), `docs/source/curriculum-pilot-v1.txt` section 8 "Block 4" with Appendix A sheets A2 and A4 and rubric B1. Book text quoted as the book is verbatim: mission, the ten timed route labels, the portfolio line, the four myth-busters, the seven self-check descriptors, the level-up challenge and the "Confident wording is not confident truth." sentence.

## Tool decision and deployment context

The portal runs in a training environment operated by a third-party company, not a school, so the book's "school-approved tool" and "your teacher" become "the tool named here" and "the training centre" in portal copy. Chapter 4 is the first chapter whose lab opens a generative AI tool, and the constraint is the same as every lab before it: free, no account, and usable by a 15–16 year old without a teacher present.

- **Primary:** DuckDuckGo AI Chat, `https://duck.ai`. Free, anonymous, no sign-in, and the student can run the same prompt through more than one model, which is exactly what "Same task, different prompts" needs.
- **Fallback:** Microsoft Copilot on the web, `https://copilot.microsoft.com`, usable without signing in.
- **Second fallback in every lab:** the sample outputs download, two synthetic answers to the same weak question.
- **Not offered:** Claude.ai, ChatGPT and Gemini (age terms or an account required).

Every session that opens the tool shows the four safety notes from the contract; the lab session (`b4s1`) carries them as its `privacy` notice, and the sessions that reuse the tool (`b4s3`–`b4s8`) repeat the rules in their instructions. Nothing typed into the portal is sent to the AI tool: the student copies the prompt across and pastes short extracts back.

## Scope

**Curriculum (`curriculum.json`, block `block4`, 240 minutes, badge Prompt Engineer, outcomes LO7 and LO9, every `pageRef` "Student Book pp. 18–22").** Description is the book's p. 18 opening cut to two sentences. All eleven key words from p. 19 appear in `study.keywords`. Block fields `myths` (four pairs), `selfCheck` (2 / 2 / 3 descriptors) and `levelUp` carry pp. 21–22.

| Session | Title (book label) | Minutes | Type | Activity |
| --- | --- | --- | --- | --- |
| b4s1 | Same task, different prompts | 20 | PREDICT + TEST | `lab`: DuckDuckGo AI Chat, the four safety notes, five steps, "Tool blocked?" fallback (Copilot, then the sample outputs), four evidence fields titled "Output comparison notes", two downloads |
| b4s2 | What an LLM actually does | 20 | DISCOVER | `quiz` "Pattern prediction or fact lookup?": eight statements, options Pattern prediction / Checked fact lookup / Neither; study body built from the book's p. 20 Discover paragraph |
| b4s3 | Prompt Lab 1: C-T-C-F | 30 | TRY | `prompt` (new kind) with `builder: true`, versions v1 and v2, the four Sheet A4 fields, A4 download |
| b4s4 | Prompt Lab 2: iterate | 30 | IMPROVE | `prompt` with `builder: false`, version v3, same fields, two `extras` textareas |
| b4s5 | Four useful roles | 30 | TRY + BREAK | `chain`: role / prompt / what it did well / risk, four rows, the book's four roles and risks in the instructions |
| b4s6 | Verification challenge | 30 | TEST + INVESTIGATE | `chain` (Sheet A2): claim / source / verdict / what I changed, three rows; topic cards, sample outputs and A2 download |
| b4s7 | Injecting doubt | 25 | BREAK | `textfields` ×4: leading question, neutral version, how they differed, confirmation bias and responsibility |
| b4s8 | Build a reusable prompt | 30 | MAKE | `textfields` ×4 with the template download |
| b4s9 | Red-team a prompt | 20 | QUESTION + BREAK | `textfields` ×3, self-paced adaptation of the peer red-team with the prompt cards download |
| b4s10 | Exit rule | 5 | REFLECT + EVIDENCE | `textfields` ×1: "I should never trust an AI answer just because…" |

Reflections: b4s3, b4s5, b4s6 and b4s7 are the book's four "Think about it" questions in order; b4s10's is the exit rule. Lab stages: DO b4s3, TEST b4s1, MAKE b4s8, BREAK b4s7, IMPROVE b4s4, PROVE b4s6. Blocks 1–3 are byte-for-byte unchanged (the file was re-emitted with the repo's formatter convention and the diff is insertions only).

**Datasets (`scripts/generate-datasets.mjs`, deterministic, no `Date` or `Math.random`; two consecutive runs produce identical files).**

| File | Contents |
| --- | --- |
| `genai-weak-question-card.txt` | "Tell me about the River Shannon." and why it is weak: no context, task, constraints or format |
| `genai-sample-outputs.txt` | Two fluent chatbot-style answers to the weak question, labelled SYNTHETIC SAMPLES. Real-world checkable facts (length, source, the three lakes, counties, Ardnacrusha and the ESB, the Shannon–Erne Waterway, Shannon Airport) mixed with planted wrong ones (nearly 500 km; Ardnacrusha opened in 1937; an invented "Shannon Bridge Act of 1873"; "has never flooded seriously"), one fabricated citation, and uncertain claims that need a year or a definition. Nothing is marked |
| `genai-verification-topics.txt` | Three topics (the River Shannon; Transition Year in Ireland; the Apollo 11 landing), five checkable questions each, no answers, suggested reliable sources |
| `genai-red-team-prompts.txt` | Three prompts each carrying one ambiguity, one missing constraint and one claim that would need checking |
| `prompt-experiment-sheet-A4.csv`, `verification-log-A2.csv` | Sheets A4 and A2 as headers with empty rows (V1 – baseline / V2 / V3; three claim rows) |
| `reusable-prompt-template.md` | C-T-C-F skeleton with [placeholders] and a built-in "mark anything unsure" constraint and a "before you rely on the output" section |
| `docs/teacher/genai-sample-outputs.KEY.txt` | Teacher key, derived from the same tagged sentences as the samples: every claim marked supported / uncertain / wrong with the source to check, discussion points, and the red-team prompts' planted issues. Never under `public/` |

The cup/bottle zips are regenerated by the script but committed unchanged: only their timestamps differ, the sizes in `manifest.json` are identical.

## Verification

- `npm test` on this slice: the three owned suites (`v21`, `experience-labs`, `lab-datasets`) are green with the new Chapter 4 checks; see the commit message for the full result line and any cross-slice failures.
- `tests/v21.test.mjs`: four chapters, durations 120/240/180/240, block4 outcomes and badge, session ids, minutes, kinds, mission, route, portfolio line, myths, self-check, level-up, page references, the eleven key words, the "Confident wording" sentence, the quiz/prompt/chain shapes from the contract.
- `tests/experience-labs.test.mjs`: the b4s1 tool, the four safety notes verbatim, five steps, the "Tool blocked?" fallback naming Copilot and the sample outputs, the two downloads, the stage map, and that the sessions reusing the tool repeat the safety rules.
- `tests/lab-datasets.test.mjs`: the seven downloads exist, are in the manifest and are offered in b4s1, b4s3, b4s6, b4s8 and b4s9; the teacher key exists outside `public/` and is never served or offered; the samples are labelled synthetic and unmarked; every claim the key marks appears in the samples; the key has at least one of each verdict, the Shannon Bridge Act and the fabricated citation; three topics × five facts; three red-team prompts; the A4/A2 headers and the template headings.
- `node scripts/generate-datasets.mjs` twice: the seven Chapter 4 files and the key are byte-identical between runs.

## Book alignment

| Book (pp. 18–22) | Portal |
| --- | --- |
| Opening paragraph, badge, 4 hours, LO7, LO9 | `description`, `badge`, `duration`, `outcomes` |
| Key words (p. 19) | `study.keywords` across the ten sessions |
| "What you'll need": approved tool, Sheet A4, browser for Sheet A2, scenario cards | duck.ai with Copilot fallback; A4 CSV in b4s3; A2 CSV and topic cards in b4s6; weak-question and red-team cards |
| Mission (p. 19) | `mission`, verbatim |
| The route, ten timed segments (pp. 19–21) | `route`, labels verbatim; one session per segment with the same minutes |
| Discover paragraph (p. 20) | b4s2 study body, including "Confident wording is not confident truth." |
| C-T-C-F (p. 20) | b4s3 study and builder; template download |
| Four useful roles with risks (p. 20) | b4s5 study and instructions |
| Verification challenge, Sheet A2 (p. 20) | b4s6 chain with the A2 columns |
| Injecting doubt (p. 20) | b4s7 |
| Build a reusable prompt, peer red-team, exit rule (p. 21) | b4s8, b4s9 (self-paced with cards), b4s10 |
| Think about it (p. 21) | reflections of b4s3, b4s5, b4s6, b4s7 |
| Myth-busters (p. 21) | `myths`, four pairs verbatim |
| Portfolio, self-check, level up (p. 22) | `final`, `selfCheck`, `levelUp`, verbatim |

## Delivered by the other Phase 5 slices

- Student UI: `prompt` activity renderer (`.prompt-lab`, builder inputs, `#composeV2`, version and extra textareas), `activityReady` rules, admin `activityLabel`, "Chapters 1–n" heading, `block4-capstone` and block4 keyword gating, `block4` project brief and `summariseActivity` for the `prompt` kind, `tests/genai-prompting.test.mjs`.
- Workspace and API: `requiredSessions.block4`, acceptance scripts (`CHAPTER4_SESSIONS`, `CAPSTONE4_ANSWERS`, the Chapter 3→4 gate, the ten-session walkthrough).

## Pending

- Merge of the three slices, then Preview acceptance (`npm run acceptance`).
- First real run should record whether duck.ai stays reachable from the training centre's network and whether 20 minutes is enough for two runs of the weak question plus the comparison notes.
- The contract's block section says "eleven timed segments"; the book has ten (0–20 through 235–240), and the portal follows the book.
