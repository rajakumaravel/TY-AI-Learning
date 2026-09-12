# Phase 6 — Chapter 5: Trust, Bias & Misinformation

**Status:** content slice implemented on `phase6-chapter5-content` against `docs/product/phase-6-contract.md`; the student-ui and workspace-api slices (`annotate` and `simulator` renderers, capstone, project brief, server session list, acceptance scripts, `tests/trust-bias.test.mjs`) land separately. Preview acceptance follows the merge of all three. Production deferred (ADR-007).

**Sources.** `docs/source/student-book.txt` pp. 23–27 (Student Book v1.0, September 2026), `docs/source/curriculum-pilot-v1.txt` section 9 "Block 5" with Appendix A sheet A2 and rubric B1, and `docs/source/curriculum-review-data-integrity.txt` section 8 (the lifecycle bias map, 8.1 subgroup performance, 8.2 proxy variables), which the ROADMAP adopts through the in-product bias simulator. Book text quoted as the book is verbatim: the opening paragraph (already two sentences), the mission, the eight timed route labels, the portfolio line, the three myth-busters, the six self-check descriptors, the level-up challenge, the four "Think about it" questions, the chatbot rule ("Do not fact-check by asking another chatbot. That's just asking a second pattern-predictor.") and "Make it short enough to actually use."

## Tool decision and deployment context

No session opens an AI tool. Lateral verification uses an ordinary web search in new tabs; no session links to any AI product, and the four standing safety notes are therefore not rendered in this chapter. The `lab` activity kind is not used; the block still declares an Experience Lab with six ADR-005 stages mapped onto the in-product sessions. The bias simulator is built in-product (ROADMAP Phase 6: no external account or privacy dependency).

The portal runs in a third-party training centre, not a school. The book's "Generate, or receive from your teacher, a short news-style article written by AI" becomes: the article is provided in the portal, synthetic and clearly labelled, and marking up an article you generated yourself with the Chapter 4 tool is optional. The book's "school discipline analytics" station is run as a training-centre discipline analytics case on the card; the book's label stays in the study text.

## Scope

**Curriculum (`curriculum.json`, block `block5`, 180 minutes, badge AI Investigator, outcomes LO4, LO6 and LO9, every `pageRef` "Student Book pp. 23–27").** All eleven key words from p. 24 appear in `study.keywords`. Block fields `myths` (three pairs), `selfCheck` (1 / 2 / 3 descriptors) and `levelUp` carry pp. 26–27.

| Session | Title (book label) | Minutes | Type | Activity |
| --- | --- | --- | --- | --- |
| b5s1 | The confidence trap | 15 | PREDICT + TEST | `chain` ×3: statement / confidence before / verdict / what fooled me; claim cards download |
| b5s2 | Discover: the trust checklist | 20 | DISCOVER | `quiz` "Which habit comes first?": eight situations, options Stop / Investigate the source / Find better coverage / Trace the claim; study body built from the p. 25 SIFT text with the four habit names verbatim |
| b5s3 | AI News Detective | 30 | TRY + INVESTIGATE | `annotate` (new kind): the synthetic article, four mark types, `minMarks` 6, required marks Factual claim and Unsupported certainty; article and annotation sheet downloads |
| b5s4 | Lateral verification | 30 | TEST + INVESTIGATE | `chain` (Sheet A2) ×5, min 3: claim / independent source / independent or repeating / verdict; the chatbot rule verbatim; article and the Chapter 4 A2 CSV (reused, not regenerated) |
| b5s5 | Bias simulator | 20 | MAKE + BREAK | `simulator` (new kind): the shortlisting scenario, two range controls, the remove-sensitive-field toggle, `minRuns` 2, three fields; study body carries the lifecycle map in plain words and the 8.1 numbers (18/20, 11/20, 72.5%) |
| b5s6 | Bias stations | 20 | BREAK + QUESTION | `chain` ×4: station / where bias enters / who is affected / kind of bias; station cards download |
| b5s7 | Improve the output | 25 | IMPROVE | `textfields` ×3: corrected version, what I took out, why it is less exciting and more trustworthy; article and template downloads |
| b5s8 | Synthetic media | 10 | QUESTION | `textfields` ×2, self-paced adaptation of the book's discussion; checklist download |
| b5s9 | Reflection: my three-step rule | 10 | REFLECT + EVIDENCE | `textfields` ×3: Step 1 / Step 2 / Step 3 |

