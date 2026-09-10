import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";
import { isAdminUser } from "../../lib/admin-auth.mjs";
import { assessReflection } from "../../lib/assessment.mjs";
import { CAPSTONES, assessChapterCapstone } from "../../lib/chapter-capstone.mjs";

const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }
});

async function identityUser() { return await getUser(); }

async function currentLearner() {
  const identity = await identityUser();
  if (!identity?.id || !identity.email) return null;
  const db = getDatabase();
  const displayName = String(identity.userMetadata?.full_name || identity.email.split("@")[0] || "Student").slice(0,80);
  await db.sql`
    INSERT INTO learners (identity_user_id, display_name, last_login_at)
    VALUES (${identity.id}, ${displayName}, NOW())
    ON CONFLICT (identity_user_id)
    DO UPDATE SET display_name=${displayName}, last_login_at=NOW()
  `;
  return { id: identity.id, email: identity.email, displayName };
}

async function requireAdmin() {
  const identity = await identityUser();
  if (!identity?.id || !identity.email) return { error: json({ error:"Authentication required." }, 401) };
  const configured = Netlify.env.get("ADMIN_EMAILS") || "";
  if (!isAdminUser(identity, configured)) return { error: json({ error:"Administrator access required." }, 403) };
  return { identity };
}

function assessmentRecord(row:any) {
  return {
    sessionId:row.session_id,
    suggestedLevel:row.suggested_level,
    suggestedScore:row.suggested_score,
    criteria:row.criteria || {},
    strengths:row.strengths || [],
    nextSteps:row.next_steps || [],
    teacherLevel:row.teacher_level || null,
    teacherComment:row.teacher_comment || null,
    reviewedBy:row.reviewed_by || null,
    assessedAt:row.assessed_at,
    reviewedAt:row.reviewed_at || null,
    effectiveLevel:row.teacher_level || row.suggested_level,
    formative:true
  };
}

function chapterAssessmentRecord(row:any) {
  return {
    blockId:row.block_id,
    answers:row.answers || {},
    suggestedLevel:row.suggested_level,
    suggestedScore:row.suggested_score,
    criteria:row.criteria || {},
    strengths:row.strengths || [],
    nextSteps:row.next_steps || [],
    teacherLevel:row.teacher_level || null,
    teacherComment:row.teacher_comment || null,
    reviewedBy:row.reviewed_by || null,
    submittedAt:row.submitted_at,
    reviewedAt:row.reviewed_at || null,
    effectiveLevel:row.teacher_level || row.suggested_level,
    formative:true
  };
}

