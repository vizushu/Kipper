import {ownerProbeConfig,ownerProbeWebhookReady} from '@/lib/owner-email-probe';
import {OwnerEmailProbeStore} from '@/lib/db/sqlite-owner-email-probe';
import {boundedBody,emailProviderEvent,verifyEmailWebhookSignature,EMAIL_WEBHOOK_MAX_BYTES,EmailWebhookError} from '@/lib/email-webhook';
import {json} from '../../_helpers';
export async function POST(req:Request){
 const config=ownerProbeConfig(Date.now(),true);if(!config||process.env.OWNER_EMAIL_PROBE_WEBHOOK_APPROVED!=='true'||!ownerProbeWebhookReady())return json({error:'Not found'},404);
 let event;try{const raw=await boundedBody(req,EMAIL_WEBHOOK_MAX_BYTES);const now=Date.now();const id=verifyEmailWebhookSignature(raw,req.headers,process.env.RESEND_OWNER_PROBE_WEBHOOK_SECRET,now);event=emailProviderEvent(raw,id,now);}catch(error){return json({error:'Invalid probe event'},error instanceof EmailWebhookError?error.status:400);}
 if(!event)return json({received:true});
 let store:OwnerEmailProbeStore|undefined;try{store=new OwnerEmailProbeStore();const outcome=store.event(config,event);if(outcome==='unknown')return json({error:'Probe event not ready'},503);if(outcome==='conflict')return json({error:'Probe event conflict'},409);return json({received:true});}catch{return json({error:'Probe event unavailable'},503);}finally{store?.close();}
}
