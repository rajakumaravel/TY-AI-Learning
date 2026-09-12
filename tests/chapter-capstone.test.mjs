import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAPSTONES, assessChapterCapstone } from '../lib/chapter-capstone.mjs';

const app=fs.readFileSync('app.js','utf8');
const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const adr=fs.readFileSync('docs/decisions/ADR-004-chapter-capstone-assessment.md','utf8');

test('pilot chapters each have applied capstones',()=>{
  assert.equal(Object.keys(CAPSTONES).length,8);
  assert.match(CAPSTONES.block1.brief,/school|adviser/i);
  assert.match(CAPSTONES.block2.brief,/model|failure/i);
  assert.match(CAPSTONES.block3.brief,/homework.*question.*infer.*ability band/is);
  assert.equal(CAPSTONES.block3.id,'block3-capstone');
  assert.equal(CAPSTONES.block3.title,'Responsible Data Card review');
  assert.equal(CAPSTONES.block3.prompts.length,3);
  assert.match(CAPSTONES.block4.brief,/weak prompt.*renewable energy in Ireland.*two figures.*citation/is);
  assert.equal(CAPSTONES.block4.id,'block4-capstone');
  assert.equal(CAPSTONES.block4.title,'Prompt Lab review');
  assert.equal(CAPSTONES.block4.prompts.length,3);
  assert.match(CAPSTONES.block5.brief,/group chat.*screenshot.*discipline prediction.*likely to cause trouble.*a study.*forty accounts.*two news sites/is);
  assert.equal(CAPSTONES.block5.id,'block5-capstone');
  assert.equal(CAPSTONES.block5.title,'AI Investigator review');
  assert.equal(CAPSTONES.block5.prompts.length,3);
  assert.match(CAPSTONES.block6.brief,/placement team.*workshop feedback.*12 returned forms.*one exact duplicate.*two unanswered rating cells.*AI tutor.*every attendee was satisfied.*next workshop will be more popular.*disclosing AI assistance/is);
  assert.equal(CAPSTONES.block6.id,'block6-capstone');
  assert.equal(CAPSTONES.block6.title,'Digital Collaborator review');
  assert.equal(CAPSTONES.block6.prompts.length,3);
  assert.match(CAPSTONES.block7.brief,/community bus service.*45 of 50 standard bookings.*14 of 20 phone-assisted bookings.*48 of 50.*12 of 20.*four staff hours.*90 days.*winter demand.*pilot, human\+AI, full automation and no deployment/is);
  assert.equal(CAPSTONES.block7.id,'block7-capstone');
  assert.equal(CAPSTONES.block7.title,'Future Thinker review');
  assert.equal(CAPSTONES.block7.prompts.length,3);
  assert.match(CAPSTONES.block8.brief,/community centre.*noticeboard.*three testers.*good.*success criteria written in the same session.*AI might be wrong sometimes.*residual risk of “none”.*no non-AI option/is);
  assert.equal(CAPSTONES.block8.id,'block8-capstone');
  assert.equal(CAPSTONES.block8.title,'AI Innovator review');
  assert.equal(CAPSTONES.block8.prompts.length,3);
});

test('block8 capstone scoring counts innovation vocabulary and the review-pack evidence',()=>{
  const weak=assessChapterCapstone({blockId:'block8',answers:{0:'The pack is fine.',1:'They tested it.',2:'It might be wrong.'}});
  const strong=assessChapterCapstone({blockId:'block8',answers:{
    0:'The pack shows a demo and photos of the noticeboard at the community centre, but the user need is never defined and there is no non-AI option, so the simplest answer is a shared events list that anyone can read.',
    1:'Three testers saying it was good is not test evidence, because a structured test would have recorded the task each tester was given, where they got confused and what failed, therefore the only change the evidence justifies is a clearer suggestion screen.',
    2:'Red-teaming the assistant, it could hallucinate an event, be biased about which events it suggests, leak a private photo, be misused or make people over-rely on it, so a named person must approve what is sent and a residual risk of none hides the safeguard that is missing.'
  }});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.evidence,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.equal(strong.level,'Going further');
  const unique='User need, success criteria, red-teaming, human oversight and value proposition with residual safeguards.';
  assert.equal(assessChapterCapstone({blockId:'block8',answers:{0:unique}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3','block4','block5','block6','block7'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:unique}}).criteria.understanding,0,`${id} ignores block8 vocabulary`);
  const packEvidence='The community centre noticeboard photos, the three testers and the demo in the pack.';
  assert.equal(assessChapterCapstone({blockId:'block8',answers:{0:packEvidence}}).criteria.evidence,1);
  for(const id of ['block1','block2','block3','block4','block5','block6','block7'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:packEvidence}}).criteria.evidence,0,`${id} ignores the review-pack evidence`);
  assert.deepEqual(assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}}).criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
});

