---
name: AI in Practice · TY Student Portal
description: A workshop notebook for Transition Year AI work — soft-lifted white panels on tinted paper, colour-coded by task and by chapter.
colors:
  slate-navy: "#202b3f"
  workbench-teal: "#139589"
  workbench-teal-ink: "#138f84"
  workbench-teal-bright: "#159487"
  marker-amber: "#f2b400"
  cool-paper: "#f6f8fb"
  warm-paper: "#f7f7f4"
  surface: "#ffffff"
  ink: "#172033"
  ink-muted: "#5d6878"
  ink-faint: "#6f7988"
  admin-ink-muted: "#666677"
  line: "#e3e7ee"
  line-strong: "#dbe1e8"
  line-field: "#cfd6df"
  line-warm: "#ecece7"
  state-pass: "#147a4b"
  state-caution: "#b45309"
  state-fail: "#9b2c2c"
  chapter-1: "#159487"
  chapter-2: "#e77722"
  chapter-3: "#6f4fc4"
  chapter-4: "#2f5fa3"
  chapter-5: "#5d47b0"
  chapter-6: "#19716d"
  chapter-7: "#8a3d6b"
  chapter-8: "#a8322d"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.76rem"
    fontWeight: 900
    lineHeight: 1.4
    letterSpacing: "0.11em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  panel: "18px"
  card: "20px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  xl: "26px"
  section: "42px"
components:
  button-primary:
    backgroundColor: "{colors.slate-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  button-secondary:
    backgroundColor: "#e9edf3"
    textColor: "#273448"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  button-google:
    backgroundColor: "{colors.surface}"
    textColor: "#182235"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px"
  card-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "28px"
  card-chapter:
    backgroundColor: "{colors.chapter-1}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "26px"
    height: "270px"
  chip-keyword:
    backgroundColor: "#d8efeb"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 9px"
  table-header:
    backgroundColor: "{colors.slate-navy}"
    textColor: "{colors.surface}"
    rounded: "0"
    padding: "7px"
---

# Design System: AI in Practice · TY Student Portal

## Overview

**Creative North Star: "The Workshop Notebook"**

This is not a course you read; it is a bench you work at. The interface behaves like a practical notebook kept open beside the task — a page of tinted paper with white panels laid on it, each panel holding one step of the work. The three recurring task boxes carry the whole pedagogy in colour alone: teal when you are taking something in, amber when you are doing something, violet when you are writing down what you found. A learner who has done two sessions knows which box demands their hands without reading a word of it.

Surfaces are soft-cornered and utilitarian. Rounded white cards, thin cool-grey rules, one faint wide shadow, and a body of straightforward Inter set generously enough to read on a shared training-room laptop. Nothing is decorative for its own sake; every coloured band, pill and rule is a wayfinding signal for where the learner is in the loop. Expression is concentrated in two places — the eight saturated chapter cards on the home grid, and the oversized display headline — and everything between those is deliberately quiet so the learner's own recorded work is the loudest thing on the page.

The system runs in two tones on purpose. The learner's surface is cool and coloured: a blue-grey paper, a navy structural voice, a teal accent. The coordinator's surface at `/admin` is warm and almost entirely uncoloured — warm off-white paper, grey type, near-black bars — because reviewing twenty learners' evidence is scanning work, not learning work, and colour there would compete with the data rather than direct it. Same shapes, same type, different temperature.

**Key Characteristics:**
- Tinted paper ground, white panels, one soft wide shadow — depth by lift, never by outline weight.
- Colour is functional: three task-box colours, eight chapter identities, three state colours. No decorative hue.
- Heavy label weights (800–900) at small sizes with wide tracking; light structural weight everywhere else.
- Oversized display type against otherwise restrained body setting.
- Two temperatures: cool for learning, warm-neutral for review.

## Colors

A functional palette: a cool blue-grey ground, one navy structural voice, one teal accent, and colour used almost exclusively to say *what kind of work this is*.

### Primary
- **Slate Navy** (`#202b3f`): the structural voice. Sticky top bar, primary buttons, chapter badge, every table header, the portfolio stat blocks. Where the product speaks with authority rather than instruction.
- **Workbench Teal** (`#139589`, deepened to `#138f84` for small type, brightened to `#159487` for filled surfaces): the single accent. Progress fill, the STUDY box rule, eyebrow labels, session-link numerals, active-state focus rings. It marks *learning input* and progress made.

