# AI in Practice — Development roadmap

**Planning baseline:** 2026-09-10  
**Delivery approach:** phase-by-phase; do not start the next phase until exit criteria for the current phase are met.

## Product baseline already established

The original Netlify pilot baseline includes the following implemented capabilities. The migration branch replaces the platform with Cloudflare Pages and Supabase; live acceptance on that stack is tracked in ADR-007:

- Google / Netlify Identity student sign-in;
- persistent learner progress;
- Chapters 1–2 aligned to Student Book v1.0;
- chapter progression and badges;
- session-level formative feedback;
- protected admin dashboard;
- teacher review/override of formative assessment;
- applied chapter-capstone assessment and progression gate;
- production deployment on Netlify.

The next development work must preserve the product principles in `docs/product/operating-model.md`, ADR-003, ADR-004 and ADR-005.

---

# Phase 1 — Project Workspace Foundation

**Goal:** make project work a first-class experience instead of storing all practical evidence inside lesson/session fields.

## Scope

- Introduce a reusable Project Brief data model.
- Add student Project Workspace UI.
- Support:
  - role;
  - client/scenario;
  - objective;
  - acceptance criteria;
  - deliverables;
  - work-log entries;
  - decisions;
  - blockers;
  - evidence links/notes;
  - final submission;
  - status: not started / in progress / submitted / reviewed.
- Add project summaries to admin dashboard.
- Keep project evidence private to the learner and authorised admins.
- Do not require file uploads in the first slice unless needed; links/text/evidence records are sufficient to validate the workflow.
- Add regression tests for student isolation and admin-only review access.

## Pilot implementation target

Use Chapter 2 as the reference project because it already has the strongest practical workflow:

**Role:** Junior ML Test Engineer  
**Mission:** train, test, break, diagnose and improve a two-class model.  
**Deliverables:** model setup record, test log, confusion matrix, failure analysis, V1→V2 improvement evidence and recommendation.

## Exit criteria

Phase 1 is complete only when:

- a signed-in student can open a project brief;
- the student can record work over more than one visit;
- work log and evidence persist across devices;
- the student can submit the project;
- admin can inspect the exact submitted evidence;
- one student's project cannot be read by another student;
- automated tests and production build pass;
- production deployment is verified.

---

# Phase 2 — Experience Labs for Chapters 1–2

**Goal:** make the two pilot chapters demonstrably hands-on and validate the Experience Lab pattern before expanding the curriculum.

## Chapter 1

Implement a free/browser-based recognition or AI-behaviour activity plus the existing AI-system audit. Capture:

- prediction;
- what the AI did;
- unexpected result/failure;
- what changed when the student changed the input;
- evidence/reflection.

Prefer a free external tool such as Quick, Draw! where appropriate; maintain a fallback activity if the external service changes.

## Chapter 2

Formalise the existing Teachable Machine activity as the canonical Experience Lab:

- train model V1;
- test unseen examples;
- deliberately break it;
- record confusion evidence;
- introduce shortcut/background bias;
- improve model V2;
- compare results.

## Exit criteria

- both chapters visibly contain an Experience Lab;
- each lab produces evidence used in project/capstone assessment;
- no paid account is required;
- safety/privacy guidance is shown before external-tool use;
- students can complete the lab with no AI instructor present;
- Chapter 1→2 progression still behaves correctly;
- tests/build/deploy pass.

---

# Phase 3 — Cohort Schedule and Weekly Mission Model

**Goal:** support the real school pattern where TY students have fixed AI/project hours each week but can continue work independently at other times.

## Scope

- Add cohort configuration for:
  - programme start date;
  - preferred training/project day(s);
  - target guided hours per week;
  - independent-project target;
  - programme duration.
- Do not assume instructor-led delivery.
- Add a student **This Week** view showing:
  - current mission;
  - expected work;
  - project status;
  - due/target date;
  - evidence still required;
  - latest feedback;
  - next action.
- Add admin cohort overview.
- Avoid punitive time tracking. Record optional work-log duration for reflection/planning, not surveillance.

## Exit criteria

- schedule is configurable rather than hard-coded;
- students can understand what to work on this week without teacher explanation;
- overdue/unfinished work is visible but not shaming;
- independent work can be continued outside the scheduled slot;
- tests/build/deploy pass.

---

# Phase 4 — Chapter 3: Data Detective

**Goal:** build the first new chapter using the locked Experience Lab standard.

## Experience Lab: Fix a Bad Dataset

Student acts as a junior data analyst and receives a deliberately flawed dataset.

Tasks should include:

- identify missing/inconsistent values;
- detect class/representation imbalance;
- identify unnecessary or potentially sensitive fields;
- distinguish volunteered/observed/inferred data where relevant;
- propose cleaning or collection changes;
- create a Responsible Data Card;
- explain how dataset choices could affect an AI model.

Prefer a built-in browser table/simulator or a simple spreadsheet-compatible flow so no paid software is required.

## Exit criteria

- Chapter 3 outcomes map to the official curriculum source;
- student completes a real dataset investigation;
- evidence is captured in Project Workspace;
- capstone is applied, not recall-based;
- admin review works;
- tests/build/deploy pass.

---

# Phase 5 — Chapter 4: Generative AI & Prompting

**Goal:** teach GenAI through controlled experimentation rather than prompt-theory notes.

