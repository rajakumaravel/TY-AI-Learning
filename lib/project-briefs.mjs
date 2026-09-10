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
