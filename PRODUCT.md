# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the Transition Year learner (ages 15–16).** They work through the programme largely self-directed, in a fixed block of hours (for example two hours a week) inside a third-party training centre, on a shared low-end laptop that is not theirs and may not be the one they used last week. They sign in with Google so their work follows the account rather than the device. Their job is not "study AI" — it is to complete a practical mission, produce a work artefact, and be able to defend it with evidence.

**Secondary: the training-centre coordinator (the "teacher/admin" role).** Deliberately lightweight and not assumed to be an AI instructor: approve access, monitor progress, review submissions, inspect or override the automated formative assessment, add occasional comments, confirm completion. They work in the protected `/admin` surface.

**Secondary: the programme operator.** Reviews aggregate pilot analytics (completion, resubmission, drop-off, teacher agreement, Experience Lab usage, feedback), with any cohort under five learners suppressed per ADR-008.

## Product Purpose

A self-guided, project-based AI learning and work-experience platform for Transition Year, aligned to *AI in Practice · Student Book v1.0 · September 2026* and to the Exploring AI learning outcomes. Eight chapters, a 30-hour programme, each ending in an applied capstone that gates the next chapter.

Success is not completion percentage. A learner finishing a chapter can show an artefact and say: *I tried something, I saw what happened, I found a problem or insight, I changed or evaluated something, and I can explain my decision using evidence.* If a chapter cannot produce that, the chapter needs redesign.

## Positioning

**The platform teaches by work, not by instruction.** It is closer to supervised junior project work than to an online textbook or an LMS. Content exists only to enable the next action; no passive segment may dominate a session.

What a neighbouring product could not truthfully copy: every chapter carries an **Experience Lab** (ADR-005) in which the learner must do, test, make, break, improve or prove something — using a free, no-account external tool where one genuinely serves, and a purpose-built in-product simulator where external tooling would impose account, cost, privacy, age or complexity barriers (the bias simulator, the AI Adoption Decision Simulator, the flawed dataset audit). The curriculum stays independent of any vendor.

## Operating Context

- **Deployment:** a third-party training company's environment, **not a school**. There is no school-approval process and no assumed instructor delivering AI content.
- **Copy rule that follows from that:** portal copy says "the training centre" or stays tool-neutral instead of "school-approved", "your teacher", or "your school". The Student Book's own wording is kept verbatim only where it is explicitly quoted as the book.
- **Delivery rhythm:** a fixed block of centre hours plus independent project extension. Self-paced; no day, hour count or timetable is hard-coded (scheduling was withdrawn from the roadmap for this reason).
- **The real usage scene:** a shared low-end laptop in a training room, a learner who may be resuming work started a week ago on a different machine, and a coordinator who is not standing over them.
- **Progression:** chapters unlock only on required practical evidence plus capstone submission. Badges follow demonstrated work, never clicks.
- **Assessment:** two layers — formative session feedback that does not gate, and an applied chapter capstone that does. Automated assessment is formative; coordinator judgement is authoritative and stored separately from the automated suggestion (ADR-003, ADR-004).

## Capabilities and Constraints

**Shipped:** Google sign-in with account-owned progress; Chapters 1–8 aligned to the Student Book; Experience Labs in every chapter with safety gating and offline fallbacks; downloadable lab datasets and templates; the Chapter 2 Project Workspace (brief, role, scenario, acceptance criteria, deliverables, work log, decisions, blockers, evidence, submission, status) per ADR-006; chapter capstones, progression gates and badges; formative feedback with coordinator override; a protected `/admin` review surface; a self-contained learner portfolio export plus a narrower coordinator summary carrying no free-text learner writing; admin-only pilot analytics (ADR-008).

**Stack (existing):** Vite build over plain HTML/CSS/JS — no UI framework, no CSS preprocessor, no component library. Cloudflare Pages + Pages Functions, Supabase Auth (Google OAuth) and Supabase Postgres with RLS (ADR-007). Netlify code is retained as rollback reference only. Node ≥ 24. Tests are `node --test`; `npm run check` = tests + build; live acceptance runs against a deployment via Playwright.

**Constraints:**
- Every branch push deploys to Cloudflare Pages **Preview**. **Production has never been deployed** and stays deferred until all phases are accepted on Preview; releasing it is the operator's call, not an automated consequence of merging.
- No mandatory paid accounts and no required paid dependency, for any tool the learner touches.
- Teacher answer keys live outside public files (`docs/teacher/*.KEY.txt`), never in the built site.
- Learner evidence is private to that learner and to authorised admins; RLS isolation is a tested invariant.
- Free AI tools suitable for 15–16-year-olds only. DuckDuckGo AI Chat (duck.ai) is the primary lab tool — free, no account, anonymous, multi-model; unsigned-in Microsoft Copilot is the fallback. Claude.ai is excluded (18+ terms); ChatGPT and Gemini are excluded because they require accounts.
- The Student Book is the curriculum source of truth; `docs/source` holds it.

**Terminology:** chapter, session, mission, Experience Lab, capstone, badge, work log, evidence, Project Workspace, portfolio, formative feedback. Sheet references (A2, A4, A5) point at Student Book worksheets.

**Anti-patterns requiring explicit justification:** long passive lessons; page-after-page LMS progression; assessment crowding out practical work; marks for writing sophistication rather than AI understanding; teacher-dependent core instruction; unnecessary exposure of learner personal data.

## Brand Commitments

The product name — **AI in Practice · TY Student Portal** — and its stated alignment to Student Book v1.0 are binding, as is the training-centre wording rule above. **The current visual identity is not binding.** The navy/teal palette, the eight per-chapter card colours, Inter, and the present layout are incumbent implementation, not commitments; future work may replace the visual world outright.

## Evidence on Hand

- The curriculum itself: `curriculum.json`, `docs/source` (Student Book), eight chapter contracts in `docs/product/`, and eight ADRs in `docs/decisions/`.
- Real synthetic lab material with teacher keys: flawed club sign-up dataset, GenAI sample outputs, the AI news article, the event-budget spreadsheet, the AI-future adoption case, the innovation project.
- `docs/product/operating-model.md` — the locked product baseline this record summarises.
- A UI audit at `docs/design/ui-audit-2026-09-12-frontend-design.md` (91 hex colours, one custom property, no dark mode, multiple AA contrast failures including invisible locked-card text).
- Screenshot sets in `ui-audit-shots/` and `live-shots/`.

**Absences future work must not fabricate:** there are no real learners, no cohort results, no testimonials, no case studies, no press, no pricing, no licensing terms, and no production deployment. The pilot has not yet run. No logo asset exists beyond the CSS "AI" mark.

## Product Principles

1. **Work first, words second.** Content earns its place only by enabling the next action.
2. **Every chapter must let the learner do, test, break, improve or prove something.**
3. **Evidence gates progression.** Badges and unlocks follow demonstrated work, never activity.
4. **No barrier the learner cannot clear alone** — no paid account, no age-gated tool, no dependency on an instructor being present.
5. **Automated judgement is formative; human judgement is authoritative** and is stored apart from it.

## Accessibility & Inclusion

**WCAG 2.2 AA is binding** — contrast, visible focus, and target sizes included. The usage scene is shared low-end laptops at mixed screen sizes, so performance on modest hardware and correct behaviour at small viewport widths are accessibility concerns here, not polish. Language is pitched at 15–16-year-olds working without an instructor beside them. The current CSS has documented AA failures (see the UI audit); they are a known gap, not an accepted standard.
