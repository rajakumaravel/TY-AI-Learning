# Chapter contract template

Copy to `docs/product/phase-<n>-contract.md`, fill every `<…>`, delete this first paragraph. Everything outside the "Chapter-specific" section is standing policy and is the same for every chapter; agents read it but you do not rewrite it.

Sources, in precedence order: `docs/source/student-book.txt` pages <a>–<b>, `docs/source/curriculum-pilot-v1.txt` section "<n>. Block <k>" and the Appendix A sheets it names, then `docs/source/curriculum-review-data-integrity.txt` where the ROADMAP adopts it. Quote the book where this contract says verbatim.

Deployment context: the portal runs in a third-party training centre, not a school. Where the book says "school-approved" or "your teacher", portal copy says "the tool named here" or "the training centre". Book text quoted as the book stays verbatim.

## Chapter-specific

```text
id: block<k>   number: "0<k>"   title: "<book title>"   duration: "<h> hours" (sessions total <min> min)
badge: "<book badge>"   outcomes: [<LOs from the docx block-to-LO matrix>]   pageRef on every session: "Student Book pp. <a>–<b>"
description: book opening paragraph, shortened to two sentences in the same words.
mission: verbatim from the book's "Your mission".
route: the book's timed segments, verbatim labels.
final: the book's "For your portfolio" evidence list as one sentence.
lab: { title: "<ADR-005 lab name>", summary: "<one sentence>", stages: [["DO",sid,label],["TEST",sid,label],["MAKE",sid,label],["BREAK",sid,label],["IMPROVE",sid,label],["PROVE",sid,label]] }
myths: the book's Myth-busters pairs, verbatim.
selfCheck: the book's "How am I doing?" statements grouped Getting started / Getting there / Going further, matched to the docx Emerging / Developing / Extending descriptors.
levelUp: the book's optional challenge, verbatim.
```

Key words (book "Key words"), each in at least one session's `study.keywords`: <list>.

Tool (if any session opens an external tool): <name, url, why it is free and needs no account>; fallback <name, url>; second fallback is always a sample download. Safety notes: the four standing notes below unless the chapter needs a fifth.

### Sessions (ids `b<k>s1`…; minutes sum to the chapter total)

| id | title (book label) | min | type | activity.kind |
| --- | --- | --- | --- | --- |
| b<k>s1 | … | … | … | … |

Per-session notes only where the shape is not obvious from the kind: field labels for `textfields`, columns/rows/head for `chain`, versions/fields/builder/extras for `prompt`, items/options for `quiz`, file/issueTypes/minFindings/requiredIssues for `dataset`, tool/privacy/steps/fallback/fields for `lab`. Which "Think about it" question is which session's reflection.

### New activity kind (only if the book needs one)

Name, curriculum JSON shape, render description, state shape, `activityReady` rule, admin label, `summariseActivity` line, selector ids for the acceptance scripts.

### Files (`scripts/generate-datasets.mjs`, deterministic, `public/datasets/`)

<file>: <contents and purpose>. Teacher keys go to `docs/teacher/`, never `public/`.

### Capstone (`lib/chapter-capstone.mjs`)

`CAPSTONES.block<k> = { id: "block<k>-capstone", title, brief: <a second, different scenario in prose>, prompts: [3, following the docx Emerging / Developing / Extending descriptors] }`. Block-only vocabulary for the scoring regexes: concept <…>, action <…>, scenario-evidence <…>. Earlier chapters' scoring unchanged.

### Project brief (`lib/project-briefs.mjs`)

`block<k>`: title, role, client "Training centre <team>", objective from the mission, acceptance criteria from the docx descriptors, deliverables from the book's portfolio evidence plus "Final recommendation".

## Standing policy (same for every chapter)

**Activity kinds available:** quiz, textfields, daymap, lab, testlog, matrix, dataset, chain, prompt. Reuse before inventing.

**Safety notes for any session that opens an AI or external tool** (rendered with an acknowledgement-gated link on every such session, not only the first): "Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them." · "No accounts. <tool> works without signing in; if a tool asks you to sign in, stop and use the fallback." · "The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked." · "Nothing typed into this portal is sent to the tool; copy across yourself and paste short extracts back here."

**Server:** `requiredSessions.block<k>` lists every session id; `blockOrder` derives from it, so the chapter's capstone and project writes return 409 until the previous chapter is qualified.

**Chapter page:** lab stages, myth-busters (`#mythBusters`), self-check (`.self-check`), level-up (`.level-up`) and downloads render from the block fields; nothing new to build unless the kind is new.

**Study text:** written for a 15–16 year old from the book's own explanations, three body paragraphs, an example that does not hand over the session's own answer, keywords from the book list.

**Ready rules:** minimum lengths must be satisfiable by a plain honest answer (a service name, "none", a single claim). Never a flat 12-character minimum on a name field.

**Tests:** `tests/v21.test.mjs` chapter list and durations; a new `tests/<chapter-slug>.test.mjs` asserting the block shape, key words, book fields, new kind renderer and ready rule, server list, capstone vocabulary gating, downloads on disk and key outside `public/`; `tests/experience-labs.test.mjs` and `tests/lab-datasets.test.mjs` stay green. Acceptance: `CHAPTER<k>_SESSIONS`, `CAPSTONE<k>_ANSWERS`; API acceptance covers the gate from the previous chapter; UI acceptance and live walkthrough drive every session with real clicks; `ui-audit.mjs` screenshots any new kind.

**Docs:** `docs/releases/phase-<n>-chapter-<k>.md`, README pilot-features line, ROADMAP current-work pointer.

**File ownership:**

| Agent | Owns |
| --- | --- |
| content | `curriculum.json`, `scripts/generate-datasets.mjs`, `public/datasets/*`, `docs/teacher/*`, `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`, `docs/releases/*`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `index.html`, `styles.css`, `admin.js`, `lib/chapter-capstone.mjs`, `lib/project-briefs.mjs`, `tests/chapter-capstone.test.mjs`, `tests/<chapter-slug>.test.mjs` |
| workspace-api | `project-workspace.js`, `functions/api/[[path]].js`, `tests/project-workspace*.test.mjs`, `tests/cloudflare-runtime.test.mjs`, `tests/acceptance/*` |

**Selector contract:** lab `[data-ack]`, `#labToolLink`, `textarea[data-i]`; quiz `select[data-i]`; textfields `textarea[data-i]`; daymap and chain `input[data-i][data-f]`; dataset `#datasetTarget #datasetIssue #datasetNote #datasetAdd .dataset-findings`; prompt `.prompt-lab [data-builder] #composeV2 textarea[data-version][data-field] textarea[data-extra]`; capstone `textarea[data-capstone] #submitCapstone`; workspace `#projectWorkspaceBtn[-block<k>] #pwImportLab #pwAddLog #pwSave #pwSubmit .pw-status`. A new kind adds its ids here before agents start.
