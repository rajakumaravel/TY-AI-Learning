export const CAPSTONES = {
  block1: {
    id: 'block1-capstone',
    title: 'Junior AI adviser challenge',
    brief: 'Your school is considering an AI system that recommends after-school activities using student interests and interaction data. Act as a junior AI adviser and explain how the system should be used responsibly.',
    prompts: [
      'Map the system as INPUT → AI ACTION → OUTPUT. Be specific about what data goes in and what recommendation comes out.',
      'Identify one useful benefit, one realistic risk, and at least one other stakeholder who could be affected.',
      'What decision should remain with a human, and why?'
    ]
  },
  block2: {
    id: 'block2-capstone',
    title: 'Model failure investigation',
    brief: 'You are given a two-class image model with 80% accuracy. In 10 unseen tests it got 8 correct, but two cups photographed on dark backgrounds were predicted as bottles. Most cup training images used light backgrounds and most bottle images used dark backgrounds. Investigate the failure like a junior model tester.',
    prompts: [
      'What does the 80% accuracy tell you, and what does it fail to tell you about the model?',
      'What shortcut may the model have learned? Explain the evidence for your diagnosis.',
      'Describe one targeted change to the training data and a fair retest plan that would show whether the change improved the model.'
    ]
  },
  block3: {
    id: 'block3-capstone',
    title: 'Responsible Data Card review',
    brief: 'A homework-help app logs every question a student asks, when they ask it and how long they spend on each answer. From that log the developers infer an ability band for each student, which they want to show to teachers and use to decide who gets extra practice. Review the app like a junior data analyst before it is used, at category level only.',
    prompts: [
      'What does the app collect, what does it observe and what does it infer? For each one, say whether it is genuinely needed to help with homework, and why or why not.',
      'Who could be missing or misrepresented in this data, and what could go wrong for them?',
      'What should not be collected at all, what should need a human review before anything happens to a student, and why does "the data is public" or "they consented" not settle it?'
    ]
  },
  block4: {
    id: 'block4-capstone',
    title: 'Prompt Lab review',
    brief: 'A student preparing a talk on renewable energy in Ireland typed one weak prompt, "Tell me about renewable energy in Ireland", into an AI chat tool and copied the answer straight into their notes. The output is fluent, includes two figures (a percentage of electricity from wind and a year for a government target) and ends with a citation to a report. Review the prompt and the output like a junior AI research assistant before the talk is written.',
    prompts: [
      'Rebuild the prompt with C-T-C-F (context, task, constraints, format). Write the new prompt, then say what each of the four parts adds that the weak prompt was missing.',
      'Which claims in the output need verification, how exactly would you check each one, and what would a hallucination look like in this output? Include the citation.',
      'How would asking "Why is wind better than solar?" instead of "Compare wind and solar" change the answer, and what does that mean for the student\'s own responsibility for what goes in the talk?'
    ]
  }
};

const words=(text='')=>String(text).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
const clamp=n=>Math.max(0,Math.min(2,n));
export function levelFromScore(score){if(score>=7)return 'Going further';if(score>=4)return 'Getting there';return 'Getting started'}

export function assessChapterCapstone({blockId,answers={}}){
  const combined=Object.values(answers).map(v=>String(v||'').trim()).filter(Boolean).join(' ');
  const count=words(combined).length;
  const answerCount=Object.values(answers).filter(v=>String(v||'').trim().length>=25).length;
  const hasConcept=new RegExp('\\b(input|data|pattern|predict|prediction|recommend|accuracy|confusion|shortcut|training|test|model|output|missing|duplicate|inconsistent|imbalance|sensitive|inferred|volunteered|observed'+(blockId==='block3'?'|gdpr|consent|minimis\\w*|retention|cookies?|tracking|scraping|represent\\w*|purpose|public':'')+(blockId==='block4'?'|prompt|context|constraint|format|iteration|hallucinat\\w*|verif\\w*|source|framing|confirmation bias|pattern|llm|generative':'')+')\\b','i').test(combined);
  const hasEvidence=new RegExp('\\b(because|evidence|result|8|80|dark|light|background|stakeholder|benefit|risk|example'+(blockId==='block3'?'|column|row|field|category|question|log|ability|band|homework|teacher|practice':'')+(blockId==='block4'?'|figure|citation|report|wind|solar|renewable|energy|talk|claim|percentage|year':'')+')\\b','i').test(combined);
  const hasReason=/\b(because|therefore|so|this shows|which means|however|depends|if|why)\b/i.test(combined);
  const hasAction=new RegExp('\\b(human|check|review|retrain|retest|vary|balance|change|compare|oversight|decide|remove|collect|consent|anonymise|anonymize|flag|fix'+(blockId==='block3'?'|minimis\\w*|retention|delete|keep|safeguard':'')+(blockId==='block4'?'|rebuild|check|verify|compare|cite|ask questions':'')+')\\b','i').test(combined);
  const understanding=clamp((count>=55?1:0)+(hasConcept?1:0));
  const evidence=clamp((answerCount>=3?1:0)+(hasEvidence?1:0));
  const reasoning=clamp((hasReason?1:0)+(hasAction?1:0));
  const ownWords=clamp(count>=80?2:count>=35?1:0);
  const score=understanding+evidence+reasoning+ownWords;
  const strengths=[];const next=[];
  if(understanding===2)strengths.push('You used the chapter concepts accurately in a new scenario.');
  if(evidence===2)strengths.push('You supported your judgement with concrete evidence from the scenario.');
  if(reasoning===2)strengths.push('You explained why the evidence matters and recommended an action.');
  if(ownWords===2)strengths.push('You developed the response fully in your own words.');
  if(understanding<2)next.push('Use the chapter vocabulary to explain what the system or model is actually doing.');
  if(evidence<2)next.push('Point to a specific detail from the scenario as evidence for your judgement.');
  if(reasoning<2)next.push('Explain why the evidence leads to your conclusion and what action should follow.');
  if(ownWords<2)next.push('Develop each answer further so your own reasoning is visible.');
  return {level:levelFromScore(score),score,criteria:{understanding,evidence,reasoning,ownWords},strengths:strengths.slice(0,2),nextSteps:next.slice(0,2),formative:true};
}
