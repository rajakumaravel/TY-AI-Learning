export const EXPERIENCE_LABS = {
  'block1-recognition': {
    id:'block1-recognition',
    blockId:'block1',
    title:'Recognition Explorer',
    tool:'Google Quick, Draw!',
    toolUrl:'https://quickdraw.withgoogle.com/',
    sessionIds:['b1s1'],
    safety:'Draw ordinary objects only. Do not enter names, faces, private information or anything that identifies you or another person.',
    mission:'Test how an AI recognition system responds when you change the way the same type of object is drawn.',
    fields:[
      ['prediction','Before you start, what do you predict the AI will recognise easily or struggle with?'],
      ['trial1Object','Trial 1 — what object did you draw?'],
      ['trial1Result','Trial 1 — what did the AI guess and what happened?'],
      ['change','What did you change in your second drawing?'],
      ['trial2Result','Trial 2 — what did the AI guess and what changed?'],
      ['unexpected','What surprised you or failed?'],
      ['conclusion','What does this tell you about AI pattern recognition or its limitations?']
    ],
    required:['prediction','trial1Object','trial1Result','change','trial2Result','conclusion'],
    evidenceLabel:'Recognition Explorer experiment',
    feeds:['capstone:block1']
  },
  'block2-model': {
    id:'block2-model',
    blockId:'block2',
    title:'Train, Break, Improve',
    tool:'Google Teachable Machine',
    toolUrl:'https://teachablemachine.withgoogle.com/',
    sessionIds:['b2s2','b2s3','b2s4','b2s5','b2s6','b2s7'],
    safety:'Use ordinary objects rather than faces or personal/sensitive images. Do not upload identifying material. If camera use is not appropriate, use school-approved non-identifying sample images instead.',
    mission:'Train a two-class model, deliberately find where it fails, diagnose a shortcut or weakness, improve it and retest using evidence.',
    fields:[
      ['classes','What two safe object classes are you training?'],
      ['prediction','Before training, what case do you predict will be weakest?'],
      ['training','How did you vary the V1 training examples?'],
      ['v1Result','What happened in your unseen V1 tests? Include accuracy or a concise result.'],
      ['failure','What failure condition did you deliberately find?'],
      ['shortcut','What happened in your shortcut/background experiment?'],
      ['change','What did you change before training V2?'],
      ['v2Result','What happened when you retested V2 fairly?'],
      ['comparison','How did V2 compare with V1?'],
      ['limitation','What important limitation still remains?']
    ],
    required:['classes','prediction','training','v1Result','failure','shortcut','change','v2Result','comparison','limitation'],
    evidenceLabel:'Train, Break, Improve lab evidence',
    feeds:['project:block2','capstone:block2']
  }
};

export function getLab(id){ return EXPERIENCE_LABS[id] || null; }
export function labForSession(sessionId){ return Object.values(EXPERIENCE_LABS).find(l=>l.sessionIds.includes(sessionId)) || null; }
export function emptyLabEvidence(){ return { answers:{}, status:'not_started' }; }
export function sanitizeLabEvidence(value={}){
  const answers={};
  if(value?.answers && typeof value.answers==='object'){
    for(const [k,v] of Object.entries(value.answers)) answers[String(k).slice(0,80)] = String(v ?? '').slice(0,4000);
  }
  const allowed=new Set(['not_started','in_progress','complete']);
  return {answers,status:allowed.has(value?.status)?value.status:'in_progress'};
}
export function labComplete(lab,evidence){
  if(!lab||!evidence?.answers)return false;
  return lab.required.every(k=>String(evidence.answers[k]||'').trim().length>=12);
}
export function labSummary(lab,evidence){
  if(!lab)return '';
  const a=evidence?.answers||{};
  if(lab.id==='block1-recognition') return [
    `Prediction: ${a.prediction||''}`,
    `Trial 1: ${a.trial1Object||''} — ${a.trial1Result||''}`,
    `Changed input: ${a.change||''}`,
    `Trial 2: ${a.trial2Result||''}`,
    `Unexpected/failure: ${a.unexpected||''}`,
    `Conclusion: ${a.conclusion||''}`
  ].filter(Boolean).join('\n');
  return [
    `Classes: ${a.classes||''}`,
    `Predicted weak case: ${a.prediction||''}`,
    `V1 training: ${a.training||''}`,
    `V1 result: ${a.v1Result||''}`,
    `Failure found: ${a.failure||''}`,
    `Shortcut experiment: ${a.shortcut||''}`,
    `V2 change: ${a.change||''}`,
    `V2 result: ${a.v2Result||''}`,
    `Comparison: ${a.comparison||''}`,
    `Remaining limitation: ${a.limitation||''}`
  ].filter(Boolean).join('\n');
}
