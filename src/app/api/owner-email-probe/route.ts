import {ownerProbeAuthorized,ownerProbeConfig,ownerProbeProviderReady,ownerProbeWebhookReady,sendOwnerProbe} from '@/lib/owner-email-probe';
import {OwnerEmailProbeStore} from '@/lib/db/sqlite-owner-email-probe';
import {boundedBody} from '@/lib/email-webhook';
import {json} from '../_helpers';
export async function GET(req:Request){
 const config=ownerProbeConfig(Date.now(),true);if(!ownerProbeAuthorized(req,config))return json({error:'Not found'},404);
 let store:OwnerEmailProbeStore|undefined;try{store=new OwnerEmailProbeStore();return json(store.status(config));}catch{return json({error:'Probe unavailable'},503);}finally{store?.close();}
}
export async function POST(req:Request){
 const config=ownerProbeConfig();if(!ownerProbeAuthorized(req,config))return json({error:'Not found'},404);
 try{const body=(await boundedBody(req,128)).toString('utf8');if(body!==''&&body.trim()!=='{}')return json({error:'Invalid probe request'},400);}catch{return json({error:'Invalid probe request'},400);}
 if(!ownerProbeProviderReady()||process.env.OWNER_EMAIL_PROBE_WEBHOOK_APPROVED!=='true'||!ownerProbeWebhookReady())return json({error:'Probe unavailable'},503);
 let store:OwnerEmailProbeStore|undefined;let lease:string|undefined;
 try{
  store=new OwnerEmailProbeStore();const claim=store.claim(config,Date.now());
  if(claim.kind!=='claimed')return json({state:claim.kind},claim.kind==='accepted'?200:409);
  lease=claim.lease;const id=await sendOwnerProbe(claim.idempotencyKey,config.fingerprint);
  if(!store.accepted(config,lease,id,Date.now()))throw new Error('Persistence unavailable');
  return json({id:config.id,state:'accepted'});
 }catch{try{if(lease)store?.uncertain(config,lease,Date.now());}catch{}return json({error:'Probe outcome requires review'},503);}finally{store?.close();}
}
