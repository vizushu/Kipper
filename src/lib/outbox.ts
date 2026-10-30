import { canFulfillPaymentMode, storedPaymentMode } from "./payment-mode";
/** Durable, bounded delivery. Default disabled; public preview cannot claim or send. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type {DataAdapter} from './db/adapter';
import type {OutboxEnvelope,OutboxJob} from './db/workflows';
import {isPublicPreview} from './booking-launch';
import {formatCents} from './types';

const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type OutboxDelivery=(job:OutboxJob,envelope:OutboxEnvelope)=>Promise<'sent'|'simulated'>;
export function outboxEnvelope(job:OutboxJob):OutboxEnvelope {
 const from=process.env.BOOKING_FROM_EMAIL??'Casa Pacifica <bookings@example.test>';
 if(job.kind==='access_recovery'){
  const r=job.payload.recovery;if(!r)throw new Error('Missing recovery payload');
  // A code is exchanged by POST, not a URL query (avoids access-token referrer/log leakage).
  return {from,to:r.recipient,subject:'Your Casa Pacifica booking access code',html:`<p>A booking access recovery was requested.</p><p>Use this single-use code within 15 minutes:</p><p><code>${escape(r.token)}</code></p><p>If you did not request access, ignore this message. Never share this code.</p>`};
 }
 const b=job.payload.booking;if(!b)throw new Error('Missing receipt snapshot');
 const name=b.staySnapshot?.propertyName??'Your Casa Pacifica stay';
 const summary=`<p>Booking reference: <strong>${escape(b.reference)}</strong></p><p>${escape(b.checkIn)} to ${escape(b.checkOut)}</p><p>Accommodation: ${escape(b.staySnapshot?.label??'Consult the original accepted terms')}</p><p>Total recorded: ${escape(formatCents(b.totalCents))}</p><p>Accepted cancellation terms: ${escape(b.staySnapshot?.cancellationPolicy??'Consult the original accepted terms')}</p><p>This receipt records confirmation at ${escape(b.confirmedAt??b.createdAt)}. Subsequent changes or cancellation may supersede that status; check your booking details for current status.</p>`;
 return {from,to:job.kind==='guest_confirmation'?b.guest.email:(process.env.HOST_NOTIFY_EMAIL??'host@example.test'),subject:`${job.kind==='guest_confirmation'?'Booking receipt':'New booking receipt'} — ${name} (${b.reference})`,html:`<h1>${escape(name)}</h1>${summary}`};
}
function liveConfigured(){return process.env.EMAIL_DELIVERY_MODE==='live'&&process.env.EMAIL_LIVE_APPROVED==='true'&&canFulfillPaymentMode('live')&&!!process.env.RESEND_API_KEY;}
export async function deliverOutboxMessage(job:OutboxJob,envelope:OutboxEnvelope):Promise<'sent'|'simulated'> {
 if(isPublicPreview())throw new Error('Preview delivery blocked');
 if(process.env.EMAIL_DELIVERY_MODE==='local'){
  const dir=process.env.EMAIL_LOCAL_DIR??path.join(process.cwd(),'.dev-emails');await fs.mkdir(dir,{recursive:true,mode:0o700});
  // Stable filename deduplicates a crashed worker's local retry. No recipient/token logs.
  await fs.writeFile(path.join(dir,`${job.id}.html`),envelope.html,{mode:0o600});return 'simulated';
 }
 if(!liveConfigured()||(job.kind==='access_recovery' && storedPaymentMode(job.payload.recovery?.paymentMode)!=='live')||(job.payload.booking && (storedPaymentMode(job.payload.booking.paymentMode)!=='live' || job.payload.booking.paymentStatus!=='paid')))throw new Error('Live delivery is not enabled for this message');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':job.dedupeKey},body:JSON.stringify({from:envelope.from,to:[envelope.to],subject:envelope.subject,html:envelope.html}),signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw new Error('Email provider did not acknowledge delivery');
 return 'sent';
}
export async function processOutbox(adapter:DataAdapter,options:{jobId?:string;limit?:number;now?:()=>Date;deliver?:OutboxDelivery}={}) {
 const result={claimed:0,sent:0,simulated:0,retried:0,suppressed:0,disabled:false};
 if(isPublicPreview()||(!options.deliver&&process.env.EMAIL_DELIVERY_MODE!=='local'&&!liveConfigured()))return {...result,disabled:true};
 const now=options.now??(()=>new Date());
 const jobs=await adapter.claimOutbox(now().toISOString(),options.limit??10,options.jobId);result.claimed=jobs.length;
 for(const job of jobs){
  try{
   const envelope=await adapter.prepareOutboxMessage(job.id,job.leaseToken!,job.envelope??outboxEnvelope(job),now().toISOString());
   if(!envelope){result.suppressed++;continue;}
   const outcome=await (options.deliver??deliverOutboxMessage)(job,envelope);
   if(await adapter.finishOutbox(job.id,job.leaseToken!,outcome,now().toISOString()))result[outcome]++;else result.suppressed++;
  }catch{
   // No exception/provider body/recipient/token in persistence or logs.
   if(await adapter.finishOutbox(job.id,job.leaseToken!,'failed',now().toISOString()))result.retried++;else result.suppressed++;
  }
 }
 return result;
}
/** Best-effort trigger; durable jobs remain available after any worker/process failure. */
export async function tryProcessOutbox(adapter:DataAdapter):Promise<void>{try{await processOutbox(adapter);}catch{/* next authenticated worker run retries durable jobs */}}
