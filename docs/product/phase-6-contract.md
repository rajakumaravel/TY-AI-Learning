# Phase 6 contract — Chapter 5: Trust, Bias & Misinformation

Shared contract for parallel implementation. Sources, in precedence order: `docs/source/student-book.txt` pages 23–27, `docs/source/curriculum-pilot-v1.txt` section "9. Block 5" and Appendix A sheet A2 and rubric B1, then `docs/source/curriculum-review-data-integrity.txt` section 8 (lifecycle bias map, 8.1 subgroup performance, 8.2 proxy variables), which the ROADMAP adopts through the in-product bias simulator. Read the sources before touching code; quote the book where this contract says verbatim.

Deployment context: the portal runs in a third-party training centre, not a school. Where the book says "your teacher" or "school-approved", portal copy says "the training centre" or "the tool named here". Book text quoted as the book stays verbatim. The book's "Generate, or receive from your teacher, a short news-style article written by AI" becomes: the article is provided in the portal (synthetic, clearly labelled), and generating your own with the Chapter 4 tool is optional.

## Tool decision

No session requires an AI tool. Lateral verification uses an ordinary web search in new tabs (any search engine; the instructions say "open a new tab and search", no link to a specific AI product). The book's rule is quoted verbatim in b5s4: "Do not fact-check by asking another chatbot. That's just asking a second pattern-predictor." Because no session opens an AI tool, the four standing safety notes are not rendered in this chapter; the `lab` kind is not used. The bias simulator is built in-product (ROADMAP Phase 6: no external account or privacy dependency).

## Block

```text
id: block5   number: "05"   title: "Trust, Bias & Misinformation"   duration: "3 hours" (sessions total 180 min)
badge: "AI Investigator"   outcomes: ["LO4","LO6","LO9"]   pageRef on every session: "Student Book pp. 23–27"
description: book p.23 opening paragraph, shortened to two sentences in the same words (the paragraph ends "…generated content so it's actually trustworthy.").
mission (p.24, verbatim): "Investigate one AI-generated article or set of claims. Produce an evidence table, identify at least one bias risk, and publish a corrected version with the uncertain parts clearly marked."
route: the book's nine timed segments pp.24–25, verbatim labels ("The confidence trap", "Discover: the trust checklist", "AI News Detective", "Lateral verification", "Bias stations", "Improve the output", "Synthetic media", "Reflection").
final: "Your annotated AI output, your verification table (Sheet A2), your bias analysis from the stations and the simulator, your corrected version, and your personal three-step trust rule."
lab: { title: "Create, detect and reduce bias", summary: "You mark up an AI-written article, verify its claims against independent sources, build a biased outcome in a simulator and then fix it, and publish a version that is less exciting and more trustworthy.", stages: [["DO","b5s3","Mark up an AI news article"],["TEST","b5s1","The confidence trap"],["MAKE","b5s5","Create a biased outcome in the simulator"],["BREAK","b5s6","Find where bias enters at four stations"],["IMPROVE","b5s7","Publish a corrected version"],["PROVE","b5s4","Verify claims laterally"]] }
myths (p.26, verbatim, three pairs)
selfCheck (p.26, matched to the docx descriptors): { "Getting started": ["I can spot unsupported claims or possible bias, with prompts"], "Getting there": ["I use independent sources to verify claims", "I can improve misleading content"], "Going further": ["I trace evidence back to its origin", "I can tell different kinds of bias apart", "I can explain what's still uncertain after checking"] }
levelUp (p.27, verbatim): "Take one claim that's repeated widely online. Trace it back towards its earliest available source. Show where along the way context was lost or changed."
```

Key words (p.24), each in at least one session's `study.keywords`: misinformation, disinformation, hallucination, bias, selection bias, representation bias, framing, automation bias, synthetic media / deepfake, provenance, lateral reading.

## Sessions (ids fixed; minutes sum to 180)

