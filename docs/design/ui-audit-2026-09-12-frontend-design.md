# UI audit — 2026-09-12 — via the `frontend-design` skill

- **Auditor:** Claude (Opus 5), using the `frontend-design` skill
- **Scope:** the student portal (`index.html`, `styles.css`, `app.js`), the admin surface (`admin.html`, `admin.css`, `admin.js`), the Project Workspace and assessment styles, and the Phase 10 portfolio export
- **Commit audited:** `main` at `380fa82`, all ten roadmap phases merged
- **Status:** findings only. No interface changes were made.
- **Purpose:** a baseline to compare against a second audit run with a different skill.

The operator asked for "the Impeccable skills". No skill of that name exists in this project (`.claude/` holds only `workflows/` and `worktrees/`) or in the user skills at `~/.claude/skills`. The relevant available skill is `frontend-design`; `dataviz` also applies to the Phase 10 analytics tables and is referenced where it bears.

## How these numbers were produced

So a second audit can be compared like for like:

- Colour counts: `grep -oE '#[0-9a-fA-F]{3,8}'` over the four stylesheets, lowercased, deduplicated.
- Contrast: WCAG 2.x relative luminance computed in Python over the literal hex pairs as they appear in the CSS, not sampled from a screenshot.
- Locked-card contrast: the card colour composited onto the page background at `opacity:.58`, then white text composited onto that result at the same opacity, because the rule applies to the whole card.
- Everything else: direct reads of the stylesheets, the markup and the test suite.

## Headline

The portal has no design system and no dark mode. There are **91 distinct hex colours** across four stylesheets and **one** CSS custom property in the codebase, used for chain column counts rather than theming. There are **zero** `prefers-color-scheme` queries in 444 rules. Most of what follows is downstream of those two facts.

## Findings, most severe first

### 1. Locked chapter cards are effectively invisible (critical)

`.block-card.locked{filter:saturate(.5);opacity:.58}` dims the entire card including its white text.

| Card state | Effective contrast |
| --- | --- |
| Chapter 2 locked, white label | 1.48:1 |
| Chapter 1 locked, white label | 1.59:1 |
| WCAG AA minimum for body text | 4.5:1 |

The text destroyed is the one instruction the student needs at that moment: "🔒 Complete Chapter 1 assessment". Root cause is `opacity` applied to a container rather than a dimmed surface with full-contrast text.

### 2. No dark mode, and no `color-scheme` declaration (high)

No stylesheet declares `color-scheme`, so native form controls stay light while the rest of the operating system is dark. A learner opening the portal at night gets a full-brightness white page. Adding this later is cheap only if tokens exist first, which they do not.

### 3. The chapter palette is eight unrelated decisions (high)

Extended one chapter at a time across Phases 4 to 9. Two of the eight were added by me today.

| Chapter | Colour | White text |
| --- | --- | --- |
| 2 | `#e77722` | 2.97:1 |
| 1 | `#159487` | 3.74:1 |
| 3 | `#6f4fc4` | 5.85:1 |
| 6 | `#19716d` | 5.79:1 |
| 4 | `#2f5fa3` | 6.39:1 |
| 8 | `#a8322d` | 6.65:1 |
| 5 | `#5d47b0` | 7.01:1 |
| 7 | `#8a3d6b` | 7.09:1 |

Two teals, two purples, and a spread from 2.97 to 7.09. Chapter 2 fails outright for its own label text.

### 4. Recurring muted text fails AA (high)

These are the standard secondary colours, not edge cases.

| Use | Value on background | Contrast |
| --- | --- | --- |
| `.muted` on a card | `#6f7988` on `#ffffff` | 4.41:1 |
| Eyebrow label | `#138f84` on `#f6f8fb` | 3.73:1 |
| Suppressed analytics cell | `#888888` on `#ffffff` | 3.54:1 |
| Page muted and footer | `#7b8492` on `#f6f8fb` | 3.55:1 |
| Admin secondary text | `#777777` on `#ffffff` | 4.48:1 |

The suppressed cell is the one to fix first. It is the privacy state required by ADR-008 §3, rendered in italic grey at the lowest contrast on the page.

### 5. No design tokens (high, and the cause of 3 and 4)