test('block7 capstone scoring counts future-thinking vocabulary and the bus evidence',()=>{
  const weak=assessChapterCapstone({blockId:'block7',answers:{0:'AI will change things.',1:'There are three futures.',2:'I would use AI.'}});
  const strong=assessChapterCapstone({blockId:'block7',answers:{
    0:'Narrow AI could allocate standard bookings automatically, which is automation, while a driver checking an unusual request with a suggestion is augmentation; AGI is still a hypothesis, so the opportunity is released time and the risk is that phone-assisted passengers lose the staffed route.',
    1:'My three scenarios are a pilot, human review and no deployment: the sandbox served 48 of 50 standard bookings but only 12 of 20 phone-assisted bookings, therefore the trade-off falls on the passengers who need help, and the future skills that matter are judgement and communication with drivers.',
    2:'I recommend a pilot rather than full automation because the four-hour estimate excludes appeals and winter demand is unevidenced, so the service manager stays accountable, any passenger can reach a person to override a booking, and I would stop the pilot if phone-assisted errors rise.'
  }});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.evidence,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.ok(['Getting there','Going further'].includes(strong.level));
  const unique='Narrow AI, AGI, augmentation, societal impact and future skills raise a governance trade-off about inclusion and sustainability.';
  assert.equal(assessChapterCapstone({blockId:'block7',answers:{0:unique}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3','block4','block5','block6'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:unique}}).criteria.understanding,0,`${id} ignores block7 vocabulary`);
  const busEvidence='The winter bookings of phone-assisted passengers and the drivers of each bus.';
  assert.equal(assessChapterCapstone({blockId:'block7',answers:{0:busEvidence}}).criteria.evidence,1);
  for(const id of ['block1','block2','block3','block4','block5','block6'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:busEvidence}}).criteria.evidence,0,`${id} ignores the bus scenario evidence`);
  // A copied Chapter 7 retailer answer carries no bus-service evidence of its own.
  assert.equal(assessChapterCapstone({blockId:'block7',answers:{0:'Harbour Co-op released 8 hours and 100 routine retail requests were automatic.'}}).criteria.evidence,0);
  assert.deepEqual(assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}}).criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
});

