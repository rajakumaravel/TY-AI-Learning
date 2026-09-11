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