Reflections: b5s1, b5s4, b5s3 and b5s7 are the book's four "Think about it" questions; b5s9's is the contract's. Lab stages: DO b5s3, TEST b5s1, MAKE b5s5, BREAK b5s6, IMPROVE b5s7, PROVE b5s4. Blocks 1–4 are byte-for-byte unchanged (the file was re-emitted with the repo's formatter convention and the diff is insertions only).

**Datasets (`scripts/generate-datasets.mjs`, deterministic, no `Date` or `Math.random`; two consecutive runs produce identical files).**

| File | Contents |
| --- | --- |
| `claim-cards.txt` | The three confidence-trap statements, unlabelled: Transition Year introduced in 1974 (true); the Shannon the longest river in Europe (false); most Irish teenagers would rather learn from an AI tutor (cannot be verified either way), with the instruction to rank confidence before checking |
| `news-detective-article.txt` | A synthetic AI-style article labelled SYNTHETIC ARTICLE at the top, twelve body sentences on a claimed plan for "AI tutors in every Irish secondary classroom by 2028". Supported real-world claims (Transition Year is optional and sits between the Junior Cycle and the senior cycle; the Department of Education runs the system; the Leaving Certificate is the final exam) mixed with wrong ones (Transition Year "founded in 1986"; an invented "National AI Tutoring Act 2025"; a fabricated report "Classrooms of Tomorrow"), one uncertain survey percentage with no source, three emotionally framed sentences and three with unsupported certainty. Every sentence ends with a single full stop and contains no other, so the `annotate` renderer's ". " split is stable. Nothing is marked |
| `annotation-sheet.csv`, `bias-simulator-worksheet.csv` | Headers `sentence,mark_type,note` and `run,shareB,proxy,removed,groupA,groupB,overall,note` with empty rows |
| `bias-station-cards.txt` | The four station scenarios (hiring data; image generation and stereotypes; discipline analytics; recommendation feeds), three or four sentences each, plus the review's lifecycle map as stage → bias type → one-line example |
| `corrected-version-template.md` | Headings for verified claims with sources, uncertain claims labelled, sources, and what was removed |
| `synthetic-media-checklist.txt` | Six habits: stop, provenance, other coverage, who gains, look for the original, wait; no sensational examples |
| `docs/teacher/news-detective-article.KEY.txt` | Teacher key derived from the same tagged sentences: every sentence numbered with its mark types and, for factual claims, supported / uncertain / wrong with the checking source; discussion points; the confidence-trap answers; the intended bias mechanisms per station; the simulator's expected values for the three contract cases. Never under `public/` |

The sentence numbering in the key starts at the first sentence of the article body, after the synthetic label paragraph and the headline line; the label and headline also split cleanly on ". " so the renderer is stable whichever part of the file it numbers. The cup/bottle zips are regenerated by the script but committed unchanged: only their timestamps differ, the sizes in `manifest.json` are identical.

## Verification