| id | title (book label) | min | type | activity.kind |
| --- | --- | --- | --- | --- |
| b5s1 | The confidence trap | 15 | PREDICT + TEST | `chain`, 3 rows |
| b5s2 | Discover: the trust checklist | 20 | DISCOVER | `quiz` |
| b5s3 | AI News Detective | 30 | TRY + INVESTIGATE | `annotate` (new kind) |
| b5s4 | Lateral verification | 30 | TEST + INVESTIGATE | `chain` (Sheet A2), 5 rows |
| b5s5 | Bias simulator | 20 | MAKE + BREAK | `simulator` (new kind) |
| b5s6 | Bias stations | 20 | BREAK + QUESTION | `chain`, 4 rows |
| b5s7 | Improve the output | 25 | IMPROVE | `textfields`, 3 fields |
| b5s8 | Synthetic media | 10 | QUESTION | `textfields`, 2 fields |
| b5s9 | Reflection: my three-step rule | 10 | REFLECT + EVIDENCE | `textfields`, 3 fields |

Every session keeps `intro`, `study{title, body[3], example, keywords}`, `reflection`. Study text is written for a 15–16 year old from the book's own explanations. b5s2's study body is built from the book's p.25 SIFT text and must contain the four habit names exactly: "Stop", "Investigate the source", "Find better coverage", "Trace the claim". b5s5's study body carries the review's lifecycle idea in plain words (bias can enter before data exists, at collection, at labelling, through a proxy feature, in training, in evaluation, in deployment, and in how a person trusts the output) and the 8.1 example numbers (Group A 18/20, Group B 11/20, overall 72.5%). The four "Think about it" questions (p.26) are the reflections for b5s1 ("What would change your mind about this claim?"), b5s4 ("Is this source independent of the original claim, or just repeating it?"), b5s3 ("What's missing from the framing? What's not being said?") and b5s7 ("Could a statement be accurate and still be misleading?"). b5s9's reflection is "Which step of your rule would you be most tempted to skip when you are in a hurry, and why?"

**b5s1 chain.** The three statements are in the download `claim-cards.txt` and repeated in the instructions: one true, one false, one that cannot be verified either way; the student ranks confidence before checking, then checks. columns `[["statement","Statement (copy the card)"],["before","My confidence before checking (1–5)"],["verdict","After checking: true / false / can't be verified"],["fooled","What fooled me, or what tipped me off"]]`, rows 3, minRows 3, head "STATEMENT → CONFIDENCE BEFORE → VERDICT → WHY". Evidence label "Confidence trap record".

