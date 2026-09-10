import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { randomUUID } from "node:crypto";
import { normalizeCode, validPin, hashPin, verifyPin, signSession, verifySession, getCookie, sessionCookie, clearSessionCookie } from "./auth-utils.mjs";

const json = (data: unknown, status=200, headers: Record<string,string>={}) => new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", ...headers } });
const secret = () => Netlify.env.get("SESSION_SECRET") || "";

async function currentStudent(req: Request) {
  const sid = verifySession(getCookie(req.headers.get("cookie"), "ty_session"), secret());
  if (!sid) return null;
  const db=getDatabase(); const rows=await db.sql`SELECT id, student_code, display_name FROM students WHERE id=${sid}`;
  return rows[0] || null;
}

export default async (req: Request) => {
  try {
    if (!secret()) return json({error:"Server session configuration missing."},500);
    const path=new URL(req.url).pathname.replace(/^\/api\/?/,"");
    const db=getDatabase();

    if (path==="register" && req.method==="POST") {
      const body=await req.json(); const code=normalizeCode(body.studentCode); const pin=String(body.pin??""); const name=String(body.displayName??"").trim().slice(0,60);
      if (code.length<4 || !validPin(pin) || name.length<2) return json({error:"Enter a name, a student code of at least 4 characters, and a 4–8 digit PIN."},400);
      const existing=await db.sql`SELECT id FROM students WHERE student_code=${code}`; if (existing.length) return json({error:"That student code already exists. Sign in instead."},409);
      const id=randomUUID(), hp=hashPin(pin);
      await db.sql`INSERT INTO students (id,student_code,display_name,pin_salt,pin_hash,last_login_at) VALUES (${id},${code},${name},${hp.salt},${hp.hash},NOW())`;
      await db.sql`INSERT INTO progress (student_id,state) VALUES (${id},${JSON.stringify({})}::jsonb)`;
      return json({student:{id,studentCode:code,displayName:name},state:{}},201,{"set-cookie":sessionCookie(signSession(id,secret()))});
    }

    if (path==="login" && req.method==="POST") {
      const body=await req.json(); const code=normalizeCode(body.studentCode); const pin=String(body.pin??"");
      const rows=await db.sql`SELECT id, student_code, display_name, pin_salt, pin_hash FROM students WHERE student_code=${code}`; const s=rows[0];
      if (!s || !verifyPin(pin,s.pin_salt,s.pin_hash)) return json({error:"Student code or PIN is incorrect."},401);
      await db.sql`UPDATE students SET last_login_at=NOW() WHERE id=${s.id}`;
      const pr=await db.sql`SELECT state FROM progress WHERE student_id=${s.id}`;
      return json({student:{id:s.id,studentCode:s.student_code,displayName:s.display_name},state:pr[0]?.state||{}},200,{"set-cookie":sessionCookie(signSession(s.id,secret()))});
    }

    if (path==="logout" && req.method==="POST") return json({ok:true},200,{"set-cookie":clearSessionCookie()});

    if (path==="session" && req.method==="GET") {
      const s=await currentStudent(req); if(!s) return json({authenticated:false},401);
      const pr=await db.sql`SELECT state FROM progress WHERE student_id=${s.id}`;
      return json({authenticated:true,student:{id:s.id,studentCode:s.student_code,displayName:s.display_name},state:pr[0]?.state||{}});
    }

    if (path==="progress" && req.method==="GET") {
      const s=await currentStudent(req); if(!s) return json({error:"Authentication required."},401);
      const pr=await db.sql`SELECT state, updated_at FROM progress WHERE student_id=${s.id}`;
      return json({state:pr[0]?.state||{},updatedAt:pr[0]?.updated_at||null});
    }

    if (path==="progress" && req.method==="PUT") {
      const s=await currentStudent(req); if(!s) return json({error:"Authentication required."},401);
      const body=await req.json(); const state=body.state;
      if (!state || typeof state!=="object" || Array.isArray(state)) return json({error:"Invalid progress state."},400);
      const encoded=JSON.stringify(state); if(encoded.length>250000) return json({error:"Progress payload is too large."},413);
      await db.sql`INSERT INTO progress (student_id,state,updated_at) VALUES (${s.id},${encoded}::jsonb,NOW()) ON CONFLICT (student_id) DO UPDATE SET state=${encoded}::jsonb, updated_at=NOW()`;
      return json({ok:true});
    }
    return json({error:"Not found."},404);
  } catch (error) { console.error(error); return json({error:"Unexpected server error."},500); }
};

export const config: Config = { path: "/api/*" };
