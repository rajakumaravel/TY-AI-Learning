# Phase 5 contract — Chapter 4: Generative AI & Prompting

Shared contract for parallel implementation. Sources, in precedence order: `docs/source/student-book.txt` pages 18–22, `docs/source/curriculum-pilot-v1.txt` section "8. Block 4" and Appendix A sheets A2 and A4 and rubric B1, then `docs/source/curriculum-review-data-integrity.txt` only where it touches verification. Read the sources before touching code; quote the book where this contract says verbatim.

Deployment context (operator, 2026-09-11): the portal is used in a training environment run by a third-party company, not a school. Where the book says "school-approved tool" or "your teacher", portal copy says "the tool named here" or "the training centre". Book text quoted as the book stays verbatim.

## Tool decision

Primary: **DuckDuckGo AI Chat**, `https://duck.ai` — free, no account, anonymous, and the student can run the same prompt through more than one model. Fallback: **Microsoft Copilot** on the web, `https://copilot.microsoft.com`, usable without signing in. Second fallback in every lab: the sample outputs download. Claude.ai, ChatGPT and Gemini are not offered (age terms or account required).

Safety notice for every session that opens the tool (verbatim, four notes): "Never type your name, address, school, photos, or anything about another person into an AI tool. Use made-up details if a prompt needs them." · "No accounts. DuckDuckGo AI Chat works without signing in; if a tool asks you to sign in, stop and use the fallback." · "The AI is not a fact source. Confident wording is not confident truth. Anything you will rely on gets checked in the verification log." · "Nothing typed into this portal is sent to the AI tool; copy your prompt across yourself and paste short extracts of the output back here."

## Block

```text
id: block4   number: "04"   title: "Generative AI & Prompting"   duration: "4 hours" (sessions total 240 min)
badge: "Prompt Engineer"   outcomes: ["LO7","LO9"]   pageRef on every session: "Student Book pp. 18–22"
description: book p.18 opening paragraph, shortened to two sentences in the same words.
mission (p.19, verbatim): "Run a three-version prompt experiment: v1 weak, v2 improved, v3 tested and revised. Keep the outputs. Then produce a verification log for at least three factual claims the AI made."
route: the book's eleven timed segments pp.19–21, verbatim labels.
final: "Prompts v1, v2, v3 with their outputs (Sheet A4), your output comparison notes, your three-claim verification log (Sheet A2), your reusable prompt template, your reflection and exit rule."
lab: { title: "Make prompts compete", summary: "You run the same task through weak and improved prompts, compare what changed, verify what the AI claimed, then build a prompt you would actually reuse.", stages: [["DO","b4s3","Rebuild a weak prompt with C-T-C-F"],["TEST","b4s1","Same task, different prompts"],["MAKE","b4s8","Build a reusable prompt"],["BREAK","b4s7","Inject doubt and watch the framing"],["IMPROVE","b4s4","Iterate one addition at a time"],["PROVE","b4s6","Verify three claims"]] }
myths (p.21, verbatim, four pairs)
selfCheck (p.22, matched to the docx descriptors): { "Getting started": ["I can write a usable prompt", "I notice when outputs differ"], "Getting there": ["I improve prompts systematically", "I verify important factual claims"], "Going further": ["I build criteria to judge outputs", "I compare outputs critically", "I can explain how framing and confirmation bias affect results"] }
levelUp (p.22, verbatim)
```

Key words (p.19), each in at least one session's `study.keywords`: generative AI, large language model (LLM), pattern prediction, prompt, context, constraint, output format, iteration, hallucination, verification, source quality.

## Sessions (ids fixed; minutes sum to 240)

| id | title (book label) | min | type | activity.kind |
| --- | --- | --- | --- | --- |
| b4s1 | Same task, different prompts | 20 | PREDICT + TEST | `lab` |
| b4s2 | What an LLM actually does | 20 | DISCOVER | `quiz` |
| b4s3 | Prompt Lab 1: C-T-C-F | 30 | TRY | `prompt` (new kind, with builder) |
| b4s4 | Prompt Lab 2: iterate | 30 | IMPROVE | `prompt` (v3 only, no builder) |
| b4s5 | Four useful roles | 30 | TRY + BREAK | `chain` |
| b4s6 | Verification challenge | 30 | TEST + INVESTIGATE | `chain` (Sheet A2) |
| b4s7 | Injecting doubt | 25 | BREAK | `textfields`, 4 fields |
| b4s8 | Build a reusable prompt | 30 | MAKE | `textfields`, 4 fields |
| b4s9 | Red-team a prompt | 20 | QUESTION + BREAK | `textfields`, 3 fields |
| b4s10 | Exit rule | 5 | REFLECT + EVIDENCE | `textfields`, 1 field |

