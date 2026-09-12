// Pilot analytics: aggregates only, per ADR-008 §3. Every exported measure returns counts and distributions,
// never a learner id, a display name or a reviewed_by. Any cell counting fewer than five learners is suppressed
// server-side — the caller must not be able to recover the raw number, so a suppressed cell carries a label, not a zero.
import COURSE from '../curriculum.json' with { type: 'json' };

export const LEVELS=['Getting started','Getting there','Going further'];
export const SUPPRESS_THRESHOLD=5;
export const SUPPRESSED_LABEL='suppressed (fewer than 5)';
export const SUPPRESSION_NOTE='Any figure covering fewer than five learners is shown as "suppressed (fewer than 5)", never as a blank or a zero, so a small pilot group cannot be identified from a count.';

const blockSessionIds=(block)=>block.sessions.map((s)=>s.id);
const labSessionsByBlock=COURSE.blocks.map((block)=>({blockId:block.id,sessionIds:block.sessions.filter((s)=>s.activity?.kind==='lab').map((s)=>s.id)})).filter((b)=>b.sessionIds.length);
const orderedSessionsWithBlock=COURSE.blocks.flatMap((block)=>block.sessions.map((s)=>({sessionId:s.id,blockId:block.id})));

export function cell(count){
  return count<SUPPRESS_THRESHOLD?{suppressed:true,label:SUPPRESSED_LABEL}:{suppressed:false,count};
}

function completedSet(state){
  return new Set(Array.isArray(state?.completed)?state.completed:[]);
}
function chapterDone(completed,block){
  return blockSessionIds(block).every((id)=>completed.has(id));
}

// Measure 1: how many chapters each learner has fully completed, bucketed 0..number of chapters.
export function computeCompletion(learnerStates){
  const buckets=new Array(COURSE.blocks.length+1).fill(0);
  for(const state of learnerStates){
    const completed=completedSet(state);
    const chaptersDone=COURSE.blocks.filter((block)=>chapterDone(completed,block)).length;
    buckets[chaptersDone]+=1;
  }
  return {measure:'completion',buckets:buckets.map((count,chaptersCompleted)=>({chaptersCompleted,...cell(count)}))};
}

function reviewedPairs(formativeAssessments,chapterAssessments){
  const rows=[...formativeAssessments,...chapterAssessments];
  return rows.filter((r)=>r&&r.teacherLevel&&LEVELS.includes(r.suggestedLevel)&&LEVELS.includes(r.teacherLevel));
}

// Measure 2: distribution of level change between the suggested level and the teacher's level, across both kinds of assessment.
export function computeImprovement(formativeAssessments,chapterAssessments){
  const pairs=reviewedPairs(formativeAssessments,chapterAssessments);
  const counts={improved:0,same:0,declined:0};
  for(const {suggestedLevel,teacherLevel} of pairs){
    const diff=LEVELS.indexOf(teacherLevel)-LEVELS.indexOf(suggestedLevel);
    counts[diff>0?'improved':diff<0?'declined':'same']+=1;
  }
  return {measure:'improvement',categories:Object.entries(counts).map(([change,count])=>({change,...cell(count)}))};
}

// Measure 3: for each learner, the chapter containing their last completed session; learners with no completed session fall in "none".
export function computeDropoff(learnerStates){
  const counts=Object.fromEntries(COURSE.blocks.map((b)=>[b.id,0]));
  counts.none=0;
  for(const state of learnerStates){
    const completed=completedSet(state);
    const last=[...orderedSessionsWithBlock].reverse().find((s)=>completed.has(s.sessionId));
    counts[last?last.blockId:'none']+=1;
  }
  return {measure:'dropoff',chapters:[...COURSE.blocks.map((b)=>b.id),'none'].map((blockId)=>({blockId,...cell(counts[blockId])}))};
}

// Measure 4: suggested level against teacher level, with no reviewed_by anywhere in the shape.
export function computeAgreement(formativeAssessments,chapterAssessments){
  const pairs=reviewedPairs(formativeAssessments,chapterAssessments);
  const matrix=[];
  for(const suggestedLevel of LEVELS){
    for(const teacherLevel of LEVELS){
      const count=pairs.filter((p)=>p.suggestedLevel===suggestedLevel&&p.teacherLevel===teacherLevel).length;
      matrix.push({suggestedLevel,teacherLevel,...cell(count)});
    }
  }
  return {measure:'agreement',matrix};
}

// Measure 5: learners completing every lab-kind session in a chapter, for the chapters that have an Experience Lab.
export function computeLabCompletion(learnerStates){
  return {measure:'labs',chapters:labSessionsByBlock.map(({blockId,sessionIds})=>{
    const count=learnerStates.filter((state)=>{const completed=completedSet(state);return sessionIds.every((id)=>completed.has(id));}).length;
    return {blockId,...cell(count)};
  })};
}

// Person/place-name heuristic: conservative and deliberately over-eager. Any capitalised word that is not the first
// word of its sentence is treated as a possible name, and any digit run is treated as a possible identifying number
// (age, phone, house number). Ineligible text is dropped rather than shown, per ADR-008's "ship without quotations" fallback.
function looksIdentifying(text){
  if(/\d/.test(text))return true;
  const sentences=String(text).split(/(?<=[.!?])\s+/);
  return sentences.some((sentence)=>{
    const words=sentence.trim().split(/\s+/).filter(Boolean);
    return words.slice(1).some((word)=>/^[A-Z][a-z]+$/.test(word.replace(/[.,!?'"]+$/,'')));
  });
}

// Measure 6: unattributed quotations from the chapter-8 individual reflection and the chapter-4 exit rule only.
// Suppressed the same way as a count: fewer than five learners contributing an eligible quotation ships no quotations at all.
export function computeFeedback(learnerStates){
  const eligible=[];
  for(const state of learnerStates){
    const texts=[state?.activity?.b8s8?.['8'],state?.activity?.b4s10?.['0']].map((t)=>String(t||'').trim()).filter((t)=>t.length>=15&&t.length<=400);
    const safe=texts.filter((t)=>!looksIdentifying(t));
    if(safe.length)eligible.push(safe);
  }
  const contributingLearners=eligible.length;
  if(contributingLearners<SUPPRESS_THRESHOLD)return {measure:'feedback',suppressed:true,label:SUPPRESSED_LABEL,quotes:[]};
  return {measure:'feedback',suppressed:false,quotes:eligible.flat()};
}

export function computePilotAnalytics({learnerStates=[],formativeAssessments=[],chapterAssessments=[]}={}){
  return {
    note:SUPPRESSION_NOTE,
    completion:computeCompletion(learnerStates),
    improvement:computeImprovement(formativeAssessments,chapterAssessments),
    dropoff:computeDropoff(learnerStates),
    agreement:computeAgreement(formativeAssessments,chapterAssessments),
    labs:computeLabCompletion(learnerStates),
    feedback:computeFeedback(learnerStates)
  };
}