test('block5 capstone scoring counts trust-and-bias vocabulary as concept and action',()=>{
  const weak=assessChapterCapstone({blockId:'block5',answers:{0:'It is probably fake.',1:'Look it up.',2:'Hard to say.'}});
  const strong=assessChapterCapstone({blockId:'block5',answers:{0:'The post never names the study, the headline is only a screenshot, and forty reposts are still one source, so the claims are unsupported; a discipline prediction system carries a representation bias risk because past discipline records over-count some students.',1:'I would stop, investigate who made the post, then find better coverage in new tabs: the training centre chain itself, a regulator and an independent news site that did not use the post as its source, and label each claim supported, uncertain or wrong before rewriting it with only the supported claims.',2:'Tracing it, both news sites copied the group chat post, so the original is one anonymous screenshot; bias could enter before the data through unequal past decisions, at labelling of what counts as trouble, and through a proxy such as postcode, therefore even after checking it is uncertain whether any such system exists.'}});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.evidence,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.ok(['Getting there','Going further'].includes(strong.level));
  const vocab='Provenance, lateral reading, proxy and lifecycle: stop, investigate, trace.';
  assert.equal(assessChapterCapstone({blockId:'block5',answers:{0:vocab}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3','block4'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:vocab}}).criteria.understanding,0,`${id} ignores block5 vocabulary`);
});

test('block4 capstone scoring counts prompting vocabulary as concept and action',()=>{
  const weak=assessChapterCapstone({blockId:'block4',answers:{0:'Make it longer.',1:'Some of it.',2:'It would be different.'}});
  const strong=assessChapterCapstone({blockId:'block4',answers:{0:'I would rebuild the prompt with context (a TY student preparing a five-minute talk), one task (list the main renewable sources with one figure each), constraints (Ireland only, say when unsure) and a format (a table with a source column), because the weak prompt gave the model nothing to aim at.',1:'The wind percentage, the target year and the citation all need verification against the SEAI or CSO report, therefore I would search for the report title; a hallucination here would be a fluent figure or an invented report that no search can find.',2:'Asking why wind is better invites confirmation bias, so the answer would argue one side and drop the trade-offs, which means I have to compare both and check the claims myself before anything goes in the talk.'}});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.evidence,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('block3 capstone scoring counts data-detective vocabulary as concept and action',()=>{
  const weak=assessChapterCapstone({blockId:'block3',answers:{0:'Some fields are fine.',1:'It could be wrong.',2:'Use it carefully.'}});
  const strong=assessChapterCapstone({blockId:'block3',answers:{0:'The question text is volunteered, the time spent is observed, and the ability band is inferred, so the band goes beyond the purpose of helping with homework and should be minimised or removed because the app does not need it.',1:'A student who shares a device or asks questions for a younger sibling could be misrepresented, therefore a low band could mean they are wrongly given extra practice or judged by a teacher.',2:'The app should not keep a full log with retention beyond the term, any decision about extra practice needs human review, and consent buried in the terms does not make the inferred band fair.'}});
  assert.ok(strong.score>weak.score);
  assert.equal(strong.criteria.understanding,2);
  assert.equal(strong.criteria.reasoning,2);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('existing chapter scoring is unchanged by the block3 and block4 keywords',()=>{
  const genai='Prompt, context, constraint, format, iteration, hallucination, verification, source, framing, confirmation bias, LLM and generative AI: rebuild, verify, cite, ask questions.';
  assert.equal(assessChapterCapstone({blockId:'block4',answers:{0:genai}}).criteria.understanding,1);
  for(const id of ['block1','block2','block3'])assert.equal(assessChapterCapstone({blockId:id,answers:{0:genai}}).criteria.understanding,0,`${id} ignores block4 vocabulary`);
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  assert.deepEqual(weak.criteria,{understanding:1,evidence:1,reasoning:1,ownWords:0});
  assert.equal(weak.level,'Getting started');
  const strong=assessChapterCapstone({blockId:'block2',answers:{0:'80% means 8 of 10 unseen examples were correct, but accuracy alone does not show which class failed or under what conditions.',1:'The dark background is likely a shortcut because cup training images were mostly light while bottle images were dark, and both failures happened to dark-background cups.',2:'I would add cups and bottles across mixed light and dark backgrounds, retrain, then rerun the same unseen test set and compare both accuracy and the direction of errors.'}});
  assert.deepEqual(strong.criteria,{understanding:2,evidence:2,reasoning:2,ownWords:1});
  assert.equal(strong.level,'Going further');
});

test('capstone scoring rewards applied reasoning',()=>{
  const weak=assessChapterCapstone({blockId:'block2',answers:{0:'Accuracy is 80%.',1:'Background.',2:'Retest.'}});
  const strong=assessChapterCapstone({blockId:'block2',answers:{0:'80% means 8 of 10 unseen examples were correct, but accuracy alone does not show which class failed or under what conditions.',1:'The dark background is likely a shortcut because cup training images were mostly light while bottle images were dark, and both failures happened to dark-background cups.',2:'I would add cups and bottles across mixed light and dark backgrounds, retrain, then rerun the same unseen test set and compare both accuracy and the direction of errors.'}});
  assert.ok(strong.score>weak.score);
  assert.ok(['Getting there','Going further'].includes(strong.level));
});

test('progression requires chapter assessment as well as session completion',()=>{
  assert.match(app,/chapterAssessments/);
  assert.match(app,/blockQualified/);
  assert.match(app,/Chapter assessment required/);
});

test('API persists and evaluates chapter capstones',()=>{
  assert.match(api,/chapter_assessments/);
  assert.match(api,/assessChapterCapstone/);
  assert.match(api,/chapter-assessment/);
});

test('ADR preserves hands-on TY progression',()=>{
  assert.match(adr,/workplace task/i);
  assert.match(adr,/practical sessions complete/i);
  assert.match(adr,/next chapter unlocks/i);
});