export default async (req: Request) => {
  try {
    const path = new URL(req.url).pathname.replace(/^\/api\/?/, "");
    const db = getDatabase();

    if (path === "session" && req.method === "GET") {
      const learner = await currentLearner();
      if (!learner) return json({ authenticated:false }, 401);
      const rows = await db.sql`SELECT state FROM learner_progress WHERE identity_user_id=${learner.id}`;
      return json({ authenticated:true, student:learner, state:rows[0]?.state || {} });
    }

    if (path === "progress" && req.method === "GET") {
      const learner = await currentLearner();
      if (!learner) return json({ error:"Authentication required." }, 401);
      const rows = await db.sql`SELECT state, updated_at FROM learner_progress WHERE identity_user_id=${learner.id}`;
      return json({ state:rows[0]?.state || {}, updatedAt:rows[0]?.updated_at || null });
    }

    if (path === "progress" && req.method === "PUT") {
      const learner = await currentLearner();
      if (!learner) return json({ error:"Authentication required." }, 401);
      const body = await req.json();
      const state = body.state;
      if (!state || typeof state !== "object" || Array.isArray(state)) return json({ error:"Invalid progress state." }, 400);
      const encoded = JSON.stringify(state);
      if (encoded.length > 250000) return json({ error:"Progress payload is too large." }, 413);
      await db.sql`
        INSERT INTO learner_progress (identity_user_id, state, updated_at)
        VALUES (${learner.id}, ${encoded}::jsonb, NOW())
        ON CONFLICT (identity_user_id)
        DO UPDATE SET state=${encoded}::jsonb, updated_at=NOW()
      `;
      return json({ ok:true });
    }

    const assessMatch = path.match(/^assessment\/([^/]+)$/);
    if (assessMatch && req.method === "POST") {
      const learner = await currentLearner();
      if (!learner) return json({ error:"Authentication required." }, 401);
      const sessionId = decodeURIComponent(assessMatch[1]).slice(0,120);
      const progressRows = await db.sql`SELECT state FROM learner_progress WHERE identity_user_id=${learner.id}`;
      const state:any = progressRows[0]?.state || {};
      const reflection = String(state.reflections?.[sessionId] || "").trim();
      const activity = state.activity?.[sessionId] || {};
      if (reflection.length < 20) return json({ error:"Complete and save your reflection before requesting feedback." }, 400);
      const body:any = await req.json().catch(()=>({}));
      const studyText = String(body.studyText || "").slice(0,12000);
      const result:any = assessReflection({reflection,activity,studyText});
      const criteria=JSON.stringify(result.criteria), strengths=JSON.stringify(result.strengths), nextSteps=JSON.stringify(result.nextSteps);
      const rows = await db.sql`
        INSERT INTO formative_assessments
          (identity_user_id, session_id, suggested_level, suggested_score, criteria, strengths, next_steps, assessed_at)
        VALUES
          (${learner.id}, ${sessionId}, ${result.level}, ${result.score}, ${criteria}::jsonb, ${strengths}::jsonb, ${nextSteps}::jsonb, NOW())
        ON CONFLICT (identity_user_id, session_id)
        DO UPDATE SET suggested_level=${result.level}, suggested_score=${result.score}, criteria=${criteria}::jsonb,
                      strengths=${strengths}::jsonb, next_steps=${nextSteps}::jsonb, assessed_at=NOW()
        RETURNING *
      `;
      return json({ assessment:assessmentRecord(rows[0]) });
    }

    const chapterMatch = path.match(/^chapter-assessment\/([^/]+)$/);
    if (chapterMatch && req.method === "POST") {
      const learner = await currentLearner();
      if (!learner) return json({ error:"Authentication required." }, 401);
      const blockId = decodeURIComponent(chapterMatch[1]).slice(0,80);
      if (!(blockId in CAPSTONES)) return json({ error:"Unknown chapter assessment." }, 404);
      const progressRows = await db.sql`SELECT state FROM learner_progress WHERE identity_user_id=${learner.id}`;
      const state:any = progressRows[0]?.state || {};
      const requiredSessions = blockId === 'block1' ? ['b1s1','b1s2','b1s3','b1s4'] : ['b2s1','b2s2','b2s3','b2s4','b2s5','b2s6'];
      const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
      if (!requiredSessions.every(id=>completed.has(id))) return json({ error:"Complete all chapter practical sessions before submitting the chapter assessment." }, 409);
      const body:any = await req.json().catch(()=>({}));
      const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
      const cleanAnswers:any = {};
      for (const [key,value] of Object.entries(answers).slice(0,6)) cleanAnswers[String(key).slice(0,20)] = String(value || '').trim().slice(0,5000);
      if (Object.keys(cleanAnswers).length < 3 || Object.values(cleanAnswers).some((v:any)=>v.length<25)) return json({ error:"Complete all chapter assessment responses with enough detail to show your reasoning." }, 400);
      const result:any = assessChapterCapstone({blockId,answers:cleanAnswers});
      const encodedAnswers=JSON.stringify(cleanAnswers), criteria=JSON.stringify(result.criteria), strengths=JSON.stringify(result.strengths), nextSteps=JSON.stringify(result.nextSteps);
      const rows = await db.sql`
        INSERT INTO chapter_assessments
          (identity_user_id, block_id, answers, suggested_level, suggested_score, criteria, strengths, next_steps, submitted_at)
        VALUES
          (${learner.id}, ${blockId}, ${encodedAnswers}::jsonb, ${result.level}, ${result.score}, ${criteria}::jsonb, ${strengths}::jsonb, ${nextSteps}::jsonb, NOW())
        ON CONFLICT (identity_user_id, block_id)
        DO UPDATE SET answers=${encodedAnswers}::jsonb, suggested_level=${result.level}, suggested_score=${result.score}, criteria=${criteria}::jsonb,
                      strengths=${strengths}::jsonb, next_steps=${nextSteps}::jsonb, submitted_at=NOW()
        RETURNING *
      `;
      return json({ assessment:chapterAssessmentRecord(rows[0]) });
    }

    if (path === "admin/me" && req.method === "GET") {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      return json({ authorized:true, admin:{ id:admin.identity.id, email:admin.identity.email, displayName:String(admin.identity.userMetadata?.full_name || admin.identity.email) } });
    }

    if (path === "admin/students" && req.method === "GET") {
      const admin = await requireAdmin(); if (admin.error) return admin.error;
      const rows = await db.sql`
        SELECT l.identity_user_id, l.display_name, l.created_at, l.last_login_at, p.updated_at, p.state,
          (SELECT COUNT(*)::int FROM formative_assessments a WHERE a.identity_user_id=l.identity_user_id) assessment_count,
          (SELECT COUNT(*)::int FROM formative_assessments a WHERE a.identity_user_id=l.identity_user_id AND a.teacher_level IS NOT NULL) reviewed_count,
          (SELECT COUNT(*)::int FROM chapter_assessments c WHERE c.identity_user_id=l.identity_user_id) chapter_assessment_count
        FROM learners l LEFT JOIN learner_progress p ON p.identity_user_id=l.identity_user_id
        ORDER BY COALESCE(p.updated_at, l.last_login_at, l.created_at) DESC
      `;
      const students = rows.map((row:any) => { const state=row.state&&typeof row.state==="object"?row.state:{}; return {
        id:row.identity_user_id, displayName:row.display_name, createdAt:row.created_at, lastLoginAt:row.last_login_at, updatedAt:row.updated_at,
        completedCount:Array.isArray(state.completed)?new Set(state.completed).size:0, badgeCount:Array.isArray(state.badges)?new Set(state.badges).size:0,
        reflectionCount:state.reflections&&typeof state.reflections==="object"?Object.keys(state.reflections).length:0,
        assessmentCount:Number(row.assessment_count||0), reviewedCount:Number(row.reviewed_count||0), chapterAssessmentCount:Number(row.chapter_assessment_count||0)
      }; });
      return json({ students });
    }

    const detailMatch = path.match(/^admin\/student\/([^/]+)$/);
    if (detailMatch && req.method === "GET") {
      const admin = await requireAdmin(); if (admin.error) return admin.error;
      const learnerId=decodeURIComponent(detailMatch[1]);
      const rows=await db.sql`SELECT l.identity_user_id,l.display_name,l.created_at,l.last_login_at,p.updated_at,p.state FROM learners l LEFT JOIN learner_progress p ON p.identity_user_id=l.identity_user_id WHERE l.identity_user_id=${learnerId}`;
      if(!rows.length)return json({error:"Student not found."},404);
      const assessmentRows=await db.sql`SELECT * FROM formative_assessments WHERE identity_user_id=${learnerId} ORDER BY assessed_at DESC`;
      const chapterRows=await db.sql`SELECT * FROM chapter_assessments WHERE identity_user_id=${learnerId} ORDER BY submitted_at DESC`;
      const row:any=rows[0];
      return json({ student:{id:row.identity_user_id,displayName:row.display_name,createdAt:row.created_at,lastLoginAt:row.last_login_at,updatedAt:row.updated_at}, state:row.state&&typeof row.state==="object"?row.state:{}, assessments:assessmentRows.map(assessmentRecord), chapterAssessments:chapterRows.map(chapterAssessmentRecord) });
    }

    const reviewMatch = path.match(/^admin\/assessment\/([^/]+)\/([^/]+)$/);
    if (reviewMatch && req.method === "PUT") {
      const admin = await requireAdmin(); if (admin.error) return admin.error;
      const learnerId=decodeURIComponent(reviewMatch[1]), sessionId=decodeURIComponent(reviewMatch[2]);
      const body:any=await req.json().catch(()=>({}));
      const level=String(body.level||"");
      const allowed=new Set(["Getting started","Getting there","Going further"]);
      if(!allowed.has(level))return json({error:"Invalid assessment level."},400);
      const comment=String(body.comment||"").trim().slice(0,2000);
      const rows=await db.sql`
        UPDATE formative_assessments SET teacher_level=${level}, teacher_comment=${comment}, reviewed_by=${admin.identity.email}, reviewed_at=NOW()
        WHERE identity_user_id=${learnerId} AND session_id=${sessionId} RETURNING *
      `;
      if(!rows.length)return json({error:"Assessment not found."},404);
      return json({assessment:assessmentRecord(rows[0])});
    }

    const chapterReviewMatch = path.match(/^admin\/chapter-assessment\/([^/]+)\/([^/]+)$/);
    if (chapterReviewMatch && req.method === "PUT") {
      const admin = await requireAdmin(); if (admin.error) return admin.error;
      const learnerId=decodeURIComponent(chapterReviewMatch[1]), blockId=decodeURIComponent(chapterReviewMatch[2]);
      const body:any=await req.json().catch(()=>({}));
      const level=String(body.level||"");
      const allowed=new Set(["Getting started","Getting there","Going further"]);
      if(!allowed.has(level))return json({error:"Invalid assessment level."},400);
      const comment=String(body.comment||"").trim().slice(0,2000);
      const rows=await db.sql`
        UPDATE chapter_assessments SET teacher_level=${level}, teacher_comment=${comment}, reviewed_by=${admin.identity.email}, reviewed_at=NOW()
        WHERE identity_user_id=${learnerId} AND block_id=${blockId} RETURNING *
      `;
      if(!rows.length)return json({error:"Chapter assessment not found."},404);
      return json({assessment:chapterAssessmentRecord(rows[0])});
    }

    return json({ error:"Not found." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:"Unexpected server error." }, 500);
  }
};

export const config: Config = { path: "/api/*" };