**b5s2 quiz.** Title "Which habit comes first?", 8 short situations (a post that makes you angry; a site you have never heard of; one article, no other coverage; a statistic with no link; a screenshot of a headline; a friend's forward; a chatbot answer with a confident date; a video clip that seems too neat), options `Stop` / `Investigate the source` / `Find better coverage` / `Trace the claim`. Written from p.25; the answer key is the habit the book's checklist points to first for that situation.

**b5s3 annotate (new kind).** The book's highlighter pass in the portal:

```json
{ "kind": "annotate", "title": "AI News Detective", "instructions": "...", "file": "news-detective-article.txt",
  "markTypes": ["Factual claim", "Emotional framing", "Missing source", "Unsupported certainty"],
  "minMarks": 6, "requiredMarks": ["Factual claim", "Unsupported certainty"],
  "downloads": [...] }
```

Render (container `.annotate-lab`): the article from `public/datasets/<file>` is fetched and split into sentences, each rendered as `<button class="annotate-sentence" data-sentence="<n>">`; clicking one fills `#annotateTarget` (read-only text, "Sentence n: …"); `select#annotateMark` lists `markTypes`; `textarea#annotateNote`; `button#annotateAdd`. Findings render in `.annotate-findings` as a list with a remove button per item, and a count per mark type in `.annotate-counts` (the book says "Count them."). Sentences that have a mark get a class `marked` and a small tag showing the mark type. State: `state.activity[sid] = { marks: [{ sentence: n, type, note }] }`. `activityReady`: `marks.length ≥ minMarks`, every `requiredMarks` type present, at least three distinct types, every note ≥ 8 chars. Admin `activityLabel`: `Annotated article`; `summariseActivity` line: `<n> marks: <type>×<count>, …`. Downloads: the article (text), the annotation sheet (CSV headers: sentence, mark type, note). Evidence label "Annotated AI output". Optional line in the instructions: "If you would rather mark up an article you generated yourself with the Chapter 4 tool, paste short extracts into your notes; the checks are the same."

**b5s4 chain (Sheet A2).** columns `[["claim","Claim from the article"],["source","Independent source I found (name and where)"],["independent","Independent of the original, or repeating it?"],["verdict","Supported / uncertain / wrong"]]`, rows 5, minRows 3, head "CLAIM → SOURCE → INDEPENDENT? → VERDICT". Instructions quote the book's chatbot rule verbatim and tell the student to open new tabs and search. Downloads: the article, the A2 template CSV (already generated for Chapter 4: `verification-log-A2.csv`, reuse without regenerating a second file).

**b5s5 simulator (new kind).** The ROADMAP's in-product Bias/Data Simulator, built on the review's 8.1 subgroup table and 8.2 proxy point:

```json
{ "kind": "simulator", "title": "Bias simulator: a shortlisting model", "instructions": "...",
  "scenario": "A model shortlists applicants for a training-centre placement. It was trained on past decisions. Two groups apply in equal numbers, 20 from each, but the training data does not contain them equally.",
  "controls": [["shareB","Share of Group B in the training data (%)",5,50,5,10],["proxy","How strongly a proxy feature (postcode) stands in for the group (%)",0,100,10,80]],
  "toggle": ["removed","Remove the sensitive field from the model"],
  "minRuns": 2,
  "fields": [["changed","What I changed between my runs, and what happened to each group…"],["entered","Where the bias entered (before the data, at collection, through a proxy, in training, in evaluation, in use)…"],["affected","Who is affected, and what I would change in the data or the design to reduce it…"]] }
```

Controls are range inputs `[key, label, min, max, step, default]`. Deterministic model, computed in the browser on every input change, no randomness:

```text
correctA = 18
penalty  = round(6 × (removed ? proxy/100 : 1))
correctB = clamp(round(6 + 12 × shareB/50) − penalty, 0, 20)
overall  = (correctA + correctB) / 40
```

So Group A stays at 90% whatever happens; Group B climbs with representation; keeping the sensitive field always costs Group B six correct decisions; removing it helps only as much as the proxy is weak (the 8.2 lesson). Render (container `.bias-sim`): the scenario paragraph; one `input[type=range][data-sim="<key>"]` per control with its live value; `input[type=checkbox][data-sim="removed"]`; a results table with ids `#simAccA`, `#simAccB`, `#simOverall` showing `18/20 · 90%`, `<b>/20 · <pct>%`, `<n>/40 · <pct>%`; a `button#simRecord` "Record this run" that appends the current settings and results to `state.activity[sid].runs` and to the `.sim-runs` list (settings, per-group accuracy, overall); then the `fields` as `textarea[data-i]`. State: `{ runs: [{ shareB, proxy, removed, correctA, correctB, overall }], fields: { changed, entered, affected } }`. `activityReady`: `runs.length ≥ minRuns`, at least two runs differ in `shareB`, `proxy` or `removed`, and every field ≥ 12 chars. Admin `activityLabel`: `Bias simulator`; `summariseActivity` line: `<n> runs; Group B <min>%–<max>%; overall <min>%–<max>%`. Downloads: `bias-simulator-worksheet.csv` (headers: run, shareB, proxy, removed, groupA, groupB, overall, note). Evidence label "Bias analysis (simulator)".

**b5s6 chain.** The book's four stations from the download `bias-station-cards.txt`: hiring data, image generation and stereotypes, school discipline analytics (the card names it a "college discipline analytics" case for the training centre; the book's label stays in the study text), recommendation feeds. columns `[["station","Station"],["enters","Where could bias enter (the data? the design? how people use it?)"],["affected","Who would be affected"],["kind","Which kind of bias (selection, representation, framing, automation, proxy)"]]`, rows 4, minRows 4, head "HIRING · IMAGES · DISCIPLINE · FEEDS". Evidence label "Bias analysis (stations)".

