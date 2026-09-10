# AI in Practice — Product operating model

**Status:** Locked baseline for pilot evolution  
**Date:** 2026-09-10

## Product purpose

AI in Practice is a **self-guided, project-based Transition Year AI learning and work-experience platform**.

It is not designed around instructor-led teaching. The product itself provides structured guidance while students learn through practical missions, projects, experimentation, evidence, reflection, assessment, and improvement.

The core product principle is:

> **The platform teaches by work, not by instruction.**

The curriculum remains aligned to the official Exploring AI learning outcomes, but the product experience should feel closer to supervised junior project work than to an online textbook.

## Roles

### Student

The student is the primary actor. They:

- receive a mission or project brief;
- read concise just-in-time guidance;
- use a free/student-friendly tool or built-in simulation;
- perform practical work;
- record decisions, observations, failures and evidence;
- submit work products;
- receive formative feedback;
- improve or resubmit where appropriate;
- complete an applied chapter capstone;
- build a portfolio of evidence.

### Teacher / TY coordinator

The teacher is not assumed to deliver AI instruction. The role is intentionally lightweight:

- provide/approve access;
- monitor progress;
- review student submissions where needed;
- inspect or override automated formative assessments;
- add occasional comments;
- confirm programme completion where required by school process.

### Platform

The platform provides passive guidance and workflow orchestration:

- mission briefing;
- concise study material;
- activity instructions;
- hints and checkpoints;
- evidence requirements;
- work-log/project structure;
- formative feedback;
- chapter-capstone assessment;
- progress and badge gating;
- portfolio assembly;
- teacher/admin visibility.

## Learning loop

The canonical student loop is:

```text
MISSION
  ↓
PREDICT / PLAN
  ↓
DISCOVER only what is needed
  ↓
TRY
  ↓
TEST
  ↓
CAPTURE EVIDENCE
  ↓
IMPROVE
  ↓
REFLECT
  ↓
FORMATIVE FEEDBACK
  ↓
SUBMIT / CAPSTONE
```

No passive content segment should dominate the experience. Content exists to enable action.

## Weekly / school-hours model

The product must support schools that allocate fixed TY hours in a week without assuming an instructor is present.

Example delivery pattern:

```text
Fixed TY AI slot (e.g. 2 hours/week)
  ↓
Student enters current mission
  ↓
Guided self-directed work in portal
  ↓
Student continues project independently during other available TY/project time
  ↓
Evidence/result submission
  ↓
Assessment + feedback
  ↓
Next mission / chapter progression
```

Scheduling must eventually be configurable by cohort. The system must not hard-code a particular day, hour count, or school timetable.

## 30-hour programme model

The existing 30-hour curriculum remains the scope. Delivery should distinguish between:

- **guided self-directed project learning** — structured missions and Experience Labs delivered through the product; and
- **independent project extension** — additional student work, investigation, testing, artefact creation, or project continuation.

The product must not describe this as instructor-contact time unless a school explicitly uses it that way.

## Experience Lab requirement

Every chapter must include at least one Experience Lab. See ADR-005.

The chapter must allow the student to do, test, make, break, improve, and/or prove something. Purely passive reading plus questions is not sufficient.

## Project-work model

Projects are first-class learning objects, not attachments to a lesson.

A project/work item should ultimately support:

```text
Project
├── brief
├── role
├── client/scenario
├── objective
├── acceptance criteria
├── deliverables
├── due date / target week
├── work log
├── evidence
├── files / links
├── decisions
├── blockers
├── reflection
├── student submission
├── assessment
└── teacher/mentor feedback
```

The product should progressively evolve toward this structure rather than a lesson-question-only data model.

## Assessment model

Assessment has two layers:

1. **Session feedback** — formative coaching after practical evidence/reflection; does not gate progression.
2. **Chapter capstone** — applied competency check after all chapter practical work is complete; submission/evaluation gates the badge and next chapter.

Automated assessment is formative in the pilot. Teacher judgement is authoritative and is stored separately from automated suggestions.

The assessment system must evaluate the work produced by the student, not replace the work with extra questions.

## Portfolio model

The end product for the student is a body of applied evidence, not merely a completion certificate.

Expected portfolio categories include:

- AI system audit / AI in My Day map;
- trained/tested model evidence;
- test log and confusion matrix;
- dataset audit / Responsible Data Card;
- prompt experiment and verification record;
- bias/misinformation investigation;
- AI-assisted workplace workflow;
- future AI decision analysis;
- final AI innovation project and presentation.

## External-tool policy

Third-party tools are acceptable when they are free/student-friendly and improve the experience. They must not become required paid dependencies.

Preferred strategy:

- use excellent free browser tools when available;
- embed clear safety/privacy guidance;
- capture evidence back in AI in Practice;
- build our own small simulator when external tooling creates account, cost, privacy, age or complexity barriers;
- keep the curriculum independent of any vendor.

## Product guardrails

The following are anti-patterns and require explicit justification before implementation:

- long passive lessons;
- conventional LMS page-after-page progression;
- assessment dominating practical work;
- marks based on writing sophistication rather than AI understanding;
- mandatory paid accounts;
- teacher-dependent instruction for core learning;
- exposing student personal data unnecessarily;
- unlocking chapters without required practical evidence and capstone submission;
- badges awarded for clicks rather than demonstrated work.

## Definition of a successful student experience

A student finishing a chapter should be able to show an artefact or evidence and say:

> **I tried something, I saw what happened, I found a problem or insight, I changed or evaluated something, and I can explain my decision using evidence.**

If the product cannot produce that experience, the chapter or feature needs redesign.