Every session keeps `intro`, `study{title, body[3], example, keywords}`, `reflection`. Study text is written for a 15–16 year old from the book's own explanations; b4s2's study body is built from the book's p.20 "Discover" paragraph and must contain the sentence "Confident wording is not confident truth." The four "Think about it" questions (p.21) are the reflections for b4s3, b4s5, b4s6 and b4s7; b4s10's reflection is "Finish this sentence: 'I should never trust an AI answer just because…'"

**b4s1 lab.** `tool: { name: "DuckDuckGo AI Chat", url: "https://duck.ai", free: true }`, `privacy` = the four safety notes above, `steps` (5: read the weak question on the card; ask it exactly as written; read what came back; ask the same question a second time, or in a second model; note what varied, what was missing, and what sounded confident with nothing behind it), `fallback: { title: "Tool blocked?", steps: [try Copilot at copilot.microsoft.com without signing in; otherwise open the sample outputs download, which has two answers to the same weak question; do the same comparison] }`, `fields` (4: the weak question I asked; what came back, in a sentence or two; what was missing; what sounded confident but had nothing behind it), `downloads` (weak-question card, sample outputs). Evidence label "Output comparison notes".

**b4s2 quiz.** Title "Pattern prediction or fact lookup?", 8 statements about what an LLM is doing, options `Pattern prediction` / `Checked fact lookup` / `Neither`. Written from p.20; e.g. "Writes a fluent paragraph about an event that never happened" → Pattern prediction; "Confirms a date against an official record" → Neither.

**b4s3 prompt (new kind).** Sheet A4 in the portal:

```json
{ "kind": "prompt", "title": "Prompt Lab 1: C-T-C-F", "instructions": "...", "builder": true,
  "versions": [["v1","V1 – baseline (the weak prompt)"],["v2","V2 – rebuilt with C-T-C-F"]],
  "fields": [["prompt","The prompt, exactly as sent"],["change","What I changed"],["output","What the output did (short extract or summary)"],["better","Was it better? Why?"]],
  "downloads": [...] }
```

Render: when `builder` is true, four inputs (Context, Task, Constraints, Format) with the book's p.20 hints as placeholders and a "Compose v2" button that writes the four parts, joined by blank lines, into the v2 prompt field; then one block per version with the `fields` as labelled textareas. State: `state.activity[sid] = { builder: {context, task, constraints, format}, versions: { v1: {prompt, change, output, better}, v2: {...} } }`. `activityReady`: every version has `prompt` ≥ 20 chars, `output` ≥ 20, `better` ≥ 12 (`change` may be empty for v1). Admin `activityLabel`: `Prompt <version>` for version keys, `C-T-C-F builder` for `builder`.

**b4s4 prompt.** `builder: false`, `versions: [["v3","V3 – tested and revised"]]`, same `fields`, plus `extras: ["Additions I tried, one at a time (example, audience, success criteria, ask-me-questions-first)…", "Which additions actually helped, and which just made the prompt longer…"]` rendered as two textareas after the version block; ready = version complete and both extras ≥ 12 chars.

**b4s5 chain.** columns `[["role","Role (tutor, brainstorm partner, critic, transformer)"],["prompt","My prompt"],["did","What it did well"],["risk","The risk I saw"]]`, rows 4, minRows 4, head "TUTOR · BRAINSTORM PARTNER · CRITIC · TRANSFORMER". Instructions include the book's four risks.

**b4s6 chain (Sheet A2).** columns `[["claim","Claim the AI made"],["source","Source I checked (name and where)"],["verdict","Supported / uncertain / wrong"],["changed","What I changed because of it"]]`, rows 3, minRows 3, head "CLAIM → SOURCE → VERDICT → WHAT I CHANGED". Downloads: verification topic cards, sample outputs, A2 template CSV.

**b4s7 textfields.** "The leading question I asked (for example 'Why is X better than Y?')…", "The neutral version ('Compare X and Y')…", "How the two answers differed…", "What this shows about confirmation bias and my own responsibility…".

**b4s8 textfields.** "The real task my template is for (work experience, learning a topic, planning an event, survey feedback)…", "My reusable prompt template, with [placeholders] for the parts that change…", "Why each part of the template is there…", "When I would use it again, and what I would still check by hand…". Downloads: reusable prompt template (Markdown).

**b4s9 textfields.** Self-paced adaptation of the book's peer red-team: "Red-team a prompt: use a partner's if you have one, otherwise one of the three prompts in the download." Fields: "One ambiguity in the prompt…", "One missing constraint…", "One claim in its likely answer that would need checking…". Downloads: red-team prompt cards.

**b4s10 textfields.** One field: "I should never trust an AI answer just because…". Type REFLECT + EVIDENCE.

## Chapter page

Myth-busters, self-check and level-up render through the existing block fields. The home page's section heading "Chapters 1–2" is stale: render it as `Chapters 1–<n>` from `COURSE.blocks.length` (student-ui agent).

## Files (`scripts/generate-datasets.mjs`, deterministic, `public/datasets/`)

