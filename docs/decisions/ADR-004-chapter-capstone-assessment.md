# ADR-004 — Chapter capstone assessment and progression gate

- **Status:** Accepted
- **Date:** 2026-09-10
- **Programme:** AI in Practice — Transition Year pilot

## Context

ADR-003 introduced formative session feedback. That feedback is coaching during learning, not the chapter competency check. The portal also previously unlocked the next chapter as soon as all sessions were marked complete. For a Transition Year programme centred on hands-on training and work-like experience, progression should demonstrate that the learner can apply the chapter concepts to a fresh practical scenario after completing the chapter work.

## Decision

Separate assessment into two layers:

1. **Session feedback** — immediate formative coaching after a learner completes practical activity evidence and reflection. It does not gate progression.
2. **Chapter capstone assessment** — an applied scenario that unlocks only when all chapter sessions are complete. Submission is evaluated against the same four-dimension rubric contract: concept understanding, application/evidence, reasoning, and own words.

A chapter is considered qualified only when both conditions are true:

- all required chapter sessions/evidence are complete; and
- the chapter capstone assessment has been submitted and evaluated successfully.

The chapter badge is awarded after the capstone evaluation is recorded. The next chapter unlocks at that point. Teacher review can confirm or override the automated formative judgement but does not block the learner from progressing during the pilot.

## Transition Year guardrail

The capstone must not become a conventional recall quiz. It must resemble a small workplace task: interpret a situation, use evidence, identify a risk or failure, make a judgement, and recommend an action. The assessment exists to verify learning from practical work, not to replace practical work.

## Pilot capstones

### Chapter 1 — AI & Me

Learner acts as a junior AI adviser for a school considering an AI recommendation system. They must map input → AI action → output, identify a benefit and risk/stakeholder, and state where human responsibility should remain.

### Chapter 2 — Teaching a Machine

Learner investigates an unseen model failure report. They must interpret accuracy/error evidence, diagnose likely shortcut learning, explain what the confusion evidence reveals, and propose a targeted retraining/retest plan.

## Progression rule

```text
Practical sessions complete
        ↓
Chapter capstone unlocks
        ↓
Learner submits applied response
        ↓
Rubric evaluation recorded
        ↓
Chapter badge awarded
        ↓
Next chapter unlocks
```

Teacher review remains authoritative for the final educational judgement and is stored separately for calibration.
