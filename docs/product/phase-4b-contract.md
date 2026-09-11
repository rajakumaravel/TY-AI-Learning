# Phase 4b contract — Chapter 3 realigned to the Student Book

Shared contract for parallel implementation. Sources, in precedence order: `docs/source/student-book.txt` pages 14–17 (Student Book v1.0), `docs/source/curriculum-pilot-v1.txt` section "7. Block 3" and Appendix A sheet A5 and Appendix B rubric, then `docs/source/curriculum-review-data-integrity.txt` sections 5, 6 and 21 for the data-integrity additions the ROADMAP adopts. Read the sources before touching code; quote them, do not paraphrase from memory. This replaces the Phase 4 block3 that shipped from the ROADMAP summary; keep what the book keeps, replace the rest.

## Block

```text
id: block3   number: "03"   title: "Data Detective"   duration: "3 hours" (sessions total 180 min)
badge: "Data Detective"   outcomes: ["LO5","LO6","LO9"]   pageRef on every session: "Student Book pp. 14–17"
description: book p.14 opening paragraph, shortened to two sentences in the same words.
mission (book p.15, verbatim): "Audit one digital service at category level, then design a Responsible Data Card for it: what is collected, why, what is inferred, the risks, what controls users have, and what should not be collected at all."
route: the book's eight timed segments p.15–16, verbatim labels.
final: "Your data category audit of one service, your Responsible Data Card (Sheet A5), your dataset fairness redesign: before and after, and your reflection."
lab: { title: "Fix a bad dataset", summary: "You audit a real service's data trail, then take a flawed dataset for a school club-recommendation system, find who is missing and what cannot be trusted, and design a better data plan.", stages: [["DO","b3s2","Audit one service"],["TEST","b3s3","Trace collection → purpose → benefit → risk"],["MAKE","b3s6","Write the Responsible Data Card"],["BREAK","b3s4","Find who is missing and what is wrong"],["IMPROVE","b3s6","Design a better data plan"],["PROVE","b3s6","Submit evidence and reflect"]] }
myths (new block field, book p.17, verbatim pairs): [["If data is public, any use of it is ethical.", "Public means visible. …"], ["Anonymous data can never cause harm.", "…"], ["Consent makes any data use OK.", "…"]]
selfCheck (new block field, book p.17 + docx descriptors): { "Getting started": ["I can name categories of data a service collects"], "Getting there": ["I can tell collected data from inferred data", "I can explain purpose, risk and minimisation for my service"], "Going further": ["I can evaluate who's represented and propose safeguards", "I can justify why some available data shouldn't be used"] }
levelUp (new block field, book p.17 verbatim): "Compare two services that do a similar job. Using only publicly available information, explain which one appears to take the more data-minimising approach, and what evidence you're relying on."
```

Key words (book p.14) are distributed across sessions' `study.keywords`: personal data, volunteered data, observed data, inferred data, cookies, tracking, web scraping, public / private data, data minimisation, consent, GDPR, EU AI Act, representativeness. Every one must appear at least once.

## Sessions (ids fixed; minutes sum to 180)

