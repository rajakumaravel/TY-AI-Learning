const clamp=(n)=>Math.max(0,Math.min(2,n));

export function levelFromScore(score){
  if(score>=7)return 'Going further';
  if(score>=4)return 'Getting there';
  return 'Getting started';
}

function tokens(text=''){
  return String(text).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
}

export function copiedStudyRatio(response='',study=''){
  const a=tokens(response),b=new Set(tokens(study));
  if(!a.length||!b.size)return 0;
  return a.filter(t=>b.has(t)).length/a.length;
}

export function assessReflection({reflection='',activity={},studyText=''}){
  const text=String(reflection).trim();
  const wordCount=tokens(text).length;
  const evidenceCount=activity&&typeof activity==='object'?(['marks','runs','findings'].reduce((n,k)=>n+(Array.isArray(activity[k])?activity[k].length-1:0),0)+Object.keys(activity).length):0;
  const hasExample=/\b(example|for example|such as|when|during|tested|test|result|found|noticed|observed)\b/i.test(text);
  const hasReason=/\b(because|therefore|so that|which means|this shows|as a result|however|although|but)\b/i.test(text);
  const hasLimit=/\b(risk|limit|wrong|error|bias|fair|privacy|uncertain|improve|different|depends|human)\b/i.test(text);
  const overlap=copiedStudyRatio(text,studyText);

  const understanding=clamp(wordCount>=45?2:wordCount>=18?1:0);
  const evidence=clamp((hasExample?1:0)+(evidenceCount>=2?1:0));
  const reasoning=clamp((hasReason?1:0)+(hasLimit?1:0));
  const ownWords=clamp(overlap<0.55&&wordCount>=25?2:overlap<0.72&&wordCount>=12?1:0);
  const score=understanding+evidence+reasoning+ownWords;
  const level=levelFromScore(score);

  const strengths=[]; const next=[];
  if(understanding===2)strengths.push('You explained the idea with enough detail to show understanding.');
  if(evidence===2)strengths.push('You connected your explanation to evidence from the activity.');
  if(reasoning===2)strengths.push('You explained why the result matters, including a limitation, risk or improvement.');
  if(ownWords===2)strengths.push('Your response is expressed in your own words rather than repeating the study text.');
  if(understanding<2)next.push('Explain the main idea more clearly in your own words.');
  if(evidence<2)next.push('Use one concrete example or result from what you actually tested.');
  if(reasoning<2)next.push('Add why the result happened or why it matters in a real situation.');
  if(ownWords<2)next.push('Rephrase the idea and connect it to your own activity rather than echoing the study material.');

  return {level,score,criteria:{understanding,evidence,reasoning,ownWords},strengths:strengths.slice(0,2),nextSteps:next.slice(0,2),wordCount,studyOverlap:Number(overlap.toFixed(2)),formative:true};
}