`styles.css` alone holds 70 unique hexes, `admin.css` another 21. Twelve are near-identical dark teals and greens (`#138f84`, `#139589`, `#147a4b`, `#159487`, `#186e67`, `#188056`, `#19716d` and more). 63 distinct greys. Nothing names a role, so every new chapter invents its own values.

### 6. Student and admin surfaces have drifted (medium)

| Surface | Background | Text |
| --- | --- | --- |
| Student | `#f6f8fb` | `#172033` |
| Admin | `#f7f7f4` | `#1f2933` |

Same intent, different values, no shared token. The teacher view reads as a different product.

### 7. The typeface is declared but never loaded (medium)

`font-family:Inter, ui-sans-serif, system-ui, …` with no `@font-face` and no stylesheet link in either `index.html` or `admin.html`. Every user sees a system fallback, so the type identity is accidental. Either load it or commit to the system stack deliberately.

### 8. The type scale is 31 sizes wide (medium)

Fourteen values cluster between `.72rem` and `.9rem`. Two competing hero ramps exist, `clamp(2.4rem,6vw,5rem)` and `clamp(2.6rem,5vw,4.5rem)`. Four card radii (14, 16, 18, 20px) encode no hierarchy.

### 9. Accessibility mechanics are thin (medium)

- One `focus-visible` rule, scoped to `.decision-lab`. The rest of the portal relies on the browser default.
- No `prefers-reduced-motion` anywhere.
- Six `opacity` values applied to text, which is the mechanism behind finding 1.

### 10. Tables behave three different ways (medium)

Student tables scroll inside `.table-wrap{overflow:auto}`. The admin table forces `min-width:820px`. Only the Chapter 8 rubric stacks at 620px, and it demonstrates the pattern the others should adopt. The Phase 10 analytics grid sets `min-width:0` to escape the inherited rule, which is a symptom rather than a fix.

### 11. Template chrome (low, but it is the house style now)

Six `text-transform:uppercase` eyebrow rules, 63 middle-dot separators in `app.js`, and arrows appended to link text. The `frontend-design` guidance names all three as generic defaults.

## Three directions

Each preserves every route, activity kind, API and test-covered selector unless stated.

### A. Subtle refresh

Fix what is broken and introduce tokens, changing nothing a student would call a redesign.

- Collapse 91 hexes into roughly fourteen named custom properties.
- Raise every failing text colour to at least 4.5:1.
- Replace the locked-card `opacity` with a dimmed surface plus a full-contrast label.
- Add dark mode by redefining tokens only, and declare `color-scheme`.
- Load the typeface, or drop the declaration and commit to the system stack.
- Add a global focus style and a `prefers-reduced-motion` query.

Every class name, layout and component survives. Close to test-neutral.

### B. Moderate redesign

Everything in A, plus:

- Chapter identity becomes one hue family at fixed lightness steps, so all eight relate and all clear contrast. Locked, current, complete and awaiting-review become explicit state tokens rather than filters.
- One shell for student and admin.
- Type scale cut to seven steps with a single hero size.
- One table component: sticky header, and the rubric's stacking behaviour at phone width.
- The analytics view gets the `dataviz` treatment, with suppression as a first-class state rather than italic grey.

Markup changes are modest; functionality is unchanged.

### C. Bold alternative

Ground the identity in what the programme teaches. It is about evidence, testing and showing your working, but it currently looks like a generic course platform made of rounded cards.

- The student's own work becomes the visual hero instead of the chapter tiles.
- Chapters become an indexed spine; each session is a dated record with visible provenance.
- Colour is demoted to meaning state only: one accent plus typographic hierarchy replaces eight card colours.
- The portfolio export becomes the flagship object, and the rest of the interface is styled as its working surface.

Every route, activity kind and API stays. The home page and portfolio change most.

## Blast radius

Twelve assertions across six test files read `styles.css` directly. They pin class existence (`.annotate-lab{`, `.bias-sim{`, `.sim-controls{`), exact declarations (`.prompt-lab textarea{min-width:0;width:100%}`, the `.chainrow` grid), three phone-stacking media queries at 620px, and the presence of `.block-5{background:` and `.block-6{background:`.

They constrain reformatting more than colour. Direction A is close to test-neutral. Direction C would require those assertions to be revisited deliberately rather than incidentally.
