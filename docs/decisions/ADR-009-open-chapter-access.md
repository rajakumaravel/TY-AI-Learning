# ADR-009 — Open chapter access

**Status:** Accepted (2026-09-22). Supersedes the progression gate in [ADR-004](ADR-004-chapter-capstone-assessment.md) §Decision and the previous-chapter server gate recorded in [ADR-007](ADR-007-cloudflare-supabase-platform.md) §Hardening.

## Context

Chapters ran strictly in order. A chapter opened only when the previous chapter's sessions were all complete **and** its capstone had been submitted, and a chapter capstone could only be submitted once every session in that chapter was complete. The rule was enforced twice: in `app.js` for the cards and the route, and in `functions/api/[[path]].js` with a 409 on the chapter capstone, the project save and the project submit.

In a training-centre room that turns a local problem into a whole-programme stop. A blocked tool, a broken camera, a missing dataset or an absence in one session leaves the learner with nothing else to work on, because everything after that point is shut. The pilot cohort hit this in Chapter 2, where the Experience Lab depends on a third-party tool and a camera.

## Decision

Every chapter and every project workspace is open from the start, in any order.

- No chapter requires the previous chapter.
- No chapter capstone requires that chapter's own practical sessions to be marked complete.
- A badge is still earned only by submitting that chapter's capstone, and the automated level still comes from the submitted answers. Nothing is awarded for opening a chapter.
- The server still derives `chapterAssessments` from the `chapter_assessments` table and still discards forged qualifications in a learner's progress `PUT`. Removing the gate removes a prerequisite, not the record.

## Consequences

- A learner stuck in one chapter carries on in another and returns later. The evidence trail stays per chapter, so a coordinator still sees exactly which chapters carry submitted work.
- A capstone can now be submitted with thin or no practical evidence behind it. The rubric evaluates the submitted answers only, so a badge no longer implies the chapter's sessions were completed first. Teacher review remains the authoritative judgement and is where that is caught.
- The recommended order is still the Student Book order; the home cards show progress and badges, not permission.
