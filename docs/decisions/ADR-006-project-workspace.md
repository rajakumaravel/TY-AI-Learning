# ADR-006 — Project Workspace as first-class learner evidence

- **Status:** Accepted
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

The portal already captures session activities, reflections, formative feedback and chapter capstones. That is useful for guided learning, but it does not yet give students a durable place to manage work like a small real-world project across multiple visits.

The product operating model requires students to learn by doing practical work, not by consuming lessons. Project work therefore needs to become a first-class object rather than another long lesson form.

## Decision

Introduce a reusable **Project Workspace** with Chapter 2 as the reference implementation.

A project contains:

- role;
- client/scenario;
- objective/mission;
- acceptance criteria;
- deliverables;
- work-log entries;
- decisions and blockers;
- evidence links/notes;
- final submission/recommendation;
- lifecycle status: `not_started`, `in_progress`, `submitted`, `reviewed`.

Student project data is stored separately from lesson progress in Netlify Postgres. Student APIs always derive the learner identity from Netlify Identity and never accept another learner ID. Admin project APIs require the existing server-side admin authorisation model.

## Submission integrity

Submitting a project creates an immutable-at-that-time `submitted_snapshot` of the current workspace. A student may continue editing their working copy later, but the admin view can always inspect exactly what was submitted at the most recent submission point. Resubmission replaces the submitted snapshot with the new submitted version.

## Reference project — Chapter 2

**Role:** Junior ML Test Engineer  
**Scenario:** A school AI lab needs evidence that a two-class visual classifier works beyond its training conditions.  
**Mission:** Train model V1, test unseen examples, deliberately find failure conditions, diagnose likely shortcut learning, improve the data/model, retest fairly, and make a recommendation.

Required evidence:

1. model setup and training conditions;
2. test evidence from unseen examples;
3. confusion-matrix / error evidence;
4. identified failure or shortcut pattern;
5. V1 → V2 improvement evidence;
6. final recommendation and remaining limitation.

## Guardrails

- The workspace is not a punitive timesheet. Optional duration is for learner planning/reflection only.
- Do not collect unnecessary personal data.
- No personal paid account is required by the workspace itself.
- Project assessment/review supports the work; it does not replace the hands-on Experience Lab.
- Teacher/admin review is visible but the student's original submitted evidence is preserved.
- No student can request another student's project through the student API.

## Phase 1 exit criteria

Phase 1 is complete only when a signed-in learner can open the Chapter 2 brief, save work across visits/devices, submit it, and an authorised admin can inspect the exact submitted snapshot. Automated regression tests and the production build/deployment must pass.