**b5s7 textfields.** "The corrected version of the article: keep only the verified claims, label anything uncertain as uncertain, add the real sources…", "What I took out, and why (loaded framing, unsupported certainty, missing sources)…", "Why my version is less exciting and more trustworthy…". Ready: first field ≥ 120 chars, others ≥ 20. Downloads: the article, `corrected-version-template.md`. Evidence label "Corrected version".

**b5s8 textfields.** Self-paced adaptation of the book's discussion: "A clip that made you angry: what would you check before believing it (provenance, other coverage, who gains from you sharing it)…", "One way 'seeing is believing' is weaker now, in your own words…". Ready: each ≥ 20 chars. Downloads: `synthetic-media-checklist.txt`.

**b5s9 textfields.** Three fields "Step 1…", "Step 2…", "Step 3…" for the personal three-step rule, each ≥ 8 chars; instructions quote the book: "Make it short enough to actually use." Type REFLECT + EVIDENCE. Evidence label "My three-step trust rule".

## Chapter page

Myth-busters, self-check and level-up render through the existing block fields; nothing new beyond the two kinds above. Chapter card colours for `.block-5` (student-ui agent; `.block-1`–`.block-4` already exist in `styles.css`).

## Files (`scripts/generate-datasets.mjs`, deterministic, `public/datasets/`)

- `claim-cards.txt`: the three confidence-trap statements, unlabelled: one true and checkable ("Transition Year was introduced in Irish schools in 1974"), one false and checkable ("The River Shannon is the longest river in Europe"), one that cannot be verified either way ("Most Irish teenagers would rather learn from an AI tutor than from a teacher"), plus the instruction to rank confidence before checking.
- `news-detective-article.txt`: a synthetic AI-style news article, clearly labelled as synthetic at the top, 10–12 sentences, on a plausible subject that can be checked laterally: a claimed plan for "AI tutors in every Irish secondary classroom by 2028". It must contain, mixed and unmarked: at least four factual claims of which some are real-world checkable and supported (Transition Year exists and is optional; the Department of Education runs the system; the Leaving Certificate is the final exam), at least two wrong (a wrong founding year for Transition Year; an invented "National AI Tutoring Act 2025"), at least one uncertain (a percentage from "a recent survey" with no named source), two emotionally framed sentences, two sentences with certainty that nothing backs ("Experts agree…", "It is beyond doubt…"), and one fabricated citation to a named report. The sentences must split cleanly on ". " so the `annotate` renderer's sentence split is stable; no abbreviations with full stops inside sentences.
- `annotation-sheet.csv`: headers `sentence,mark_type,note`, empty rows.
- `bias-station-cards.txt`: the four station scenarios, three or four sentences each, plus the review's lifecycle map as a short list (stage → bias type → one-line example) for reference.
- `bias-simulator-worksheet.csv`: headers as above, empty rows.
- `corrected-version-template.md`: headings for verified claims, uncertain claims (labelled), sources, what was removed.
- `synthetic-media-checklist.txt`: a short checklist of habits (provenance, other coverage, who gains, look for the original, wait before sharing), no sensational examples.
- Teacher key `docs/teacher/news-detective-article.KEY.txt`: every sentence numbered and marked with its intended mark types and, for factual claims, supported / uncertain / wrong with the checking source; the confidence-trap answers; the intended bias mechanisms per station. Never under `public/`.

## Capstone (`lib/chapter-capstone.mjs`)

`CAPSTONES.block5 = { id: "block5-capstone", title: "AI Investigator review", brief: <a different scenario in prose: a post is spreading through a group chat, with a screenshot of a headline saying a "discipline prediction" AI used by a chain of training centres flags students who are "likely to cause trouble", citing "a study" with no link; forty accounts have reposted it in an hour and two news sites have written it up using the post as their source>, prompts: [ (1, Emerging) which claims in the post are unsupported, and what bias risk you can see in a system like the one described; (2, Developing) how you would verify the claims using independent sources, and how you would rewrite the post so it is more trustworthy; (3, Extending) trace where the evidence actually comes from, say which kinds of bias could enter the system and at which stage, and explain what would still be uncertain after your checking ] }`. Block5-only vocabulary in the scoring regexes (concept: `misinformation|disinformation|hallucinat\w*|bias|selection|representation|framing|automation|provenance|lateral|independent|source|proxy|synthetic|deepfake|uncertain\w*|lifecycle|label\w*|deploy\w*`; action: `stop|investigate|find|trace|verify|check|label|rewrite|remove|mark|cite|compare|wait`; scenario-evidence: `post|screenshot|headline|study|claim|discipline|flag\w*|students?|repost\w*|news site|original|group chat|training centre`). Chapters 1–4 scoring unchanged.