| id | title (book label) | min | type | activity.kind |
| --- | --- | --- | --- | --- |
| b3s1 | Data trail warm-up | 15 | PREDICT + DISCOVER | `quiz`, 8 items, options `Volunteered`/`Observed`/`Inferred`, examples from book p.15 (name, playlist name, a like, a search; how long you watched, where you were, what you skipped; your mood, age range, what you'll buy, who you know) |
| b3s2 | Data Tracking Sherlock | 25 | TRY + INVESTIGATE | `lab` |
| b3s3 | Why collect it? | 25 | TEST | `chain` (new kind) |
| b3s4 | Cookies, scraping and the fairness challenge | 45 | INVESTIGATE + BREAK | `dataset` |
| b3s5 | Your rights and the safeguards | 25 | DISCOVER + QUESTION | `textfields`, 4 fields |
| b3s6 | Design a better data plan | 45 | IMPROVE + EVIDENCE | `textfields`, 9 fields |

Every session keeps `intro`, `study{title, body[3], example, keywords}`, `reflection`. Study text is written for a 15–16 year old from the book's own explanations (p.14–16) and the docx facilitator moves; the book's "Think about it" questions (p.16) become the four `reflection` prompts for b3s2–b3s5; b3s6's reflection is the book's: "Just because data is available, does that mean it should be used? Take a position and back it with one concrete example from today."

**b3s2 lab.** `tool: { name: "your chosen service's privacy policy or app-store listing", url: "https://www.google.com/search?q=privacy+policy", free: true }`, `privacy` (book p.15 "Investigate at category level only" as the first note, verbatim; then: never open, screenshot or share your own or anyone else's account data; no accounts; nothing typed here is sent anywhere but this portal), `steps` (5: choose one familiar music, video or maps service; open its privacy policy or app-store data listing; list the categories it says it collects; note anything surprising; note anything vague such as "to improve our services"), `fallback: { title: "No policy to hand?", steps: [use the three sample policy extracts below, …] }`, `fields` (4: the service I audited; data categories it says it collects; something surprising; something vague, and what it might cover), `downloads` (three sample policy extracts, see files). Evidence label: "Data category audit".

**b3s3 chain.** New activity kind, a generalised day-map:

```json
{ "kind": "chain", "title": "Why collect it?", "instructions": "For five data categories you found, complete the chain. Be fair: some collection is genuinely useful. Some isn't.", "columns": [["category","Data category"],["purpose","Purpose"],["benefit","User benefit"],["risk","Possible risk"]], "rows": 5, "minRows": 5, "head": "COLLECTION → PURPOSE → USER BENEFIT → POSSIBLE RISK" }
```

`app.js` renders it like `daymap` but with `a.columns` (key, label) instead of the fixed six; state shape `state.activity[sid][rowIndex][key]`; `activityReady`: at least `minRows` rows with every column filled. Admin `activityLabel` returns `Chain row <n>`. The existing `daymap` kind is untouched.

**b3s4 dataset.** The existing `dataset` kind and `club-signups-flawed.csv` stay; this is the book's "dataset fairness challenge" with the club-recommendation scenario the book names, plus the review document's integrity lab. Study text covers cookies, tracking and web scraping (book p.16 mini-lab: "if something is publicly visible, is every reuse of it reasonable?") and "who is missing?" `issueTypes`: ["Missing value", "Inconsistent format", "Duplicate", "Sensitive or unnecessary field", "Inferred, not collected", "Who is missing (representation)", "Suspicious value"]. `minFindings` 6, and `activityReady` additionally requires at least one finding of type "Who is missing (representation)" (new optional `requiredIssues: ["Who is missing (representation)"]` on the activity, enforced generically). Downloads: flawed CSV, fairness scenario cards.

**b3s5 textfields** (GDPR and EU AI Act, book p.16 "Discover: your rights and the safeguards", plain language, no legal detail): "For my service: the clear purpose its data is collected for…", "What it collects that goes beyond that purpose (minimisation)…", "Which rights I would use and why: see it, correct it, delete it…", "How risky the club-recommendation system is under the EU AI Act idea 'the riskier the use, the stricter the rules', and why…".

**b3s6 textfields**, the eight Sheet A5 questions verbatim (docx Appendix A5) in order, then a ninth: "My better data plan, before → after: fields removed, representation check added, how long data is kept, decisions that need a human…". Downloads: Responsible Data Card template (updated to A5's eight questions plus an optional "Integrity" section from review doc section 6: quality, provenance, limitations), cleaned dataset template.

## Chapter page additions (`app.js`, `index.html`, `styles.css`)

After the lab banner, render for any block that has them: a "Myth-busters" section (two-column "People say / Actually" rows), and in the capstone card, before the prompts, a "How am I doing?" self-check as three labelled lists and the level-up challenge as a marked optional paragraph. Blocks without these fields render nothing new. Chapters 1–2 are unchanged in this phase.

## Files (`scripts/generate-datasets.mjs`, deterministic)

- `public/datasets/privacy-policy-extracts.txt`: three fictional services (a music app, a maps app, a photo-sharing app), each with a short "data we collect" extract of 8–12 categories mixing volunteered, observed and inferred data, at least one vague purpose ("to improve our services") and one surprising category. No real company names.
- `public/datasets/fairness-scenario-cards.txt`: the book's three scenarios (school club recommendations, job shortlisting, transport planning), each with "Decide what data you'd collect" and the book's "who is missing?" prompts (students who joined mid-year, people without smartphones, those who work nights).
- `public/datasets/responsible-data-card-template.md`: replaced with A5's eight questions plus the optional integrity section.
- Existing `club-signups-flawed.csv`, cleaned template and teacher key stay; the key moves nowhere.

## Capstone (`lib/chapter-capstone.mjs`)

`CAPSTONES.block3` keeps id `block3-capstone`, retitled "Responsible Data Card review": the brief describes a second service (a homework-help app that logs every question asked and infers each student's ability band) and the three prompts follow the docx descriptors: (1) what it collects, what it observes and what it infers, and why each is or is not needed; (2) who could be missing or misrepresented and what could go wrong for them; (3) what should not be collected at all, what should need human review, and why "public" or "consented" does not settle it. Block3-only vocabulary added to the scoring regexes: `gdpr`, `consent`, `minimis`, `retention`, `cookie`, `tracking`, `scraping`, `represent`, `inferred`, `observed`, `volunteered`, `purpose`, `public`. Chapters 1–2 scoring unchanged.

## Project brief (`lib/project-briefs.mjs`)

`block3` retitled "Responsible Data Investigation", role "Junior Data Analyst", client "School Activities Office", objective from the book mission, acceptance criteria from the docx descriptors and the four portfolio items, deliverables: "Data category audit", "Collection → purpose → benefit → risk chains", "Dataset fairness findings", "Better data plan: before and after", "Responsible Data Card (Sheet A5)", "Final recommendation". `labEvidenceItems` already imports every lab-stage session, so the chain and dataset summaries flow in; `summariseActivity` gains the `chain` kind (rows joined as `category → purpose → benefit → risk`).

## Server

`requiredSessions.block3 = ['b3s1','b3s2','b3s3','b3s4','b3s5','b3s6']`.

## Tests

- `tests/data-detective.test.mjs` rewritten to this contract: outcomes, ids, minutes, kinds, every book key word present, myths/selfCheck/levelUp present, A5 questions verbatim in b3s6, `chain` renderer and ready rule, `requiredIssues` enforced, server list, capstone vocabulary block3-only.
- `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`: keep green; add the two new downloads.
- Acceptance (`tests/acceptance/*`): `CHAPTER3_SESSIONS` gets six ids; UI acceptance and live walkthrough drive b3s3 chain (fill 5 rows × 4 inputs `input[data-i][data-f]`), b3s4 dataset with a "Who is missing (representation)" finding, b3s5 and b3s6 textfields; check the myth-busters section and self-check render.

## Docs

`docs/releases/phase-4-chapter-3.md` gains a "4b — realigned to the Student Book" section; README pilot-features line says Chapter 3 follows Student Book pp. 14–17; ROADMAP Phase 4 exit criterion "outcomes map to the official curriculum source" marked met.

## File ownership

| Agent | Owns |
| --- | --- |
| content | `curriculum.json`, `scripts/generate-datasets.mjs`, `public/datasets/*`, `docs/teacher/*`, `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`, `docs/releases/phase-4-chapter-3.md`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `index.html`, `styles.css`, `admin.js`, `lib/chapter-capstone.mjs`, `lib/project-briefs.mjs`, `tests/chapter-capstone.test.mjs`, `tests/data-detective.test.mjs` |
| workspace-api | `project-workspace.js`, `functions/api/[[path]].js`, `tests/project-workspace*.test.mjs`, `tests/acceptance/*` |

Selector ids the UI must render and the acceptance scripts use: chain inputs `input[data-i][data-f]` inside `.chain`; dataset form `#datasetTarget`, `#datasetIssue`, `#datasetNote`, `#datasetAdd`, list `.dataset-findings`; myths section `#mythBusters`; self-check `.self-check`; level-up `.level-up`.
