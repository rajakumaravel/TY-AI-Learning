# Phase 2 — Experience Labs for Chapters 1–2

**Status:** in progress on `phase2-experience-labs`; verified on Cloudflare Pages Preview only. Production is deferred until all phases are accepted (ADR-007).

## Slice 1 — server-side progression (done)

Chapter unlock was decided in the browser from a field the learner's own progress save could set. The API now derives `chapterAssessments` from the `chapter_assessments` table on every state read and write, and returns 409 for a Chapter 2 capstone, project save or submit until Chapter 1 is qualified.

## Slice 2 — Experience Labs (done)

- Each chapter declares a `lab` with the six ADR-005 stages (DO, TEST, MAKE, BREAK, IMPROVE, PROVE), each mapped to a session. The chapter page shows the stages with completion state and jumps to the session.
- New activity kind `lab`: safety and privacy notice that must be acknowledged before the external link is enabled; a fallback activity for when the tool is blocked or offline; structured evidence fields.
- **Chapter 1** gains session `b1lab`, "Can AI recognise what I draw?", built on Quick, Draw! (free, no account). Evidence fields: prediction, what the AI did, an unexpected result, what changed when the input changed, and evidence. Chapter 1 stays at 120 minutes; the hook and two later sessions were shortened.
- **Chapter 2**'s Teachable Machine session is now the canonical lab (train v1 → test log → confusion matrix → shortcut experiment → v2 → compare).
- The chapter capstone shows the learner's own lab evidence above the prompts.
- The Chapter 2 Project Workspace can import lab evidence (test log summary, confusion matrix with accuracy, shortcut and v2 notes) as evidence items.
- Admin review labels lab evidence fields.

## Verification

- `npm run check`: unit tests and production build.
- `npm run acceptance` against the branch preview: API and browser checks, including the lab banner, safety gate and fallback.

## Not in this phase

- No file uploads; evidence remains links and text (ADR-006).
- Chapter 2 project acceptance still relies on the learner choosing to import lab evidence; it is not forced.
