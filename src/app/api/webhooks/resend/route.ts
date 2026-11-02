import {getAdapter} from '@/lib/db';
import {boundedBody,emailWebhookEnabled,EmailWebhookError,EMAIL_WEBHOOK_MAX_BYTES,emailProviderEvent,verifyEmailWebhookSignature} from '@/lib/email-webhook';
import {json} from '../../_helpers';
export async function POST(req:Request){
 // Preview cannot activate a webhook, even with contradictory credentials/approval.
 if(!emailWebhookEnabled())return json({error:'Email webhook unavailable'},404);
 let event;
 try{
  const raw=await boundedBody(req,EMAIL_WEBHOOK_MAX_BYTES);const now=Date.now();
  const id=verifyEmailWebhookSignature(raw,req.headers,process.env.RESEND_WEBHOOK_SECRET,now);
  event=emailProviderEvent(raw,id,now);
 }catch(error){return json({error:'Invalid email webhook'},error instanceof EmailWebhookError?error.status:400);}
 if(!event)return json({received:true});
 try{
  const result=await getAdapter().recordEmailProviderEvent(event);
  // A webhook can race acceptance persistence. Ask provider to retry; never adopt arbitrary IDs.
  if(result==='unknown')return json({error:'Email event not ready for reconciliation'},503);
  if(result==='conflict')return json({error:'Email event conflict'},409);
  return json({received:true});
 }catch{return json({error:'Email event persistence unavailable'},503);}
}