## Project brief (`lib/project-briefs.mjs`)

`block5`: title "AI News Detective Report", role "Junior Trust & Safety Analyst", client "Training centre communications team", objective from the mission, acceptance criteria from the docx descriptors, deliverables: "Annotated AI output", "Verification table (Sheet A2)", "Bias analysis (stations and simulator)", "Corrected version", "Personal three-step trust rule", "Final recommendation". `summariseActivity` gains the `annotate` and `simulator` kinds (lines as specified above).

## Server

`requiredSessions.block5 = ['b5s1','b5s2','b5s3','b5s4','b5s5','b5s6','b5s7','b5s8','b5s9']`.

## Tests

- `tests/v21.test.mjs`: five chapters, durations 120/240/180/240/180.
- New `tests/trust-bias.test.mjs`: block shape per contract, key words, myths/selfCheck/levelUp, no `lab` kind and no tool in the block, `annotate` renderer, sentence split and ready rule, `simulator` model values for the three cases (shareB 10 / proxy 80 / kept → Group B 2/20; shareB 50 / proxy 80 / removed → Group B 13/20; shareB 50 / proxy 0 / removed → Group B 18/20) and ready rule, server list, capstone vocabulary gating, downloads exist and teacher key outside `public/`, the article contains at least one sentence the key marks wrong and one it marks unsupported certainty.
- `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`: keep green (the block has a `lab` field with six stages; no session of kind `lab`).
- Acceptance: `CHAPTER5_SESSIONS`, `CAPSTONE5_ANSWERS`; API acceptance covers the Chapter 4→5 gate; UI acceptance and live walkthrough drive all nine sessions (annotate: `.annotate-sentence[data-sentence]`, `#annotateMark`, `#annotateNote`, `#annotateAdd`; simulator: `input[data-sim]`, `#simRecord`, `textarea[data-i]`; chain inputs `input[data-i][data-f]`), the Chapter 5 capstone and project; `ui-audit.mjs` screenshots both new kinds.

## Docs

`docs/releases/phase-6-chapter-5.md`; README pilot-features line; ROADMAP current work → Phase 6 done, Phase 7 next.

## File ownership

| Agent | Owns |
| --- | --- |
| content | `curriculum.json`, `scripts/generate-datasets.mjs`, `public/datasets/*`, `docs/teacher/*`, `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`, `docs/releases/phase-6-chapter-5.md`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `index.html`, `styles.css`, `admin.js`, `lib/chapter-capstone.mjs`, `lib/project-briefs.mjs`, `tests/chapter-capstone.test.mjs`, `tests/trust-bias.test.mjs` |
| workspace-api | `project-workspace.js`, `functions/api/[[path]].js`, `tests/project-workspace*.test.mjs`, `tests/cloudflare-runtime.test.mjs`, `tests/acceptance/*` |

Selector contract: annotate container `.annotate-lab`, sentences `button.annotate-sentence[data-sentence]`, `#annotateTarget`, `select#annotateMark`, `textarea#annotateNote`, `button#annotateAdd`, `.annotate-findings`, `.annotate-counts`; simulator container `.bias-sim`, `input[type=range][data-sim="shareB"]`, `input[type=range][data-sim="proxy"]`, `input[type=checkbox][data-sim="removed"]`, `#simAccA #simAccB #simOverall`, `button#simRecord`, `.sim-runs`, fields `textarea[data-i]`; chain inputs `input[data-i][data-f]`; quiz `select[data-i]`; textfields `textarea[data-i]`; capstone `textarea[data-capstone] #submitCapstone`; workspace `#projectWorkspaceBtn-block5 #pwImportLab #pwAddLog #pwSave #pwSubmit .pw-status`; myths `#mythBusters`; self-check `.self-check`.
