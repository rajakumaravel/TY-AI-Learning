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
  },
  block5: {
    id: 'block5-capstone',
    title: 'AI Investigator review',
    brief: 'A post is spreading through a group chat. It carries a screenshot of a headline saying that a "discipline prediction" AI used by a chain of training centres flags students who are "likely to cause trouble", and it cites "a study" with no link. Forty accounts have reposted it in an hour, and two news sites have already written it up using the post as their source. Investigate it like a junior trust and safety analyst before anyone in the centre reacts to it.',
    prompts: [
      'Which claims in the post are unsupported, and what bias risk can you see in a system like the one described?',
      'How would you verify the claims using independent sources, and how would you rewrite the post so it is more trustworthy?',
      'Trace where the evidence actually comes from. Which kinds of bias could enter a discipline prediction system, and at which stage of its lifecycle? What would still be uncertain after your checking?'
    ]
  },
  block6: {
    "id": "block6-capstone",
    "title": "Digital Collaborator review",
    "brief": "A training-centre placement team has workshop feedback with 12 returned forms, one exact duplicate and two unanswered rating cells. A junior assistant asks an AI tutor to explain averages, then uses AI to draft a report claiming every attendee was satisfied and that the next workshop will be more popular. The team needs a checked briefing and a decision about disclosing AI assistance.",
    "prompts": [
      "Choose where AI can help with learning or this task. What must the assistant try or explain without AI?",
      "How would you preserve, profile, clean and validate the feedback, check the average and report claims against the available evidence, and explain what remains your responsibility?",
      "Design a repeatable workflow with explicit human checkpoints. Which AI suggestions would you reject, and why? Justify what AI use you would disclose to the placement team."
    ]
  },
  block7: {
    id: 'block7-capstone',
    title: 'Future Thinker review',
    brief: 'A community bus service is considering AI to allocate passenger booking requests. In a one-week human-run baseline the service served 45 of 50 standard bookings and 14 of 20 phone-assisted bookings. A supplier replayed the same cases in its sandbox and served 48 of 50 standard bookings and 12 of 20 phone-assisted bookings. The supplier estimates four staff hours released each week, but has not costed human appeals, stores proposed booking transcripts for 90 days and has no evidence about winter demand. Drivers want training and the authority to override; passengers want a staffed phone route to remain. The service must choose between a pilot, human+AI, full automation and no deployment, and explain the conditions it attaches.',
    prompts: [
      'Describe one plausible task change for this bus service by 2035. Distinguish automation from augmentation, say what narrow AI could do here and what AGI would mean, and identify one opportunity and one risk using the booking evidence.',
      'Compare three possible futures for the same service, including a no-deployment alternative. Explain the stakeholder trade-offs and the future skills that matter, using the booking counts and the limits of the four-hour time estimate.',
      'Make a justified final recommendation among the four approaches. Separate evidence from speculation, defend a governance choice with an accountable role and a human correction, appeal or stop route, answer the strongest objection to your choice, and state what evidence or trigger would change the recommendation.'
    ]
  },
  block8: {
    id: 'block8-capstone',
    title: 'AI Innovator review',
    brief: 'Another learner’s innovation project pack is handed in for review. Their problem is that people at a community centre miss events they would have wanted to attend, and their chosen solution is an AI assistant that reads photos of the noticeboard and sends personalised suggestions. The pack contains a demo that runs, three testers who all said it was “good”, success criteria written in the same session as the results, one risk listed as “AI might be wrong sometimes” with the safeguard “check it”, a residual risk of “none”, and no non-AI option because “AI is the point of the project”. Review the pack as the training centre would.',
    prompts: [
      'What does the pack actually show, and which pieces of the evidence are missing? Describe the simplest non-AI option for this problem and what it would cost in complexity.',
      'Which claims does the evidence not support? What would a structured test have recorded instead of three testers saying “good”, and which one change would that evidence actually justify?',
      'Red-team the assistant for hallucination, bias, privacy, misuse and over-reliance. Which decision must stay with a person, who is accountable for it, and why is “residual risk: none” the answer that most undermines the pack?'
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
  const hasConcept=blockId==='block8'?/\b(?:problem fram\w*|user need|success criteri\w*|prototyp\w*|test\w*|iterat\w*|risk\w*|responsible ai|human oversight|value proposition|red.team\w*|assumption|evidence|residual|safeguard|accountab\w*)\b/i.test(combined):blockId==='block7'?/\b(?:narrow ai|agi|automat\w*|augment\w*|scenario\w*|uncertain\w*|trade.off\w*|accountab\w*|future skills?|societal impact|governance|stakeholder\w*|inclusion|privacy|sustainab\w*)\b/i.test(combined):blockId==='block6'?/\b(?:ai tutor|scaffold\w*|metacognition|draft\w*|critique|workflow|human.in.the.loop|disclos\w*|authorship|accountab\w*|productivity|data clean\w*|validat\w*|formula|duplicate|missing)\b/i.test(combined):new RegExp('\\b(input|data|pattern|predict|prediction|recommend|accuracy|confusion|shortcut|training|test|model|output|missing|duplicate|inconsistent|imbalance|sensitive|inferred|volunteered|observed'+(blockId==='block3'?'|gdpr|consent|minimis\\w*|retention|cookies?|tracking|scraping|represent\\w*|purpose|public':'')+(blockId==='block4'?'|prompt|context|constraint|format|iteration|hallucinat\\w*|verif\\w*|source|framing|confirmation bias|pattern|llm|generative':'')+(blockId==='block5'?'|misinformation|disinformation|hallucinat\\w*|bias|selection|representation|framing|automation|provenance|lateral|independent|source|proxy|synthetic|deepfake|uncertain\\w*|lifecycle|label\\w*|deploy\\w*':'')+')\\b','i').test(combined);
  const hasEvidence=blockId==='block8'?/\b(?:community centre|noticeboard|events?|attend\w*|suggestions?|testers?|demo|pack|photos?)\b/i.test(combined):blockId==='block7'?/\b(?:bus(?:es)?|passengers?|bookings?|drivers?|phone.assisted|winter|staffed phone)\b/i.test(combined):blockId==='block6'?/\b(?:placement|workshop|feedback|ratings?|attendees?|satisf\w*|unanswered|returned forms?)\b/i.test(combined):new RegExp('\\b(because|evidence|result|8|80|dark|light|background|stakeholder|benefit|risk|example'+(blockId==='block3'?'|column|row|field|category|question|log|ability|band|homework|teacher|practice':'')+(blockId==='block4'?'|figure|citation|report|wind|solar|renewable|energy|talk|claim|percentage|year':'')+(blockId==='block5'?'|post|screenshot|headline|study|claim|discipline|flag\\w*|students?|repost\\w*|news site|original|group chat|training centre':'')+')\\b','i').test(combined);
  const hasReason=/\b(because|therefore|so|this shows|which means|however|depends|if|why)\b/i.test(combined);
  const hasAction=blockId==='block8'?/\b(?:define|frame|interview|compare|prototype|build|test|watch|iterate|improve|red.team|limit|disclose|reject|simplify|measure)\w*\b/i.test(combined):blockId==='block7'?/\b(?:recommend\w*|pilot|deploy\w*|retain|defer|compare|justify|review|appeal|override|pause|stop|monitor|retrain|consult|test|train|limit)\b/i.test(combined):blockId==='block6'?/\b(?:preserve|profile|define|clean|flag|validate|calculate|check|verify|compare|explain|reject|revise|disclose|approve)\b/i.test(combined):new RegExp('\\b(human|check|review|retrain|retest|vary|balance|change|compare|oversight|decide|remove|collect|consent|anonymise|anonymize|flag|fix'+(blockId==='block3'?'|minimis\\w*|retention|delete|keep|safeguard':'')+(blockId==='block4'?'|rebuild|check|verify|compare|cite|ask questions':'')+(blockId==='block5'?'|stop|investigate|find|trace|verify|check|label|rewrite|remove|mark|cite|compare|wait':'')+')\\b','i').test(combined);
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