### Secondary
- **Marker Amber** (`#f2b400`): the doing colour. Top rule of every ACTIVITY box, highlighter selection on the news-detective pass, and the ring on a completed programme card. Amber means the learner's hands are required.
- **Study Violet** (`#7754c8`, surface `#f4effb`): the reflection colour. Top rule of every REFLECT box and the Level-Up aside. Violet means write down what you now think.

### Tertiary
- **The chapter identities** — Chapter 1 `#159487`, 2 `#e77722`, 3 `#6f4fc4`, 4 `#2f5fa3`, 5 `#5d47b0`, 6 `#19716d`, 7 `#8a3d6b`, 8 `#a8322d`: each chapter card carries one flat saturated field, its only appearance in the system. They exist to make the home grid legible at a glance, not to theme the chapter's interior.

### Neutral
- **Cool Paper** (`#f6f8fb`): the learner page ground. Every white panel sits on it.
- **Warm Paper** (`#f7f7f4`): the coordinator page ground at `/admin`. The deliberate temperature switch.
- **Surface White** (`#ffffff`): panels, cards, fields, tables.
- **Ink** (`#172033`) for body text; **Ink Muted** (`#5d6878`) for supporting paragraphs; **Ink Faint** (`#6f7988`) for micro-labels and table meta.
- **Rules**: `#e3e7ee` for panel borders, `#dbe1e8` for table cells, `#cfd6df` for field strokes, `#ecece7` warm equivalent on the admin surface.

### State
- **Pass** (`#147a4b` on `#e8f7ef`), **Caution** (`#b45309`), **Fail** (`#9b2c2c`). Used for completion chips, sync status, validation results and admin errors only.

### Named Rules
**The Three-Box Rule.** Teal, amber and violet are spoken for. A teal top rule means read, amber means do, violet means reflect. Never use one of the three as decoration on a surface that is not that kind of box; the learner navigates the session by that colour and nothing else.

**The One Field Per Chapter Rule.** A chapter's identity colour appears once — as the flat field of its card on the home grid. It does not tint the chapter's headings, boxes, buttons or panels. Inside a chapter, the system palette takes over.

**The Warm Side Rule.** Anything at `/admin` uses the warm neutral ground and grey type. Accent colour on the coordinator's surface is reserved for status, never for structure.

## Typography

**Display / Body / Label Font:** Inter, with `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"` fallbacks. One family throughout; `font-synthesis: none` so a missing weight is never faked.

**Character:** Plainspoken and functional, made distinctive by extreme contrast in scale and weight rather than by a second family. Enormous tight-set headlines sit directly above small heavy all-caps labels and ordinary body text — the register jumps rather than steps.

### Hierarchy
- **Display** (700, `clamp(2.4rem, 6vw, 5rem)`, line-height 0.94): the home hero and chapter titles. Set tight enough to read as a block of type, not a line. Chapter heads run slightly smaller (`clamp(2.6rem, 5vw, 4.5rem)`).
- **Headline** (700, 2rem): section heads and lesson titles — the level that organises a page.
- **Title** (700, 1.35rem): the heading inside a study / activity / reflect box.
- **Body** (400, 1.05rem, line-height 1.7; 1rem/1.6 in denser panels): all instructional prose. Supporting paragraphs cap around 540px so lines stay readable.
- **Label** (900, 0.76rem, tracking 0.11em, uppercase): the eyebrow. `TRANSITION YEAR · PILOT EDITION`, `YOUR MISSION`, `PILOT RELEASE`. Micro-labels elsewhere run 800/0.78rem at 0.06–0.08em.

### Named Rules
**The Heavy Label Rule.** Small type is never quiet type. Anything under 0.85rem is set at 800 or 900 with wide tracking, because it is read on a shared low-end laptop at arm's length. A thin 0.75rem caption does not exist in this system.

**The One Family Rule.** No second typeface. Hierarchy comes from size, weight and tracking; introducing a display or mono family would break the notebook's plainness.

## Layout

A centred single column, `max-width: 1220px` on the learner surface and `1280px` at `/admin`, with `5vw` side padding that collapses to 15px on phones. Vertical rhythm is generous: `42px` page top padding, `42px` before a section head, `22–30px` between cards.

Two signature grids. The **home grid** is two equal chapter cards per row, each at least 270px tall. The **learning layout** is a 250px sticky session rail beside a `minmax(0, 1fr)` lesson panel — the rail pins at `top: 88px`, clearing the sticky top bar.

