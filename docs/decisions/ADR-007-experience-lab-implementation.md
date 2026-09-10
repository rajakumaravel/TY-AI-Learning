# ADR-007 — Experience Labs as the hands-on anchor of every chapter

- **Status:** Accepted
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

ADR-005 established the Experience Lab standard: every chapter must contain at least one practical activity where the learner does, tests, makes, breaks, improves and proves something. The programme is self-guided and has no instructor-led dependency. Experience Labs therefore need to be obvious, safe, free/student-friendly and capable of producing durable evidence that feeds later project and chapter assessment work.

## Decision

Implement Experience Labs as reusable, persistent learner workspaces that sit inside the existing chapter flow.

Each Experience Lab must:

- have a clear practical mission;
- use a free/browser-based tool or an in-product simulator;
- require no personal paid account;
- show safety/privacy guidance before external-tool use;
- capture prediction, action, observed result, failure/unexpected behaviour, change/improvement and conclusion;
- persist across visits/devices for signed-in students;
- expose an evidence summary that can be reused in project/capstone work;
- never replace the practical task with an assessment-only interaction.

## Pilot labs

### Chapter 1 — Recognition Explorer

Use Google Quick, Draw! as a low-friction recognition experiment. The learner predicts how easily an AI system will recognise a simple object, runs at least two trials, changes how the object is drawn, records what changed and explains what the behaviour suggests about pattern recognition and model limitations.

Safety rule: draw ordinary objects only. Do not enter names, faces, private information or identifying content.

### Chapter 2 — Train, Break, Improve

Use Google Teachable Machine as the canonical Experience Lab. The learner:

1. defines two safe object classes;
2. predicts a weak case;
3. trains model V1;
4. tests unseen conditions;
5. deliberately finds a failure;
6. runs a shortcut/background experiment;
7. changes the training data/model;
8. retests fairly;
9. compares V1 and V2;
10. records a remaining limitation.

Safety rule: use ordinary objects rather than faces or personal/sensitive images. Prefer live/local capture and do not upload identifying material.

## Evidence contract

An Experience Lab record is learner-owned and contains only task evidence. It is stored against the authenticated Netlify Identity user. Student APIs never accept another learner ID.

Chapter 2 lab evidence may be imported into the Chapter 2 Project Workspace as a structured evidence item. This makes the lab part of the real project story rather than an isolated exercise.

## Progression

Experience Labs support chapter completion but do not bypass the existing chapter progression rules. Chapter 2 tools remain unavailable until Chapter 1 and its capstone are qualified.

## Guardrails

- No punitive time tracking.
- No unnecessary personal data.
- No faces/biometric collection as a required activity.
- No paid personal account dependency.
- External-tool availability must have a fallback instruction.
- Assessment remains secondary to practical work.
- Teacher authority remains unchanged.