- `npm test` on this slice: the three owned suites (`v21`, `experience-labs`, `lab-datasets`) are green with the new Chapter 5 checks; see the commit message for the full result line and any cross-slice failures.
- `tests/v21.test.mjs`: five chapters, durations 120/240/180/240/180, block5 outcomes and badge, session ids, minutes, types, kinds, mission, route, portfolio line, myths, self-check, level-up, page references, no tool or safety notes, the eleven key words, the four SIFT habit names in b5s2, the lifecycle stages and 8.1 numbers in b5s5, the five reflections, and the chain / quiz / annotate / simulator / textfields shapes from the contract.
- `tests/experience-labs.test.mjs`: every block still declares six ADR-005 stages; blocks 1–4 have a lab session, block5 has none and no tool; the block5 stage map, kinds, no AI product link, and "open a new tab" in b5s4.
- `tests/lab-datasets.test.mjs`: the seven downloads exist, are in the manifest and are offered in b5s1, b5s3, b5s4, b5s5, b5s6, b5s7 and b5s8; Sheet A2 is reused from Chapter 4; the key exists outside `public/` and is never served or offered; the article is labelled synthetic, unmarked, splits into 10–12 sentences with no internal full stops; every sentence is in the key in order; at least four factual claims, two emotional, two unsupported certainty, three supported, two wrong, one uncertain; the claim cards are unlabelled; four stations and the lifecycle map; CSV headers, template headings and checklist habits.
- `node scripts/generate-datasets.mjs` twice: the seven Chapter 5 files and the key are byte-identical between runs.

## Book alignment

| Book (pp. 23–27) | Portal |
| --- | --- |
| Opening paragraph, badge, 3 hours, LO4, LO6, LO9 | `description`, `badge`, `duration`, `outcomes` |
| Key words (p. 24) | `study.keywords` across the nine sessions |
| "What you'll need": claim cards, browser and search, Sheet A2, optional AI tool | claim cards download; new-tab search; the Chapter 4 A2 CSV; the Chapter 4 tool is optional in b5s3 |
| Mission (p. 24) | `mission`, verbatim |
| The route, eight timed segments (pp. 24–25) | `route`, labels verbatim; the contract adds the bias simulator as a ninth session and re-times three segments to fund it (AI News Detective 30, Bias stations 20, Synthetic media 10), so the sessions still sum to the book's 180 minutes |
| SIFT habits (p. 25) | b5s2 study body and quiz |
| AI News Detective (p. 25) | b5s3 `annotate` with the book's four mark types and "Count them." |
| Lateral verification (p. 25) | b5s4 chain with the chatbot rule verbatim |
| Bias stations (p. 25) | b5s6 chain and station cards; the review's lifecycle map and 8.1/8.2 in b5s5 |
| Improve the output, synthetic media, reflection (p. 25) | b5s7, b5s8, b5s9 |
| Think about it (p. 26) | reflections of b5s1, b5s4, b5s3, b5s7 |
| Myth-busters (p. 26) | `myths`, three pairs verbatim |
| Portfolio, self-check, level up (pp. 26–27) | `final`, `selfCheck`, `levelUp` |

## Delivered by the other Phase 6 slices

- Student UI: `annotate` renderer (`.annotate-lab`, `button.annotate-sentence[data-sentence]`, `#annotateTarget`, `#annotateMark`, `#annotateNote`, `#annotateAdd`, `.annotate-findings`, `.annotate-counts`) and `simulator` renderer (`.bias-sim`, `input[data-sim]`, `#simAccA #simAccB #simOverall`, `#simRecord`, `.sim-runs`, `textarea[data-i]`), their `activityReady` rules (including b5s7's 120-character first field), admin `activityLabel`, `.block-5` colours, `block5-capstone` and block5 vocabulary gating, `block5` project brief and `summariseActivity` for the two kinds, `tests/trust-bias.test.mjs`.
- Workspace and API: `requiredSessions.block5`, acceptance scripts (`CHAPTER5_SESSIONS`, `CAPSTONE5_ANSWERS`, the Chapter 4→5 gate, the nine-session walkthrough, `ui-audit.mjs` screenshots of both new kinds).

## Pending

- Merge of the three slices, then Preview acceptance (`npm run acceptance`).
- First real run should record whether 30 minutes is enough to mark six sentences and whether students reach for a chatbot in b5s4 despite the rule.
- The contract's block section says "nine timed segments"; the book has eight (0–15 through 170–180), and the portal's `route` follows the book. The nine sessions come from adding the simulator.
