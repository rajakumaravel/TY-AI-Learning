import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";
import { isAdminUser } from "../../lib/admin-auth.mjs";

const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }
});

async function identityUser() {
  return await getUser();
}

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

    if (path === "admin/me" && req.method === "GET") {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      return json({
        authorized:true,
        admin:{ id:admin.identity.id, email:admin.identity.email, displayName:String(admin.identity.userMetadata?.full_name || admin.identity.email) }
      });
    }

    if (path === "admin/students" && req.method === "GET") {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      const rows = await db.sql`
        SELECT l.identity_user_id, l.display_name, l.created_at, l.last_login_at,
               p.updated_at, p.state
        FROM learners l
        LEFT JOIN learner_progress p ON p.identity_user_id=l.identity_user_id
        ORDER BY COALESCE(p.updated_at, l.last_login_at, l.created_at) DESC
      `;
      const students = rows.map((row:any) => {
        const state = row.state && typeof row.state === "object" ? row.state : {};
        return {
          id: row.identity_user_id,
          displayName: row.display_name,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at,
          updatedAt: row.updated_at,
          completedCount: Array.isArray(state.completed) ? new Set(state.completed).size : 0,
          badgeCount: Array.isArray(state.badges) ? new Set(state.badges).size : 0,
          reflectionCount: state.reflections && typeof state.reflections === "object" ? Object.keys(state.reflections).length : 0
        };
      });
      return json({ students });
    }

    const detailMatch = path.match(/^admin\/student\/([^/]+)$/);
    if (detailMatch && req.method === "GET") {
      const admin = await requireAdmin();
      if (admin.error) return admin.error;
      const learnerId = decodeURIComponent(detailMatch[1]);
      const rows = await db.sql`
        SELECT l.identity_user_id, l.display_name, l.created_at, l.last_login_at,
               p.updated_at, p.state
        FROM learners l
        LEFT JOIN learner_progress p ON p.identity_user_id=l.identity_user_id
        WHERE l.identity_user_id=${learnerId}
      `;
      if (!rows.length) return json({ error:"Student not found." }, 404);
      const row:any = rows[0];
      return json({
        student:{
          id:row.identity_user_id,
          displayName:row.display_name,
          createdAt:row.created_at,
          lastLoginAt:row.last_login_at,
          updatedAt:row.updated_at
        },
        state: row.state && typeof row.state === "object" ? row.state : {}
      });
    }

    return json({ error:"Not found." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:"Unexpected server error." }, 500);
  }
};

export const config: Config = { path: "/api/*" };