Breakpoints are declared max-width and cluster at **900px** (all multi-column grids collapse to one; the session rail unpins and becomes a two-up row) and **620px** (the top bar wraps to two rows, the brand sub-label and the Google button's text label are dropped, the display headline drops to 2.7rem, and every remaining grid goes single-column). A narrow band at 901–1250px re-flows the six-column day map to three, because six fields do not fit the lesson panel at laptop width. The rubric table at Chapter 8 fully reflows to stacked blocks under 620px with generated column labels.

### Named Rules
**The Shrinkable Grid Rule.** Every grid child carries `min-width: 0`. Wide evidence tables scroll inside their panel; they never widen the page. This is load-bearing — the system is full of learner-authored tables on a 1280px laptop.

**The 88px Rule.** The top bar is sticky. Anything else that sticks offsets by 88px so it never hides beneath it.

## Elevation & Depth

Soft-lifted cards on tinted paper. Depth comes from a single wide low-opacity shadow that reads as ambient lift rather than as a drop — the panel appears to rest a few millimetres above the page, not to float. Borders and shadow work together: every white panel carries both a 1px cool rule and the ambient shadow, so the edge stays legible on a low-contrast laptop screen where the shadow alone would vanish.

Only two things lift further: the chapter cards, which sit higher at rest and rise 3px on hover, and the Project Workspace modal, which uses a genuinely deep shadow because it is the one surface that covers the page.

### Shadow Vocabulary
- **Ambient panel** (`box-shadow: 0 8px 28px rgba(31,45,68,.06)`): the default for every white card, panel and portfolio block.
- **Ambient panel, warm** (`box-shadow: 0 10px 30px rgba(32,40,48,.05)`): the `/admin` equivalent; `0 18px 45px rgba(32,40,48,.08)` for the sign-in gate.
- **Card lift** (`box-shadow: 0 14px 35px rgba(33,43,64,.14)`): chapter cards only.
- **Overlay** (`box-shadow: 0 20px 60px rgba(0,0,0,.2)`): the Project Workspace modal shell only.
- **Focus ring** (`box-shadow: 0 0 0 2px rgba(21,148,135,.12)`): the active session link. Programme completion uses a solid amber ring (`0 0 0 3px #f2b400`) stacked over the card lift.

### Named Rules
**The Border-And-Shadow Rule.** A white panel gets both a 1px rule and the ambient shadow. Never shadow alone — on a shared low-end laptop at low brightness the shadow disappears and the panel edge must survive.

## Shapes

Uniformly soft, with radius encoding scale rather than importance: fields and small boxes at 8px, buttons and chips at 10px, nested boxes at 12–16px, panels and cards at 18–20px, and fully round pills (99px) for anything that reports a status — completion chips, keyword tags, progress bars, done/open markers. The brand mark and the small "G" are the only circles.

Rules are hairline and cool (1px, `#e3e7ee`–`#dbe1e8`). The recurring device is the **top rule**: study, activity and reflect boxes are identified by a 4px coloured border on their top edge over a pale tint of the same hue. Asides invert it to a 4px left border (the Level-Up violet, the privacy amber, the decision-case magenta). Nothing in the system uses a heavy full outline.

### Named Rules
**The Coloured Edge Rule.** A box declares its kind with a coloured edge and a pale tint of the same hue — never with a saturated fill behind text. The only saturated fields in the system are the eight chapter cards.

## Components

### Buttons
- **Shape:** softly rounded (10px), no border, heavy label (800–900).
- **Primary:** Slate Navy field, white label, `11px 15px`. One per action group.
- **Secondary:** pale cool grey (`#e9edf3`) with dark blue-grey label (`#273448`), same geometry.
- **Text button:** no chrome, muted blue-grey (`#586579`), 800 weight — used for "← Back to chapters".
- **Google sign-in:** white field, dark label, a small circled "G" mark, and a 1px-scale drop (`0 1px 3px rgba(0,0,0,.12)`). Its large variant fills the account card at `13px` vertical padding. Under 620px the text label is hidden and the mark stands alone.
- **Hover / Focus:** transitions are minimal by design — only the chapter card's 3px lift (`.2s transform`) and the progress bar's width (`.3s`) animate. Focus on the Chapter 7 decision lab draws a 3px offset outline in its own magenta.

### Chips
- **Keyword chips:** pale teal field (`#d8efeb`), pill radius, 0.78rem at 800. Non-interactive vocabulary.
- **Completion chip:** pale green field (`#e8f7ef`) with `#147a4b` label, pill radius — the only "you finished this" marker on a session.
- **Tags** inside the chapter badge: `#354258` on navy, 6px radius, 0.72rem.
- **Status pills** at `/admin`: `done` on pale green, `open` on warm grey — same pill geometry, warm palette.

### Cards / Containers
- **Panels** (account card, progress card, mission card, lesson panel, portfolio block, myth-busters): white, 1px `#e3e7ee` rule, 18px radius, ambient shadow, `24–28px` internal padding.
- **Chapter cards:** a flat saturated field of the chapter's colour, 20px radius, `26px` padding, minimum 270px tall, white text throughout, card-lift shadow, `translateY(-3px)` on hover. Locked state currently dims the whole card (`filter: saturate(.5); opacity: .58`).
- **Task boxes** (study / activity / reflect): a pale tint of their hue, 16px radius, 4px coloured top border, `22px` padding.
- **Example / evidence blocks:** plain white at 12px radius nested inside a task box, no shadow — nesting is expressed by tint change, not by stacking shadows.

### Inputs / Fields
- White field, 1px `#cfd6df` stroke, 8px radius, `9px` padding, `font: inherit` so learner-typed evidence reads at body size. Textareas start at 95px (75px in compact field groups) and resize vertically only.
- Field labels sit above the control at 0.88rem/600 in `#3b4654`, deliberately close to their box.
- The `/admin` search field runs the warm equivalent: 1px `#cfcfc8`, 10px radius, `11px 13px`.

### Navigation
- **Top bar:** sticky, full-bleed Slate Navy, white type, `14px 5vw`, with a 1px white-alpha hairline beneath. Brand is a button — a 42px teal rounded-square "AI" mark beside a two-line lockup. Under 620px it wraps to two rows, the sub-label disappears, and nav buttons gain a faint outline so they stay tappable.
- **Session rail:** a sticky vertical stack of white 12px-radius links, each a `28px / 1fr / 20px` grid — numeral bubble, title with muted sub-label, status. Active gets a teal border plus the soft teal ring; completed turns its marker green. Under 900px it unpins into a two-column row, and single-column under 620px.

### Signature Component — the Session Box Triad
The study / activity / reflect triad is the system's defining pattern and the one thing that must survive any redesign. Three sibling boxes, identical geometry, distinguished only by hue and top rule: **STUDY** (teal rule on `#eaf7f5`) carries the concise reading plus keyword chips and an example block; **ACTIVITY** (amber rule on `#fff8ea`) carries the tool link, the fallback, the fields and the evidence capture; **REFLECT** (violet rule on `#f4effb`) carries the prose the learner owes in their own words. Their order never varies, and every session in all eight chapters is built from them.

### Signature Component — the Experience Lab banner
A bordered banner above the session body carrying an auto-fit row of stage buttons (`minmax(140px, 1fr)`), a privacy notice on an amber left rule, the gated tool links, a collapsible offline fallback, and the captured evidence as a definition list. A completed stage takes a green border and a 10%-green field. It collapses to nothing when empty (`:empty { display: none }`).

## Do's and Don'ts

### Do:
- **Do** place every white panel on the tinted ground with both a 1px cool rule and the ambient shadow (`0 8px 28px rgba(31,45,68,.06)`).
- **Do** declare a box's kind with a 4px coloured top rule over a pale tint of the same hue — teal read, amber do, violet reflect.
- **Do** set anything under 0.85rem at 800–900 weight with 0.06–0.11em tracking.
- **Do** give every grid child `min-width: 0` so learner tables scroll inside their panel instead of widening the page.
- **Do** keep the `/admin` surface on the warm ground with grey type, reserving colour there for status only.
- **Do** offset anything sticky by 88px to clear the sticky top bar.
- **Do** let evidence the learner typed render at full body size — inputs inherit the page font on purpose.

### Don't:
- **Don't** dim a whole container to express a disabled or locked state. The locked chapter card does this today (`opacity: .58` over the card and its text) and drops its instruction to 1.5:1 — a documented defect, not a pattern to copy. Dim the surface, keep the text at full contrast.
- **Don't** add a ninth flat saturated colour, or let a chapter's identity colour leak past its card into headings, boxes or buttons.
- **Don't** introduce a second typeface, or a thin small caption.
- **Don't** stack shadows to express nesting; a nested block changes tint and drops its shadow entirely.
- **Don't** reach for gamified edtech furniture — no mascots, streaks, confetti, XP meters or cartoon rewards. Badges here mark demonstrated work, and the visual language must not suggest they mark activity.
- **Don't** animate beyond the two motions that exist: the chapter card's 3px hover lift and the progress bar's width. This system is quiet in motion.
- **Don't** invent a new shadow or radius value. Six near-duplicate shadows and thirteen radii already exist across four stylesheets; extend the vocabulary above rather than adding to the sprawl.
