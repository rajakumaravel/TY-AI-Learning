# ADR-003 — Formative assessment and teacher review

- **Status:** Accepted
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

The student portal now captures activity evidence and written reflections. The pilot needs useful feedback without turning an automated system into the final examiner. The assessment must measure understanding of AI concepts rather than writing sophistication, and teachers must be able to inspect and override any automated judgement.

## Decision

Use a mixed assessment model with three modes.

### 1. Objective activities

Questions with a defined answer are marked deterministically. Examples include AI-vs-software classification, multiple-choice checks, accuracy calculations and confusion-matrix calculations.

### 2. Evidence validation

Practical work is checked for required evidence rather than graded for prose quality. Examples include the AI Day Map, model experiment record, test log, confusion matrix and improvement activity. Evidence validation determines whether a task is complete.

### 3. Written reflections

Written responses use a four-dimension formative rubric:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Concept understanding | Not demonstrated | Partially demonstrated | Clearly demonstrated |
| Application / evidence | No relevant example or evidence | Some relevant evidence | Clear connection to activity or real example |
| Reasoning | Statement only | Some explanation | Clear causal/comparative reasoning |
| Own words / reflection | Mostly copied / not articulated | Partly articulated | Clearly expressed in the student's own words |

Total rubric score is 0–8 and maps to the student-book language:

- **0–3:** Getting started
- **4–6:** Getting there
- **7–8:** Going further

The numeric score is primarily an internal diagnostic. Students should see the level plus concise formative feedback: what they demonstrated and one specific way to improve.

## Guardrails

- Do **not** grade spelling, grammar, vocabulary sophistication or answer length unless a future learning objective explicitly requires it.
- Do not label copied text as cheating. Prompt the learner to explain the idea in their own words and connect it to their own evidence.
- Assessment is **formative during the pilot**. Automated output is a suggestion, not a final grade.
- The teacher can confirm the suggested level, change it, and add a comment.
- Admin APIs must remain protected server-side by Netlify Identity plus the admin allowlist / admin role.
- Students can access only their own assessment data.
- Store assessment results separately from the student's original evidence so teacher review never mutates the learner's answer.

## Pilot calibration strategy

The first production implementation uses a transparent, deterministic rubric engine for reflection guidance alongside deterministic objective/evidence checks. This gives us an auditable baseline and avoids introducing an uncalibrated external model as an examiner.

After roughly **30–50 real student responses**, compare system suggestions with teacher judgements and measure agreement by rubric dimension and overall level. An LLM-assisted evaluator may then be introduced behind the same rubric contract if it improves feedback quality and agreement. Teacher judgement remains authoritative.

## Student-facing output

Example:

```text
Getting there

What you did well:
You connected the AI system to a real consequence.

To go further:
Explain why this error matters more than a lower-impact AI mistake.
```

## Admin-facing output

For each reflection show:

- original student response
- system-suggested level
- four rubric dimensions
- formative feedback
- copy/rephrase prompt when relevant
- teacher level override
- teacher comment
- reviewer and review timestamp

## Consequences

This design provides immediate, consistent formative feedback while preserving teacher control. It also creates a calibration dataset that can be used to decide whether a later LLM-assisted evaluator is sufficiently reliable for the programme.