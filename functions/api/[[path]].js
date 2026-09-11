import { createClient } from '@supabase/supabase-js';
import { assessReflection } from '../../lib/assessment.mjs';
import { CAPSTONES, assessChapterCapstone } from '../../lib/chapter-capstone.mjs';
import { PROJECT_BRIEFS, emptyProjectWorkspace, projectReadyForSubmission, safeEvidenceUrl, validProjectId } from '../../lib/project-briefs.mjs';

const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const allowedLevels=new Set(['Getting started','Getting there','Going further']);
const requiredSessions={block1:['b1s1','b1s2','b1s3','b1s4'],block2:['b2s1','b2s2','b2s3','b2s4','b2s5','b2s6']};

function client(env,key){
  return createClient(env.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
function tokenFromRequest(request){
  const auth=request.headers.get('authorization');
  if(auth?.startsWith('Bearer '))return auth.slice(7);
  const cookie=request.headers.get('cookie')||'';
  const match=cookie.match(/(?:^|;\s*)sb_access_token=([^;]+)/);
  return match?decodeURIComponent(match[1]):null;
}
function adminAllowed(user,env){
  const role=user?.app_metadata?.role;
  const roles=Array.isArray(user?.app_metadata?.roles)?user.app_metadata.roles:[];
  if(role==='admin'||roles.includes('admin'))return true;
  const allowed=String(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return Boolean(user?.email&&allowed.includes(user.email.toLowerCase()));
}
async function authUser(context){
  const token=tokenFromRequest(context.request);
  if(!token)return {error:json({error:'Authentication required.'},401)};
  const supabase=client(context.env,context.env.SUPABASE_ANON_KEY);
  const {data,error}=await supabase.auth.getUser(token);
  if(error||!data.user)return {error:json({error:'Authentication required.'},401)};
  return {user:data.user,token};
}
async function requireAdmin(context){
  const auth=await authUser(context); if(auth.error)return auth;
  if(!adminAllowed(auth.user,context.env))return {error:json({error:'Administrator access required.'},403)};
  return auth;
}
async function currentLearner(context){
  const auth=await authUser(context); if(auth.error)return auth;
  const db=client(context.env,context.env.SUPABASE_SERVICE_ROLE_KEY);
  const metadata=auth.user.user_metadata||{};
  const displayName=String(metadata.full_name||metadata.name||auth.user.email?.split('@')[0]||'Student').slice(0,80);
  const {error}=await db.from('learners').upsert({user_id:auth.user.id,display_name:displayName,last_login_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)throw error;
  return {user:auth.user,learner:{id:auth.user.id,email:auth.user.email||'',displayName},db};
}
const blockOrder=Object.keys(requiredSessions);
async function chapterQualifications(db,userId){
  const {data,error}=await db.from('chapter_assessments').select('block_id,suggested_level,suggested_score,teacher_level,submitted_at').eq('user_id',userId); if(error)throw error;
  const map={}; for(const row of data||[])map[row.block_id]={submittedAt:row.submitted_at,level:row.teacher_level||row.suggested_level,score:row.suggested_score}; return map;
}
async function withServerQualifications(db,userId,state){
  const clean=state&&typeof state==='object'&&!Array.isArray(state)?state:{};
  return {...clean,chapterAssessments:await chapterQualifications(db,userId)};
}
async function previousBlockQualified(db,userId,blockId){
  const index=blockOrder.indexOf(blockId); if(index<=0)return true;
  const qualified=await chapterQualifications(db,userId); return Boolean(qualified[blockOrder[index-1]]?.submittedAt);
}
const PREVIOUS_CHAPTER_REQUIRED='Complete the previous chapter assessment before starting this chapter.';
function assessmentRecord(row){return {sessionId:row.session_id,suggestedLevel:row.suggested_level,suggestedScore:row.suggested_score,criteria:row.criteria||{},strengths:row.strengths||[],nextSteps:row.next_steps||[],teacherLevel:row.teacher_level||null,teacherComment:row.teacher_comment||null,reviewedBy:row.reviewed_by||null,assessedAt:row.assessed_at,reviewedAt:row.reviewed_at||null,effectiveLevel:row.teacher_level||row.suggested_level,formative:true}}
function chapterRecord(row){return {blockId:row.block_id,answers:row.answers||{},suggestedLevel:row.suggested_level,suggestedScore:row.suggested_score,criteria:row.criteria||{},strengths:row.strengths||[],nextSteps:row.next_steps||[],teacherLevel:row.teacher_level||null,teacherComment:row.teacher_comment||null,reviewedBy:row.reviewed_by||null,submittedAt:row.submitted_at,reviewedAt:row.reviewed_at||null,effectiveLevel:row.teacher_level||row.suggested_level,formative:true}}
function cleanWorkspace(value){const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {workLog:Array.isArray(raw.workLog)?raw.workLog.slice(0,50).map(e=>({planned:String(e?.planned||'').slice(0,2000),did:String(e?.did||'').slice(0,4000),result:String(e?.result||'').slice(0,4000),blocker:String(e?.blocker||'').slice(0,2000),decision:String(e?.decision||'').slice(0,3000),next:String(e?.next||'').slice(0,2000),minutes:Math.max(0,Math.min(600,Number(e?.minutes)||0)),date:String(e?.date||'').slice(0,32)})):[],evidence:Array.isArray(raw.evidence)?raw.evidence.slice(0,50).map(e=>({label:String(e?.label||'').slice(0,240),url:safeEvidenceUrl(e?.url),note:String(e?.note||'').slice(0,4000)})):[],finalRecommendation:String(raw.finalRecommendation||'').slice(0,8000)}}
function projectRecord(row,projectId){return {projectId,brief:PROJECT_BRIEFS[projectId],status:row?.status||'not_started',workspace:row?.workspace||emptyProjectWorkspace(),submittedSnapshot:row?.submitted_snapshot||null,createdAt:row?.created_at||null,updatedAt:row?.updated_at||null,submittedAt:row?.submitted_at||null,reviewedAt:row?.reviewed_at||null,reviewComment:row?.review_comment||null}}

async function handleCore(context,path){
  const method=context.request.method;
  const db=client(context.env,context.env.SUPABASE_SERVICE_ROLE_KEY);

  if(path==='session'&&method==='GET'){
    const auth=await currentLearner(context); if(auth.error)return auth.error;
    const {data,error}=await db.from('learner_progress').select('state').eq('user_id',auth.user.id).maybeSingle(); if(error)throw error;
    return json({authenticated:true,student:auth.learner,state:await withServerQualifications(db,auth.user.id,data?.state)});
  }
  if(path==='progress'&&method==='GET'){
    const auth=await currentLearner(context); if(auth.error)return auth.error;
    const {data,error}=await db.from('learner_progress').select('state,updated_at').eq('user_id',auth.user.id).maybeSingle(); if(error)throw error;
    return json({state:await withServerQualifications(db,auth.user.id,data?.state),updatedAt:data?.updated_at||null});
  }
  if(path==='progress'&&method==='PUT'){
    const auth=await currentLearner(context); if(auth.error)return auth.error;
    const body=await context.request.json().catch(()=>({})); const state=body.state;
    if(!state||typeof state!=='object'||Array.isArray(state))return json({error:'Invalid progress state.'},400);
    if(JSON.stringify(state).length>250000)return json({error:'Progress payload is too large.'},413);
    const trusted=await withServerQualifications(db,auth.user.id,state);
    const {error}=await db.from('learner_progress').upsert({user_id:auth.user.id,state:trusted,updated_at:new Date().toISOString()},{onConflict:'user_id'}); if(error)throw error;
    return json({ok:true});
  }
  const assessMatch=path.match(/^assessment\/([^/]+)$/);
  if(assessMatch&&method==='POST'){
    const auth=await currentLearner(context); if(auth.error)return auth.error;
    const sessionId=decodeURIComponent(assessMatch[1]).slice(0,120);
    const {data:progress,error:progressError}=await db.from('learner_progress').select('state').eq('user_id',auth.user.id).maybeSingle(); if(progressError)throw progressError;
    const state=progress?.state||{},reflection=String(state.reflections?.[sessionId]||'').trim(),activity=state.activity?.[sessionId]||{};
    if(reflection.length<20)return json({error:'Complete and save your reflection before requesting feedback.'},400);
    const body=await context.request.json().catch(()=>({})); const result=assessReflection({reflection,activity,studyText:String(body.studyText||'').slice(0,12000)});
    const payload={user_id:auth.user.id,session_id:sessionId,suggested_level:result.level,suggested_score:result.score,criteria:result.criteria,strengths:result.strengths,next_steps:result.nextSteps,assessed_at:new Date().toISOString()};
    const {data,error}=await db.from('formative_assessments').upsert(payload,{onConflict:'user_id,session_id'}).select().single(); if(error)throw error;
    return json({assessment:assessmentRecord(data)});
  }
  const chapterMatch=path.match(/^chapter-assessment\/([^/]+)$/);
  if(chapterMatch&&method==='POST'){
    const auth=await currentLearner(context); if(auth.error)return auth.error;
    const blockId=decodeURIComponent(chapterMatch[1]).slice(0,80); if(!(blockId in CAPSTONES))return json({error:'Unknown chapter assessment.'},404);
    if(!(await previousBlockQualified(db,auth.user.id,blockId)))return json({error:PREVIOUS_CHAPTER_REQUIRED},409);
    const {data:progress,error:progressError}=await db.from('learner_progress').select('state').eq('user_id',auth.user.id).maybeSingle(); if(progressError)throw progressError;
    const completed=new Set(Array.isArray(progress?.state?.completed)?progress.state.completed:[]);
    if(!(requiredSessions[blockId]||[]).every(id=>completed.has(id)))return json({error:'Complete all chapter practical sessions before submitting the chapter assessment.'},409);
    const body=await context.request.json().catch(()=>({})); const answers=body.answers&&typeof body.answers==='object'&&!Array.isArray(body.answers)?body.answers:{}; const clean={};
    for(const [key,value] of Object.entries(answers).slice(0,6))clean[String(key).slice(0,20)]=String(value||'').trim().slice(0,5000);
    if(Object.keys(clean).length<3||Object.values(clean).some(v=>v.length<25))return json({error:'Complete all chapter assessment responses with enough detail to show your reasoning.'},400);
    const result=assessChapterCapstone({blockId,answers:clean});
    const payload={user_id:auth.user.id,block_id:blockId,answers:clean,suggested_level:result.level,suggested_score:result.score,criteria:result.criteria,strengths:result.strengths,next_steps:result.nextSteps,submitted_at:new Date().toISOString()};
    const {data,error}=await db.from('chapter_assessments').upsert(payload,{onConflict:'user_id,block_id'}).select().single(); if(error)throw error;
    return json({assessment:chapterRecord(data)});
  }
  if(path==='admin/me'&&method==='GET'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error;
    return json({authorized:true,admin:{id:admin.user.id,email:admin.user.email,displayName:String(admin.user.user_metadata?.full_name||admin.user.user_metadata?.name||admin.user.email)}});
  }
  if(path==='admin/students'&&method==='GET'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error;
    const [{data:learners,error:lerr},{data:progress,error:perr},{data:formative,error:ferr},{data:chapters,error:cerr}]=await Promise.all([
      db.from('learners').select('*').order('last_login_at',{ascending:false,nullsFirst:false}),db.from('learner_progress').select('*'),db.from('formative_assessments').select('user_id,teacher_level'),db.from('chapter_assessments').select('user_id')]);
    if(lerr||perr||ferr||cerr)throw lerr||perr||ferr||cerr;
    const pmap=new Map((progress||[]).map(p=>[p.user_id,p]));
    return json({students:(learners||[]).map(l=>{const p=pmap.get(l.user_id),state=p?.state||{};const fa=(formative||[]).filter(a=>a.user_id===l.user_id);return {id:l.user_id,displayName:l.display_name,createdAt:l.created_at,lastLoginAt:l.last_login_at,updatedAt:p?.updated_at||null,completedCount:Array.isArray(state.completed)?new Set(state.completed).size:0,badgeCount:Array.isArray(state.badges)?new Set(state.badges).size:0,reflectionCount:state.reflections&&typeof state.reflections==='object'?Object.keys(state.reflections).length:0,assessmentCount:fa.length,reviewedCount:fa.filter(a=>a.teacher_level).length,chapterAssessmentCount:(chapters||[]).filter(a=>a.user_id===l.user_id).length}})});
  }
  const detail=path.match(/^admin\/student\/([^/]+)$/);
  if(detail&&method==='GET'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error; const learnerId=decodeURIComponent(detail[1]);
    const [{data:learner,error:lerr},{data:progress,error:perr},{data:assessments,error:aerr},{data:chapters,error:cerr}]=await Promise.all([db.from('learners').select('*').eq('user_id',learnerId).maybeSingle(),db.from('learner_progress').select('*').eq('user_id',learnerId).maybeSingle(),db.from('formative_assessments').select('*').eq('user_id',learnerId).order('assessed_at',{ascending:false}),db.from('chapter_assessments').select('*').eq('user_id',learnerId).order('submitted_at',{ascending:false})]);
    if(lerr||perr||aerr||cerr)throw lerr||perr||aerr||cerr; if(!learner)return json({error:'Student not found.'},404);
    return json({student:{id:learner.user_id,displayName:learner.display_name,createdAt:learner.created_at,lastLoginAt:learner.last_login_at,updatedAt:progress?.updated_at||null},state:progress?.state||{},assessments:(assessments||[]).map(assessmentRecord),chapterAssessments:(chapters||[]).map(chapterRecord)});
  }
  const review=path.match(/^admin\/assessment\/([^/]+)\/([^/]+)$/);
  if(review&&method==='PUT'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error; const learnerId=decodeURIComponent(review[1]),sessionId=decodeURIComponent(review[2]); const body=await context.request.json().catch(()=>({})); const level=String(body.level||'');
    if(!allowedLevels.has(level))return json({error:'Invalid assessment level.'},400);
    const {data,error}=await db.from('formative_assessments').update({teacher_level:level,teacher_comment:String(body.comment||'').trim().slice(0,2000),reviewed_by:admin.user.id,reviewed_at:new Date().toISOString()}).eq('user_id',learnerId).eq('session_id',sessionId).select().maybeSingle(); if(error)throw error; if(!data)return json({error:'Assessment not found.'},404); return json({assessment:assessmentRecord(data)});
  }
  const chapterReview=path.match(/^admin\/chapter-assessment\/([^/]+)\/([^/]+)$/);
  if(chapterReview&&method==='PUT'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error; const learnerId=decodeURIComponent(chapterReview[1]),blockId=decodeURIComponent(chapterReview[2]); const body=await context.request.json().catch(()=>({})); const level=String(body.level||'');
    if(!allowedLevels.has(level))return json({error:'Invalid assessment level.'},400);
    const {data,error}=await db.from('chapter_assessments').update({teacher_level:level,teacher_comment:String(body.comment||'').trim().slice(0,2000),reviewed_by:admin.user.id,reviewed_at:new Date().toISOString()}).eq('user_id',learnerId).eq('block_id',blockId).select().maybeSingle(); if(error)throw error; if(!data)return json({error:'Chapter assessment not found.'},404); return json({assessment:chapterRecord(data)});
  }
  return null;
}

async function handleProjects(context,path){
  const method=context.request.method,db=client(context.env,context.env.SUPABASE_SERVICE_ROLE_KEY);
  const student=path.match(/^projects\/([^/]+)$/);
  if(student&&['GET','PUT'].includes(method)){
    const auth=await authUser(context); if(auth.error)return auth.error; const projectId=decodeURIComponent(student[1]); if(!validProjectId(projectId))return json({error:'Unknown project.'},404);
    if(method==='GET'){const {data,error}=await db.from('student_projects').select('*').eq('user_id',auth.user.id).eq('project_id',projectId).maybeSingle(); if(error)throw error; return json({project:projectRecord(data,projectId)});}
    if(!(await previousBlockQualified(db,auth.user.id,projectId)))return json({error:PREVIOUS_CHAPTER_REQUIRED},409);
    const body=await context.request.json().catch(()=>({})),workspace=cleanWorkspace(body.workspace); if(JSON.stringify(workspace).length>150000)return json({error:'Project workspace is too large.'},413);
    const {data:existing,error:eerr}=await db.from('student_projects').select('status').eq('user_id',auth.user.id).eq('project_id',projectId).maybeSingle(); if(eerr)throw eerr;
    const {data,error}=await db.from('student_projects').upsert({user_id:auth.user.id,project_id:projectId,status:existing?.status==='reviewed'?'reviewed':'in_progress',workspace,updated_at:new Date().toISOString()},{onConflict:'user_id,project_id'}).select().single(); if(error)throw error; return json({project:projectRecord(data,projectId)});
  }
  const submit=path.match(/^projects\/([^/]+)\/submit$/);
  if(submit&&method==='POST'){
    const auth=await authUser(context); if(auth.error)return auth.error; const projectId=decodeURIComponent(submit[1]); if(!validProjectId(projectId))return json({error:'Unknown project.'},404);
    if(!(await previousBlockQualified(db,auth.user.id,projectId)))return json({error:PREVIOUS_CHAPTER_REQUIRED},409);
    const {data:existing,error:eerr}=await db.from('student_projects').select('*').eq('user_id',auth.user.id).eq('project_id',projectId).maybeSingle(); if(eerr)throw eerr; if(!existing)return json({error:'Save some project work before submitting.'},400); if(!projectReadyForSubmission(existing.workspace||{}))return json({error:'Add at least one meaningful work-log entry, three pieces of evidence, and a clear final recommendation before submitting.'},400);
    const now=new Date().toISOString(); const {data,error}=await db.from('student_projects').update({status:'submitted',submitted_snapshot:existing.workspace,submitted_at:now,updated_at:now,reviewed_by:null,review_comment:null,reviewed_at:null}).eq('user_id',auth.user.id).eq('project_id',projectId).select().single(); if(error)throw error; return json({project:projectRecord(data,projectId)});
  }
  const adminList=path.match(/^projects\/admin\/student\/([^/]+)$/);
  if(adminList&&method==='GET'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error; const learnerId=decodeURIComponent(adminList[1]); const {data,error}=await db.from('student_projects').select('*').eq('user_id',learnerId).order('updated_at',{ascending:false}); if(error)throw error; return json({projects:(data||[]).filter(r=>validProjectId(r.project_id)).map(r=>projectRecord(r,r.project_id))});
  }
  const projectReview=path.match(/^projects\/admin\/student\/([^/]+)\/([^/]+)\/review$/);
  if(projectReview&&method==='PUT'){
    const admin=await requireAdmin(context); if(admin.error)return admin.error; const learnerId=decodeURIComponent(projectReview[1]),projectId=decodeURIComponent(projectReview[2]); if(!validProjectId(projectId))return json({error:'Unknown project.'},404); const body=await context.request.json().catch(()=>({})); const now=new Date().toISOString();
    const {data,error}=await db.from('student_projects').update({status:'reviewed',review_comment:String(body.comment||'').trim().slice(0,3000),reviewed_by:admin.user.id,reviewed_at:now,updated_at:now}).eq('user_id',learnerId).eq('project_id',projectId).not('submitted_snapshot','is',null).select().maybeSingle(); if(error)throw error; if(!data)return json({error:'Submitted project not found.'},404); return json({project:projectRecord(data,projectId)});
  }
  return null;
}

export async function onRequest(context){
  try{
    for(const name of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])if(!context.env[name])return json({error:`Server configuration missing ${name}.`},503);
    const path=Array.isArray(context.params.path)?context.params.path.join('/'):String(context.params.path||'');
    const projectResponse=await handleProjects(context,path); if(projectResponse)return projectResponse;
    const coreResponse=await handleCore(context,path); if(coreResponse)return coreResponse;
    return json({error:'Not found.'},404);
  }catch(error){console.error(error);return json({error:'Unexpected server error.'},500)}
}
