import type { Config } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
import { isAdminUser } from '../../lib/admin-auth.mjs';
import { PROJECT_BRIEFS, emptyProjectWorkspace, projectReadyForSubmission, safeEvidenceUrl, validProjectId } from '../../lib/project-briefs.mjs';

const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }
});

async function requireIdentity() {
  const user = await getUser();
  if (!user?.id || !user.email) return { error: json({ error:'Authentication required.' }, 401) };
  return { user };
}

async function requireAdmin() {
  const auth = await requireIdentity();
  if (auth.error) return auth;
  const configured = Netlify.env.get('ADMIN_EMAILS') || '';
  if (!isAdminUser(auth.user, configured)) return { error: json({ error:'Administrator access required.' }, 403) };
  return auth;
}

function cleanWorkspace(value:any) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const workLog = Array.isArray(raw.workLog) ? raw.workLog.slice(0,50).map((entry:any) => ({
    planned:String(entry?.planned||'').slice(0,2000),
    did:String(entry?.did||'').slice(0,4000),
    result:String(entry?.result||'').slice(0,4000),
    blocker:String(entry?.blocker||'').slice(0,2000),
    decision:String(entry?.decision||'').slice(0,3000),
    next:String(entry?.next||'').slice(0,2000),
    minutes:Math.max(0,Math.min(600,Number(entry?.minutes)||0)),
    date:String(entry?.date||'').slice(0,32)
  })) : [];
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.slice(0,50).map((item:any) => ({
    label:String(item?.label||'').slice(0,240),
    url:safeEvidenceUrl(item?.url),
    note:String(item?.note||'').slice(0,4000)
  })) : [];
  return { workLog, evidence, finalRecommendation:String(raw.finalRecommendation||'').slice(0,8000) };
}

function rowToProject(row:any, projectId:string) {
  return {
    projectId,
    brief:PROJECT_BRIEFS[projectId],
    status:row?.status || 'not_started',
    workspace:row?.workspace || emptyProjectWorkspace(),
    submittedSnapshot:row?.submitted_snapshot || null,
    createdAt:row?.created_at || null,
    updatedAt:row?.updated_at || null,
    submittedAt:row?.submitted_at || null,
    reviewedAt:row?.reviewed_at || null,
    reviewComment:row?.review_comment || null
  };
}

export default async (req: Request) => {
  try {
    const path = new URL(req.url).pathname.replace(/^\/api\/projects\/?/, '');
    const db = getDatabase();

    const studentMatch = path.match(/^([^/]+)$/);
    if (studentMatch && ['GET','PUT'].includes(req.method)) {
      const auth = await requireIdentity();
      if (auth.error) return auth.error;
      const projectId = decodeURIComponent(studentMatch[1]);
      if (!validProjectId(projectId)) return json({ error:'Unknown project.' }, 404);

      if (req.method === 'GET') {
        const rows = await db.sql`SELECT * FROM student_projects WHERE identity_user_id=${auth.user.id} AND project_id=${projectId}`;
        return json({ project:rowToProject(rows[0], projectId) });
      }

      const body:any = await req.json().catch(()=>({}));
      const workspace = cleanWorkspace(body.workspace);
      const encoded = JSON.stringify(workspace);
      if (encoded.length > 150000) return json({ error:'Project workspace is too large.' }, 413);
      const rows = await db.sql`
        INSERT INTO student_projects (identity_user_id, project_id, status, workspace, updated_at)
        VALUES (${auth.user.id}, ${projectId}, 'in_progress', ${encoded}::jsonb, NOW())
        ON CONFLICT (identity_user_id, project_id)
        DO UPDATE SET workspace=${encoded}::jsonb,
          status=CASE WHEN student_projects.status='reviewed' THEN 'reviewed' ELSE 'in_progress' END,
          updated_at=NOW()
        RETURNING *
      `;
      return json({ project:rowToProject(rows[0], projectId) });
    }

    const submitMatch = path.match(/^([^/]+)\/submit$/);
    if (submitMatch && req.method === 'POST') {
      const auth = await requireIdentity();
      if (auth.error) return auth.error;
      const projectId = decodeURIComponent(submitMatch[1]);
      if (!validProjectId(projectId)) return json({ error:'Unknown project.' }, 404);
      const rows = await db.sql`SELECT * FROM student_projects WHERE identity_user_id=${auth.user.id} AND project_id=${projectId}`;
      if (!rows.length) return json({ error:'Save some project work before submitting.' }, 400);
      const workspace = rows[0].workspace || {};
      if (!projectReadyForSubmission(workspace)) return json({ error:'Add at least one meaningful work-log entry, three pieces of evidence, and a clear final recommendation before submitting.' }, 400);
      const snapshot = JSON.stringify(workspace);
      const updated = await db.sql`
        UPDATE student_projects
        SET status='submitted', submitted_snapshot=${snapshot}::jsonb, submitted_at=NOW(), updated_at=NOW(), reviewed_by=NULL, review_comment=NULL, reviewed_at=NULL
        WHERE identity_user_id=${auth.user.id} AND project_id=${projectId}
        RETURNING *
      `;
      return json({ project:rowToProject(updated[0], projectId) });
    }

    const adminList = path.match(/^admin\/student\/([^/]+)$/);
    if (adminList && req.method === 'GET') {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      const learnerId = decodeURIComponent(adminList[1]);
      const rows = await db.sql`SELECT * FROM student_projects WHERE identity_user_id=${learnerId} ORDER BY updated_at DESC`;
      return json({ projects:rows.filter((row:any)=>validProjectId(row.project_id)).map((row:any)=>rowToProject(row,row.project_id)) });
    }

    const reviewMatch = path.match(/^admin\/student\/([^/]+)\/([^/]+)\/review$/);
    if (reviewMatch && req.method === 'PUT') {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      const learnerId = decodeURIComponent(reviewMatch[1]);
      const projectId = decodeURIComponent(reviewMatch[2]);
      if (!validProjectId(projectId)) return json({ error:'Unknown project.' }, 404);
      const body:any = await req.json().catch(()=>({}));
      const comment = String(body.comment||'').trim().slice(0,3000);
      const rows = await db.sql`
        UPDATE student_projects
        SET status='reviewed', review_comment=${comment}, reviewed_by=${admin.user.email}, reviewed_at=NOW(), updated_at=NOW()
        WHERE identity_user_id=${learnerId} AND project_id=${projectId} AND submitted_snapshot IS NOT NULL
        RETURNING *
      `;
      if (!rows.length) return json({ error:'Submitted project not found.' }, 404);
      return json({ project:rowToProject(rows[0], projectId) });
    }

    return json({ error:'Not found.' }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:'Unexpected server error.' }, 500);
  }
};

export const config: Config = { path:'/api/projects/*' };
