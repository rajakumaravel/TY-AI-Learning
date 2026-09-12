# ADR-008 — Portfolio export and pilot analytics: what may leave the system, and what may not

- **Status:** Accepted
- **Date:** 2026-09-12
- **Programme:** AI in Practice — Transition Year pilot
- **Governs:** Phase 10 (Portfolio, School Reporting and Pilot Analytics)

## Context

Every phase so far has kept student work inside the portal, where one learner sees only their own data and admin reads are server-authorised. Phase 10 changes that in two ways at once. It produces an **export**, which is a file that leaves the system and can be forwarded, printed and stored anywhere. And it produces **analytics**, which is the first feature that looks across learners rather than at one.

The learners are Transition Year students, so some are minors. The cross-cutting requirements already say to minimise personal data "especially because users may be minors", and Chapter 3 teaches those students data minimisation, purpose limitation and the right to see and delete their own data. A portal that teaches that and then exports more than it needs would fail its own curriculum.

What the system holds today is already modest. `learners` has a `display_name` (defaulting to "Student"), a creation and last-login timestamp, and a legacy identity column. Everything else is work: progress state, reflections, activity evidence, formative and chapter assessments, and project workspaces. Email lives only in Supabase Auth and reaches the API to check the admin allowlist and to derive a fallback display name. No date of birth, class, school, address, phone number or photo is collected anywhere, and nothing in Phase 10 may start collecting them.

Two facts matter for what follows. Free-text fields can contain anything a student typed, including a name they mentioned in a reflection. And `reviewed_by` currently stores a teacher's auth user id.

## Decision

### 1. The export is the student's work, and the student owns it

A learner can export their own portfolio at any time, without asking staff. The export is a self-contained file the student can keep. It carries:

- their display name, the programme name, and the date of export;
- per chapter: the badge, the chapter assessment level, their reflections, their activity evidence and their project deliverables;
- their own words, in full, because the work is the point.

It does not carry: email address, auth user id, IP address, login timestamps, device or browser information, or any identifier that is useful for matching this student to a record in another system. The display name is included because the student chose it and needs it on their own portfolio; everything else in that list exists for the platform's benefit, not the student's.

### 2. The coordinator summary is narrower than the student portfolio

A TY coordinator needs to record that a student completed the programme and at what level. That is a different, smaller need than the student's own evidence pack, and it gets a different artefact: chapters completed, badges earned, assessment levels, and the date. **No free-text student writing.** A reflection is the student's thinking, not a record for a school file, and it is the field most likely to contain an unplanned third-party detail.

If a coordinator wants to read the work itself, the student shares their own portfolio. That keeps the student in the loop about who reads their words, which is the habit Chapter 6 asks them to build about disclosure.

### 3. Analytics are aggregate, and never a per-student dashboard

The roadmap's list is deliberately about the product: completion, resubmission and improvement, chapter drop-off, agreement between the automatic level and the teacher's, Experience Lab completion, and qualitative feedback. Every one of those is answerable from counts and distributions.

Therefore: analytics queries return aggregates only, never rows identifying a learner, and the analytics view carries no display names and no way to pivot to an individual. Where a cohort is small enough that an aggregate identifies someone — the realistic case in a pilot — the figure is suppressed rather than shown. **A cell counting fewer than five learners is not displayed.** This is not a statistical nicety; with one group of students, "one learner dropped off at Chapter 3" names a person to anyone in the room.

Qualitative feedback is quoted only where the student's own words are not identifying, and never attributed.

The existing per-learner admin view is unchanged and is not analytics. It exists so a teacher can review and assess one student's work, it is server-authorised, and it stays that way.

### 4. Assessment agreement is measured without exposing the assessor

Comparing the system's suggested level with the teacher's is a calibration measure about the scoring, not about the teacher. It is reported as a distribution over levels with no `reviewed_by` value in the output. Teachers should be able to disagree with the scorer freely; a feature that counted disagreements per named teacher would quietly discourage exactly the human override the whole programme depends on.

### 5. Deletion means the export stops too

A learner can already have their data deleted, and `on delete cascade` removes their work. Phase 10 adds no store that survives that: no exported-copies table, no analytics table holding per-learner rows, no cached portfolio. Aggregates already computed may persist because they identify nobody.

### 6. The export is honest about what it is

The portfolio is formative evidence from a pilot, not a certified qualification, and the file says so. The assessment levels come from a keyword-based scorer with teacher override, which is useful for a conversation and not a grade to defend. Chapter 5 spends an hour teaching students that confident presentation is not evidence; the portal's own output must not fail that lesson.

## Consequences

- The student export and the coordinator summary are two artefacts, not one with a flag. That is more work and is the point: the narrower one cannot accidentally widen.
- The five-learner suppression rule will hide most cells in a small pilot. That is the correct outcome, and the analytics view says when a figure is suppressed rather than rendering a misleading blank.
- Nothing in Phase 10 needs a new personal-data column. If an implementation appears to need one, that is a signal to revisit this record, not to add the column.
- Tests must assert the absences: that no export contains an email, an auth id or a login timestamp, that the coordinator summary contains no free text, and that a small cohort is suppressed. Absence is the requirement here, so it has to be tested directly.

## Alternatives considered

**One export with a "include reflections" switch.** Rejected: the safe default survives only until someone ticks the box out of habit, and the coordinator's need genuinely does not include the student's writing.

**Per-student analytics for teachers.** Rejected: it duplicates the existing review view and turns a product measure into monitoring of individuals.

**No suppression threshold, on the grounds that staff already know the students.** Rejected: the analytics view is the artefact most likely to be screen-shared or exported onward, and the students are minors.
