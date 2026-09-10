import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }
});

async function currentLearner() {
  const identity = await getUser();
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

    return json({ error:"Not found." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:"Unexpected server error." }, 500);
  }
};

export const config: Config = { path: "/api/*" };
