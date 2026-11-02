import {operatorRehearsalConfig} from './operator-rehearsal-config';
import {configuredReplyTo,liveEmailDeliveryConfigured,validateDeliveryEnvelope} from "./email-delivery";
/** Independent operator notification path: failures must still alert when booking closes. */
import {createHash,timingSafeEqual} from 'node:crypto';
import type {DataAdapter} from './db/adapter';
import type {OperatorAlert,OperatorAlertEnvelope} from './db/operator-alerts';
import {calendarStatusReady} from './db/calendar-store';
import {validatedAirbnbCalendarUrl} from './calendar-feed';
export function operatorAlertTransportConfigured(){return liveEmailDeliveryConfigured()&&process.env.OPERATOR_ALERTS_APPROVED==='true';}
export function operatorAlertsConfigured(){return operatorAlertTransportConfigured()&&process.env.OPERATOR_ALERT_DELIVERY_QA_APPROVED==='true';}
export function operatorAlertWorkerAuthorized(req:Request){const key=process.env.OPERATOR_ALERT_WORKER_SECRET;const candidate=req.headers.get('authorization')??'';if(!operatorAlertsConfigured()||!key||!/^[-_A-Za-z0-9]{43,128}$/.test(key)||!candidate.startsWith('Bearer ')||candidate.length>256)return false;return timingSafeEqual(createHash('sha256').update(key).digest(),createHash('sha256').update(candidate.slice(7)).digest());}
export function operatorAlertEnvelope(job:OperatorAlert):OperatorAlertEnvelope{const replyTo=configuredReplyTo();return {...(replyTo?{replyTo}:{}),from:process.env.BOOKING_FROM_EMAIL!,to:process.env.HOST_NOTIFY_EMAIL!,subject:'Casa Pacifica: operational review required',text:`Casa Pacifica needs operator attention.\nCategory: ${job.kind}\nIncident: ${job.incidentId}\nEpisode: ${job.episode}\n\nSign in to the Casa Pacifica host dashboard to inspect calendar and payment review. Do not assume a reservation was cancelled, dates released, or money refunded. Resolve the actual platform conflict before resuming affected bookings. This message contains no guest or access details.`};}
export async function deliverOperatorAlert(job:OperatorAlert,envelope:OperatorAlertEnvelope,rehearsalFingerprint?:string):Promise<'sent'>{
 if(!operatorAlertTransportConfigured()||job.paymentMode!=='live')throw new Error('Operator delivery disabled');
 if(job.kind!=='operator_rehearsal'&&!operatorAlertsConfigured())throw new Error('Operator delivery QA incomplete');
 if(job.kind==='operator_rehearsal'){const config=operatorRehearsalConfig();if(!config||config.fingerprint!==rehearsalFingerprint||job.id!==config.alertId||job.incidentId!==config.id||JSON.stringify(envelope)!==JSON.stringify(config.envelope))throw new Error('Rehearsal delivery disabled');}
 validateDeliveryEnvelope(envelope);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':job.dedupeKey},body:JSON.stringify({from:envelope.from,to:[envelope.to],subject:envelope.subject,text:envelope.text,...(envelope.replyTo?{reply_to:envelope.replyTo}:{})}),signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw new Error('Operator delivery not acknowledged');return 'sent';
}
export async function dispatchOperatorAlerts(adapter:DataAdapter,options:{limit?:number;now?:()=>Date;deliver?:(job:OperatorAlert,envelope:OperatorAlertEnvelope)=>Promise<'sent'|'simulated'>}={}){
 const result={sent:0,simulated:0,failed:0,disabled:false};
 if(process.env.STAGING_TEST_MODE==='true'||process.env.SITE_PREVIEW_MODE==='true'||(!options.deliver&&!operatorAlertsConfigured()))return {...result,disabled:true};
 const now=options.now??(()=>new Date());let configured=true;try{validatedAirbnbCalendarUrl(process.env.AIRBNB_ICAL_URL??'');}catch{configured=false;}
 const status=await adapter.getCalendarStatus('casa-pacifica','airbnb-primary');
 await adapter.recordCalendarHealthAlert('casa-pacifica',configured&&calendarStatusReady(status,now().toISOString(),true),now().toISOString());
 for(const job of await adapter.claimOperatorAlerts(now().toISOString(),Math.max(1,Math.min(10,Math.floor(options.limit??10))))){
  try{const envelope=await adapter.prepareOperatorAlertMessage(job.id,job.leaseToken!,job.envelope??operatorAlertEnvelope(job),now().toISOString());if(!envelope)continue;
   const outcome=await(options.deliver??deliverOperatorAlert)(job,envelope);if(await adapter.finishOperatorAlert(job.id,job.leaseToken!,outcome,now().toISOString()))result[outcome]++;
  }catch{await adapter.finishOperatorAlert(job.id,job.leaseToken!,'failed',now().toISOString());result.failed++;}
 }
 // Synthetic delivery can exercise queue semantics but never certify live dispatcher readiness.
 if(!options.deliver&&operatorAlertsConfigured()&&!result.failed)await adapter.completeOperatorAlertRun(now().toISOString());
 return result;
}
