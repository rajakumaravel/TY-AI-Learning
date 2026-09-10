# ADR-005 — Experience Lab standard for every chapter

- **Status:** Accepted
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

AI in Practice is not intended to become a conventional LMS, passive e-learning course, or quiz product. The strongest existing learning pattern in the pilot is Chapter 2, where the learner trains a model, tests it, deliberately finds failures, improves it, and records evidence.

The programme must preserve that level of hands-on experience across all chapters while remaining practical for Irish Transition Year students, including schools with limited technical support and no instructor-led AI teaching.

## Decision

Every chapter must contain at least one **Experience Lab**: a memorable, practical activity where the learner interacts with, tests, builds, investigates, improves, or makes a decision about an AI-related system.

An Experience Lab must satisfy the majority of the following tests:

- **DO** — the learner performs a real action rather than only reading.
- **TEST** — the learner observes a result, output, behaviour, or failure.
- **MAKE** — the learner creates an artefact, dataset, prompt, model, workflow, analysis, prototype, or recommendation.
- **BREAK** — where appropriate, the learner deliberately looks for failure modes, edge cases, bias, misinformation, or weak assumptions.
- **IMPROVE** — the learner changes something based on evidence and observes the effect.
- **PROVE** — the learner submits evidence of what they actually did.

A chapter that cannot meet this standard is considered too passive and must be redesigned before release.

## Tool-selection standard

External tools should be used only when they are:

1. free or realistically accessible to schools/students;
2. browser-based or very low setup;
3. age-appropriate and student-friendly;
4. suitable for supervised/self-directed TY use;
5. capable of producing observable evidence;
6. not dependent on paid personal accounts;
7. privacy-conscious and compatible with school use.

Where a high-quality free tool already exists, prefer using it rather than recreating it. Where external tools introduce cost, age, privacy, account, or complexity barriers, build a small purpose-built simulation directly into AI in Practice.

## Locked chapter Experience Lab direction

| Chapter | Experience Lab | Preferred implementation direction |
| --- | --- | --- |
| 1. AI & Me | **Can AI recognise / interpret what I do?** | Quick, Draw!-style interaction plus AI-system audit; free browser experience |
| 2. Teaching a Machine | **Train and break a model** | Google Teachable Machine or equivalent free visual classifier |
| 3. Data Detective | **Fix a bad dataset** | Built-in dataset exercise and/or spreadsheet; find missing, imbalanced, unnecessary and sensitive data |
| 4. Generative AI & Prompting | **Make prompts compete** | Controlled prompt experiment; compare outputs, verification and hallucination risk |
| 5. Trust, Bias & Misinformation | **Create, detect and reduce bias** | Built-in bias/data simulator plus claim-verification investigation |
| 6. AI for Learning & Work | **Complete an AI-assisted workplace task** | Realistic junior-work brief using approved AI/document tools; verify every factual claim |
| 7. Our AI Future | **Make an AI deployment decision** | Built-in branching decision simulation with benefits, risks and consequences |
| 8. AI Innovation Project | **Build and test your own solution** | Student-selected approved free tools; prototype, test, improve, present |

The exact tool may change as services evolve, but the learning experience and evidence requirement are stable product requirements.

## Assessment relationship

Experience Labs are the work. Assessment is secondary.

The expected sequence is:

```text
Mission
  ↓
Experience Lab
  ↓
Evidence / work product
  ↓
Reflection
  ↓
Formative feedback
  ↓
Improve where useful
  ↓
Chapter capstone
```

The assessment system must never replace the Experience Lab with additional prose questions simply because prose is easier to score.

## Consequences

- Curriculum development must define the Experience Lab before polishing explanatory content.
- Product development must support evidence capture from external and built-in activities.
- Chapter acceptance tests must verify that the hands-on activity exists and generates evidence.
- Third-party tools are dependencies, not the curriculum. A fallback or replacement path must be possible.
- The programme remains recognisably hands-on and work-like across all eight chapters.