- `genai-weak-question-card.txt`: the deliberately weak question every student asks first ("Tell me about the River Shannon.") and why it is weak.
- `genai-sample-outputs.txt`: two fluent AI-style answers to that weak question, clearly labelled as synthetic samples. Each contains claims that are supported, uncertain and wrong, mixed and unmarked. Facts must be real-world checkable: use well-established figures (the Shannon's approximate length, counties it passes, the lakes on it, the ESB Ardnacrusha scheme) and plant wrong ones that a search will expose (a wrong length, a wrong year, an invented "Shannon Bridge Act"). Also one fabricated citation.
- `genai-verification-topics.txt`: three topics with five checkable facts each to ask the AI about (the River Shannon; Transition Year in Ireland; the Apollo 11 landing), without answers.
- `genai-red-team-prompts.txt`: three prompts each carrying one ambiguity, one missing constraint and one claim that would need checking.
- `prompt-experiment-sheet-A4.csv` and `verification-log-A2.csv`: the two sheets as headers with empty rows.
- `reusable-prompt-template.md`: a C-T-C-F skeleton with placeholders.
- Teacher key `docs/teacher/genai-sample-outputs.KEY.txt`: every claim in the sample outputs marked supported / uncertain / wrong with the checking source, and the red-team prompts' planted issues. Never under `public/`.

## Capstone (`lib/chapter-capstone.mjs`)

`CAPSTONES.block4 = { id: "block4-capstone", title: "Prompt Lab review", brief: <a student used one weak prompt to prepare a talk on renewable energy in Ireland; the output is fluent and includes two figures and a citation>, prompts: [ (1) rebuild the prompt with C-T-C-F and say what each part adds; (2) which claims in the output need verification, how you would check them, and what a hallucination would look like here; (3) how asking "Why is wind better than solar?" instead of "Compare wind and solar" would change the answer, and what that means for the student's responsibility ] }`. Block4-only vocabulary in the scoring regexes (concept: `prompt|context|constraint|format|iteration|hallucinat\w*|verif\w*|source|framing|confirmation bias|pattern|llm|generative`; action: `rebuild|check|verify|compare|cite|ask questions`); Chapters 1–3 scoring unchanged.

## Project brief (`lib/project-briefs.mjs`)

`block4`: title "Prompt Experiment Report", role "Junior AI Research Assistant", client "Training centre learning team", objective from the mission, acceptance criteria from the docx descriptors, deliverables: "Prompts v1, v2, v3 with outputs (Sheet A4)", "Output comparison notes", "Three-claim verification log (Sheet A2)", "Four-roles record", "Reusable prompt template", "Final recommendation". `summariseActivity` gains the `prompt` kind (versions joined as `v1: <prompt> → <better>`).

## Server

`requiredSessions.block4 = ['b4s1','b4s2','b4s3','b4s4','b4s5','b4s6','b4s7','b4s8','b4s9','b4s10']`.

## Tests

- `tests/v21.test.mjs`: four chapters, durations 120/240/180/240.
- New `tests/genai-prompting.test.mjs`: block shape per contract, key words, myths/selfCheck/levelUp, tool and safety notes, `prompt` renderer and ready rules, builder compose, server list, capstone vocabulary gating, downloads exist and teacher key outside public, sample outputs contain at least one claim the key marks wrong.
- `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`: keep green.
- Acceptance: `CHAPTER4_SESSIONS`, `CAPSTONE4_ANSWERS`; API acceptance covers the Chapter 3→4 gate; UI acceptance and live walkthrough drive all ten sessions (prompt kind: `textarea[data-version][data-field]`, builder inputs `input[data-builder]`, `#composeV2`; chain inputs `input[data-i][data-f]`), the Chapter 4 capstone and project.

## Docs

`docs/releases/phase-5-chapter-4.md`; README line; ROADMAP current work → Phase 5 done, Phase 6 next.

## File ownership

| Agent | Owns |
| --- | --- |
| content | `curriculum.json`, `scripts/generate-datasets.mjs`, `public/datasets/*`, `docs/teacher/*`, `tests/v21.test.mjs`, `tests/experience-labs.test.mjs`, `tests/lab-datasets.test.mjs`, `docs/releases/phase-5-chapter-4.md`, `README.md`, `ROADMAP.md` |
| student-ui | `app.js`, `index.html`, `styles.css`, `admin.js`, `lib/chapter-capstone.mjs`, `lib/project-briefs.mjs`, `tests/chapter-capstone.test.mjs`, `tests/genai-prompting.test.mjs` |
| workspace-api | `project-workspace.js`, `functions/api/[[path]].js`, `tests/project-workspace*.test.mjs`, `tests/cloudflare-runtime.test.mjs`, `tests/acceptance/*` |

Selector contract: prompt kind container `.prompt-lab`; builder inputs `input[data-builder="context|task|constraints|format"]`; compose button `#composeV2`; version fields `textarea[data-version="v1"][data-field="prompt"]` etc.; extras `textarea[data-extra="0"]`; chain inputs `input[data-i][data-f]`; myths `#mythBusters`; self-check `.self-check`.
