export const PROJECT_BRIEFS = {
  block2: {
    id: 'block2',
    chapter: 'Teaching a Machine',
    title: 'Model Reliability Investigation',
    role: 'Junior ML Test Engineer',
    client: 'School AI Lab',
    objective: 'Train, test, break, diagnose and improve a two-class visual classifier, then make an evidence-based recommendation about whether it is reliable enough for its intended task.',
    acceptanceCriteria: [
      'Record the two classes and the training conditions used for model V1.',
      'Test the model with unseen examples and record the results.',
      'Identify at least one failure condition or shortcut pattern.',
      'Use confusion/error evidence to explain what went wrong.',
      'Make a targeted improvement and compare V1 with V2.',
      'Give a final recommendation and name one remaining limitation.'
    ],
    deliverables: [
      'Model setup record',
      'Unseen test evidence',
      'Confusion/error evidence',
      'Failure or shortcut analysis',
      'V1 → V2 improvement evidence',
      'Final recommendation'
    ],
    prompts: {
      recommendation: 'Based on your evidence, would you recommend this model for its intended task? Explain what improved and what limitation still remains.'
    }
  },
  block3: {
    id: 'block3',
    chapter: 'Data Detective',
    title: 'Responsible Data Investigation',
    role: 'Junior Data Analyst',
    client: 'School Activities Office',
    objective: 'Audit one digital service at category level, then design a Responsible Data Card for it: what is collected, why, what is inferred, the risks, what controls users have, and what should not be collected at all. Apply the same thinking to the club-recommendation dataset and redesign its data plan.',
    acceptanceCriteria: [
      'Audit one service at category level and record the categories of data it says it collects, including anything surprising or vague.',
      'Tell collected data from inferred data and explain purpose, user benefit, risk and minimisation for at least five data categories.',
      'Evaluate who is represented in the club sign-up dataset, record who is missing or misrepresented, and propose safeguards.',
      'Justify why some available data should not be used at all, even if it is public or consented.',
      'Redesign the data plan, before and after: fields removed, a representation check added, how long data is kept, and which decisions need a human.',
      'Complete the Responsible Data Card (Sheet A5) and give a final recommendation with one remaining limitation.'
    ],
    deliverables: [
      'Data category audit',
      'Collection → purpose → benefit → risk chains',
      'Dataset fairness findings',
      'Better data plan: before and after',
      'Responsible Data Card (Sheet A5)',
      'Final recommendation'
    ],
    prompts: {
      recommendation: 'Based on your audit and your better data plan, should the School Activities Office use this data for the club-recommendation system? Explain what you removed, who was missing, which decisions need a human, and what the data must not be used for.'
    }
  },
  block4: {
    id: 'block4',
    chapter: 'Generative AI & Prompting',
    title: 'Prompt Experiment Report',
    role: 'Junior AI Research Assistant',
    client: 'Training centre learning team',
    objective: 'Run a three-version prompt experiment: v1 weak, v2 improved, v3 tested and revised. Keep the outputs. Then produce a verification log for at least three factual claims the AI made, and turn what you learned into a prompt template you would actually reuse.',
    acceptanceCriteria: [
      'Write a usable prompt, record what the output did, and notice where outputs differ between runs or models.',
      'Improve the prompt systematically: rebuild it with C-T-C-F, then add one thing at a time, and record v1, v2 and v3 with their outputs on Sheet A4.',
      'Verify at least three factual claims the AI made against independent sources and label each one supported, uncertain or wrong on Sheet A2.',
      'Try the AI as tutor, brainstorm partner, critic and transformer, and name the risk you saw in each role.',
      'Build criteria to judge outputs, compare the outputs critically, and explain how framing and confirmation bias affected the answers you got.',
      'Give a final recommendation: a reusable prompt template, when you would use it again, and what you would still check by hand.'
    ],
    deliverables: [
      'Prompts v1, v2, v3 with outputs (Sheet A4)',
      'Output comparison notes',
      'Three-claim verification log (Sheet A2)',
      'Four-roles record',
      'Reusable prompt template',
      'Final recommendation'
    ],
    prompts: {
      recommendation: 'Based on your experiment and your verification log, which prompt would you actually reuse, and why? Explain what changed between v1, v2 and v3, which claims turned out to be wrong or uncertain, and what you would still check by hand before relying on an answer.'
    }
  },
  block5: {
    id: 'block5',
    chapter: 'Trust, Bias & Misinformation',
    title: 'AI News Detective Report',
    role: 'Junior Trust & Safety Analyst',
    client: 'Training centre communications team',
    objective: 'Investigate one AI-generated article or set of claims. Produce an evidence table, identify at least one bias risk, and publish a corrected version with the uncertain parts clearly marked.',
    acceptanceCriteria: [
      'Mark up the AI-written article: factual claims, emotional framing, missing sources and unsupported certainty, with a count of each.',
      'Verify at least three claims laterally against independent sources, say whether each source is independent of the original or repeating it, and label each claim supported, uncertain or wrong on Sheet A2.',
      'Trace at least one claim back towards its origin and say where context was lost or changed.',
      'Identify bias risks at the four stations and in the simulator: where bias enters (the data, the design, how people use it), who is affected, and which kind of bias it is (selection, representation, framing, automation, proxy).',
      'Publish a corrected version that keeps only the verified claims, labels anything uncertain as uncertain, adds real sources and takes out the loaded framing.',
      'Write a personal three-step trust rule, then give a final recommendation that explains what is still uncertain after your checking.'
    ],
    deliverables: [
      'Annotated AI output',
      'Verification table (Sheet A2)',
      'Bias analysis (stations and simulator)',
      'Corrected version',
      'Personal three-step trust rule',
      'Final recommendation'
    ],
    prompts: {
      recommendation: 'Based on your verification table and your bias analysis, should the communications team publish anything based on this article? Explain which claims held up, which were wrong or uncertain, what you took out and why, where bias could enter a system like this, and what you would still want to check before anyone relies on it.'
    }
  },
  block6: {
    "id": "block6",
    "chapter": "AI for Learning & Work",
    "title": "AI-assisted Workplace Briefing",
    "role": "Junior Operations Assistant",
    "client": "Training centre events team",
    "objective": "Complete a mini workflow that combines an AI tutor task with one spreadsheet, document or presentation task, and show the human checks you performed along the way.",
    "acceptanceCriteria": [
      "Use AI for a learning or productivity task with support; keep the tutor prompt, learning note and explanation without AI.",
      "Preserve, profile, define rules, clean and validate the spreadsheet, logging justified changes and unresolved flags.",
      "Show spreadsheet and claim checks for every numerical and factual claim, and produce a corrected work product.",
      "Explain what AI contributed and what you retained responsibility for in the briefing and editing decisions.",
      "Design a repeatable workflow with explicit human checkpoints and rejected AI suggestions with reasons.",
      "Justify disclosure choices and give a final recommendation naming what can be relied on and what remains unresolved."
    ],
    "deliverables": [
      "AI tutor prompt and learning note",
      "Spreadsheet, document or presentation",
      "Data Cleaning Log and validation evidence",
      "Filled human-review checklist",
      "Professional briefing and editing decisions",
      "Disclosure choices",
      "AI-use learning contract",
      "Final recommendation"
    ],
    "prompts": {
      "recommendation": "What can the events team rely on, what remains unresolved, which decisions require a human and when should AI use be disclosed? Keep the workbook locally; import the six lab stages and add b6s7 disclosure choices with Add evidence. Paste compact cleaning log, formulas, results and final summary into notes; a filename alone is not evidence. Keep imported notes within 4,000 characters and add extra evidence notes for overflow."
    }
  }
};

export function emptyProjectWorkspace() {
  return {
    workLog: [],
    evidence: [],
    finalRecommendation: ''
  };
}

// Evidence links are rendered as clickable anchors for teachers, so only
// absolute http(s) URLs are accepted. Anything else (javascript:, data:, etc.)
// is dropped rather than stored.
export function safeEvidenceUrl(value='') {
  const raw = String(value || '').trim().slice(0, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function validProjectId(projectId='') {
  return Object.prototype.hasOwnProperty.call(PROJECT_BRIEFS, projectId);
}

export function projectReadyForSubmission(workspace={}) {
  const workLog = Array.isArray(workspace.workLog) ? workspace.workLog : [];
  const evidence = Array.isArray(workspace.evidence) ? workspace.evidence : [];
  const recommendation = String(workspace.finalRecommendation || '').trim();
  const meaningfulLog = workLog.some(entry => String(entry?.did || '').trim().length >= 20 && String(entry?.result || '').trim().length >= 15);
  const meaningfulEvidence = evidence.filter(item => String(item?.note || '').trim().length >= 15 || Boolean(safeEvidenceUrl(item?.url)));
  return meaningfulLog && meaningfulEvidence.length >= 3 && recommendation.length >= 60;
}
