import type { Config } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
import { getLab, sanitizeLabEvidence, labComplete } from '../../lib/experience-labs.mjs';

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function auth(){
  const user=await getUser();
  if(!user?.id)return null;
  return user;
}

function record(row:any){
  return {
    labId:row.lab_id,
    status:row.status,
    evidence:row.evidence||{},
    updatedAt:row.updated_at||null
  };
}

export default async (req:Request)=>{
  try{
    const user=await auth();
    if(!user)return json({error:'Authentication required.'},401);
    const path=new URL(req.url).pathname.replace(/^\/api\/labs\/?/,'');
    const labId=decodeURIComponent(path.split('/')[0]||'').slice(0,120);
    const lab=getLab(labId);
    if(!lab)return json({error:'Experience Lab not found.'},404);
    const db=getDatabase();

    if(req.method==='GET'){
      const rows=await db.sql`SELECT * FROM experience_lab_evidence WHERE identity_user_id=${user.id} AND lab_id=${labId}`;
      if(!rows.length)return json({lab,evidence:{answers:{},status:'not_started'},updatedAt:null});
      const r=record(rows[0]);
      return json({lab,evidence:r.evidence,status:r.status,updatedAt:r.updatedAt});
    }

    if(req.method==='PUT'){
      const body:any=await req.json().catch(()=>({}));
      const evidence=sanitizeLabEvidence(body.evidence||{});
      const complete=labComplete(lab,evidence);
      evidence.status=complete?'complete':'in_progress';
      const encoded=JSON.stringify(evidence);
      if(encoded.length>50000)return json({error:'Experience Lab evidence is too large.'},413);
      const rows=await db.sql`
        INSERT INTO experience_lab_evidence(identity_user_id,lab_id,evidence,status,updated_at)
        VALUES(${user.id},${labId},${encoded}::jsonb,${evidence.status},NOW())
        ON CONFLICT(identity_user_id,lab_id)
        DO UPDATE SET evidence=${encoded}::jsonb,status=${evidence.status},updated_at=NOW()
        RETURNING *
      `;
      const r=record(rows[0]);
      return json({ok:true,lab,evidence:r.evidence,status:r.status,updatedAt:r.updatedAt});
    }

    return json({error:'Method not allowed.'},405);
  }catch(error){
    console.error(error);
    return json({error:'Unexpected server error.'},500);
  }
};

export const config:Config={path:'/api/labs/*'};
