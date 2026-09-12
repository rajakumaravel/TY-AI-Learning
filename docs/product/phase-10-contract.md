# Phase 10 contract — Portfolio, School Reporting and Pilot Analytics

The last roadmap phase, and the only one that is not a chapter. Sources: `ROADMAP.md` section "Phase 10", the cross-cutting requirements at the end of that file, and **`docs/decisions/ADR-008-portfolio-export-and-pilot-analytics.md`, which is binding**. Where this contract and ADR-008 appear to disagree, ADR-008 wins and the disagreement is a bug in this contract.

This phase has no curriculum content, no new chapter and no new activity kind. It turns work the portal already holds into three artefacts, and it is the first phase where data leaves the system and where anything looks across learners.

## What already exists

The portfolio view lists, per chapter, the mission, the badge, and each completed session's reflection. Progress, activity evidence, formative and chapter assessments and project workspaces are all stored per learner and already reachable through authorised APIs. The admin surface is `admin/me`, `admin/students`, `admin/student/<id>`, `admin/assessment/<id>/<session>` and `admin/chapter-assessment/<id>/<block>`.

Nothing in this phase adds a personal-data column. If an implementation appears to need one, stop and revisit ADR-008 rather than adding it.

## The three artefacts

### 1. Student portfolio export (the learner's own work)

A learner exports their own portfolio at any time, with no staff involvement, from the existing Portfolio view. One file, self-contained, openable without the portal.

**Format:** a single HTML file, styled for reading and for printing to PDF from the browser. Not JSON, which a student cannot read, and not a zip, which a coordinator cannot open on a phone. The stylesheet is inlined so the file works offline and forever.

**Contains:** display name; programme name; export date; overall completion; and per chapter the badge, the chapter assessment level (teacher level where one exists, otherwise the suggested level, labelled as which), every reflection in full, every activity evidence item through its field or column labels, and the project deliverables and final recommendation where a project exists.

**Never contains:** email address, auth user id, `reviewed_by`, login or last-seen timestamps, IP address, device or browser information, or any other identifier useful for matching the student to a record elsewhere. ADR-008 §1.

**Carries a standing note**, in the file: this is formative evidence from a pilot, the suggested levels come from a keyword-based scorer with teacher override, and it is not a certified qualification. ADR-008 §6.

Built entirely client-side from state the learner already has. No new endpoint, because no new endpoint is needed and every one added is another thing to get wrong.

### 2. Coordinator summary (the school record)

A separate, deliberately narrower artefact, produced from the same view by a different control, clearly labelled as the one to hand in.

**Contains:** display name, programme name, date, chapters completed, badges earned, assessment levels, and the overall completion figure.

**Contains no free-text student writing at all.** No reflections, no activity evidence, no project text, no capstone answers. ADR-008 §2. A test asserts this by generating a summary from a fixture whose every free-text field holds a marker string, then asserting the marker appears nowhere in the output.

Two artefacts, not one with a switch. ADR-008 §2 and its rejected alternative.

### 3. Pilot analytics (does the product work)

A new admin-only view at `/admin`, alongside the existing student list, answering the ROADMAP's six questions:

| Measure | Shape |
| --- | --- |
| Completion | learners at each chapter-completion count |
| Resubmission and improvement | distribution of level changes between the suggested and the teacher level |
| Chapter drop-off | learners whose last completed session falls in each chapter |
| System-vs-teacher agreement | matrix of suggested level against teacher level |
| Experience Lab completion | learners completing each chapter's six lab stages |
| Qualitative feedback | short non-identifying quotations, unattributed |

**Aggregates only. No learner rows, no display names, no way to pivot from a figure to a person.** ADR-008 §3. The existing per-learner review view is unchanged and is not part of this; it is how a teacher assesses one student's work.

**Suppression: any cell counting fewer than five learners renders as "suppressed (fewer than 5)", not as a blank and not as a zero.** ADR-008 §3. In a pilot this will hide most cells, which is the correct outcome; the view explains the rule once, at the top, so a reader does not mistake suppression for missing data.

**The agreement matrix carries no `reviewed_by` value and names no teacher.** ADR-008 §4.

Qualitative feedback is the exception that needs care: it is student writing. Only the chapter-8 individual reflection and the exit-rule fields are eligible, only where the text names no person and no place, and never with a learner attached. If that cannot be done safely with the pilot's data, ship the view without quotations and say so.

**Server:** one new endpoint, `admin/analytics`, behind the existing admin authorisation, returning only aggregates with suppression already applied server-side. Suppression is not a rendering concern: an endpoint that returns a count of two and lets the page hide it has already disclosed it.

**Storage:** none. Computed per request from existing tables. ADR-008 §5 forbids any store that outlives a learner's deletion.

## Tests

Absence is the requirement here, so it is tested directly rather than implied.

- `tests/portfolio-export.test.mjs`: the export contains the work; and given a fixture carrying an email, an auth id, a `reviewed_by` and a login timestamp, the output contains none of them. The coordinator summary contains no marker from any free-text field. Both carry the formative-evidence note.
- `tests/pilot-analytics.test.mjs`: every measure computes correctly on a fixture; a cohort of four suppresses and a cohort of five does not; the suppression happens in the endpoint's own output, not only in the view; no output row carries a learner id, display name or `reviewed_by`; deleting a learner changes the aggregate and leaves nothing behind.
- `tests/cloudflare-runtime.test.mjs`: `admin/analytics` requires admin authorisation, and a student token receives the same rejection as every other admin route.
- Acceptance: a learner exports and the file is well-formed and free of the forbidden fields; an admin sees the analytics view with suppression applied; a student is refused it. `ui-audit.mjs` screenshots the analytics view and a printed export.

## Docs

`docs/releases/phase-10-portfolio-reporting.md`; README feature line; ROADMAP current work → Phase 10 done, and the pilot-acceptance position. Record that Production remains undeployed and is the operator's decision under ADR-007.

## File ownership

| Agent | Owns |
| --- | --- |
| content | `docs/releases/phase-10-portfolio-reporting.md`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `index.html`, `styles.css`, `lib/portfolio-export.mjs`, `tests/portfolio-export.test.mjs` |
| workspace-api | `admin.js`, `admin.css`, `functions/api/[[path]].js`, `lib/pilot-analytics.mjs`, `tests/pilot-analytics.test.mjs`, `tests/cloudflare-runtime.test.mjs`, `tests/acceptance/*` |

Selector contract: export controls `#exportPortfolio`, `#exportCoordinatorSummary`; export document root `.portfolio-export`, its note `.export-note`; analytics view `#adminAnalytics`, each measure `[data-measure="completion|improvement|dropoff|agreement|labs|feedback"]`, a suppressed cell `[data-suppressed]`.