## Experience Lab: Make Prompts Compete

Student runs the same task through multiple prompt designs and compares:

- usefulness;
- factual accuracy;
- missing information;
- hallucination/unsupported claims;
- constraints;
- verification needs.

The system should capture prompt versions, outputs/observations, verification and the student's recommendation.

Avoid requiring a personal paid chatbot account. Use a school-approved free tool or a controlled in-product AI playground if/when operationally viable.

## Exit criteria

- repeatable prompt experiment exists;
- output verification is mandatory;
- no assumption that AI output is correct;
- project evidence and capstone use the experiment;
- tests/build/deploy pass.

---

# Phase 6 — Chapter 5: Trust, Bias & Misinformation

**Goal:** let the learner experience bias/failure rather than only read about it.

## Experience Labs

1. **Bias/Data Simulator** — manipulate representation or correlations and observe outcome differences.
2. **Claim Verification Investigation** — trace a claim to primary/independent sources and assign evidence confidence.

Prefer building the bias simulator in-product to avoid external account/privacy dependencies.

## Exit criteria

- learner can create/observe a biased outcome;
- learner changes data/design and compares effects;
- misinformation task requires evidence tracing;
- project/capstone assesses judgement and mitigation;
- tests/build/deploy pass.

---

# Phase 7 — Chapter 6: AI for Learning & Work

**Goal:** simulate realistic junior knowledge-work use of AI.

## Experience Lab: AI-assisted Workplace Task

Provide a realistic brief containing multiple artefacts such as notes, small datasets, requirements or correspondence. The student must:

- decide where AI helps;
- create/use outputs;
- verify factual claims;
- correct errors;
- document human judgement;
- produce a final work product.

## Exit criteria

- activity resembles work rather than a chatbot demo;
- verification is visible and assessable;
- student shows where AI should/should not be trusted;
- tests/build/deploy pass.

---

# Phase 8 — Chapter 7: Our AI Future

**Goal:** teach future/societal impact through decision-making.

## Experience Lab: AI Adoption Decision Simulator

Student acts as an AI Adoption Adviser for a school, hospital, bank, retailer or other scenario and chooses among options such as pilot, human+AI, full automation, or no deployment.

Consequences should expose trade-offs involving:

- value;
- jobs/tasks;
- safety;
- fairness;
- privacy;
- accountability;
- uncertainty.

## Exit criteria

- simulator is branching and evidence-based;
- no single simplistic 'correct' future is presented;
- capstone requires a justified recommendation;
- tests/build/deploy pass.

---

# Phase 9 — Chapter 8: AI Innovation Project

**Goal:** provide a genuine culmination where students solve a problem rather than complete another lesson.

## Project lifecycle

```text
Problem
→ user/stakeholder
→ success criteria
→ data/input plan
→ prototype/experiment
→ testing
→ failure analysis
→ improvement
→ responsible-use check
→ final demo/presentation
→ retrospective
```

Students may choose from approved free tools. The platform should provide templates, milestones and passive guidance rather than prescribe one technology.

## Exit criteria

- project can span multiple weeks;
- milestone/evidence tracking works;
- student produces a demonstrable artefact or validated experiment;
- final portfolio captures the complete project story;
- tests/build/deploy pass.

---

# Phase 10 — Portfolio, School Reporting and Pilot Analytics

**Goal:** turn student work into useful TY evidence and measure whether the product actually works.

## Scope

- Professional student portfolio view/export.
- Chapter evidence summary.
- Project artefacts and reflections.
- Badge/completion history.
- Teacher-reviewed assessment levels.
- TY coordinator summary suitable for school records.
- Pilot analytics focused on learning/process, not surveillance:
  - completion;
  - resubmission/improvement;
  - chapter drop-off;
  - system-vs-teacher assessment agreement;
  - Experience Lab completion;
  - qualitative student feedback.

## Exit criteria

- portfolio demonstrates real work rather than only completion status;
- export contains no unnecessary personal data;
- teacher/system calibration can be measured;
- pilot review determines what changes before wider rollout.

---

# Cross-cutting requirements for every phase

Every development phase must satisfy all of the following before production acceptance:

1. **TY alignment:** supports hands-on, self-directed, project-based learning.
2. **No instructor dependency:** core student flow is understandable without AI instruction from a teacher.
3. **Experience over content:** practical action is primary; reading exists only to enable the task.
4. **Evidence:** meaningful student work is captured.
5. **Privacy:** minimise personal data, especially because users may be minors.
6. **Access control:** students see only their own data; admin access is server-authorised.
7. **Free/student-friendly tooling:** no required paid personal account.
8. **Teacher authority:** automated assessment remains reviewable/overridable.
9. **Regression coverage:** existing chapters/auth/progression/admin flows must not silently break.
10. **Deployment verification:** CI must pass and the exact production commit/database migration must be verified.

## Execution rule

Do not start multiple major phases in parallel. Complete the current phase, verify it with real/pilot usage where appropriate, record findings, then proceed to the next phase.

**Current work: ADR-007 platform migration and Phase 1 production acceptance.**

Phase 1 implementation is merged into `main`; its end-to-end deployment acceptance remains pending. Complete the ADR-007 cutover checklist and record evidence before starting **Phase 2 — Experience Labs for Chapters 1–2**. Do not treat green source-regression tests as proof of live cross-device persistence or student isolation.
