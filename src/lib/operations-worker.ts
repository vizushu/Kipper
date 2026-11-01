import {createHash,timingSafeEqual} from 'node:crypto';
import type {DataAdapter} from './db/adapter';
import {processOutbox} from './outbox';
import {dispatchOperatorAlerts} from './operator-alerts';
export const OPERATIONS_BUDGET_MS=45_000;
export function operationsWorkerConfigured():boolean{
 if(process.env.SITE_PREVIEW_MODE==='true'||process.env.STAGING_TEST_MODE==='true'||process.env.OPERATIONS_WORKER_APPROVED!=='true'||(process.env.DATA_ADAPTER??'sqlite').toLowerCase()!=='sqlite')return false;
 const key=process.env.OPERATIONS_WORKER_SECRET;
 return !!key&&/^[-_A-Za-z0-9]{43,128}$/.test(key)&&!['ADMIN_SECRET','CALENDAR_WORKER_SECRET','OPERATOR_ALERT_WORKER_SECRET','OWNER_EMAIL_PROBE_SECRET','BOOKING_ACCESS_SECRET','STAGING_SESSION_SECRET','STAGING_ACCESS_PASSWORD','STRIPE_WEBHOOK_SECRET','RESEND_WEBHOOK_SECRET','CALENDAR_EXPORT_TOKEN','RESEND_API_KEY','STRIPE_SECRET_KEY','RESEND_OWNER_PROBE_WEBHOOK_SECRET'].some(name=>process.env[name]===key);
}
export function operationsWorkerAuthorized(req:Request):boolean{
 if(!operationsWorkerConfigured())return false;
 const header=req.headers.get('authorization')??'';
 if(header.length>256||!header.startsWith('Bearer '))return false;
 const digest=(value:string)=>createHash('sha256').update(value).digest();
 return timingSafeEqual(digest(header.slice(7)),digest(process.env.OPERATIONS_WORKER_SECRET!));
}
/** No intake/payment gate: owed delivery retains its own immutable provenance and approval checks. */
export async function runOperations(adapter:DataAdapter,now=Date.now){
 const started=now();
 const result:{status:'completed'|'review-required';holds:{status:string;expired:number};outbox:{status:string;sent:number;simulated:number;retried:number;suppressed:number};alerts:{status:string;sent:number;simulated:number;failed:number}}={status:'completed',holds:{status:'skipped',expired:0},outbox:{status:'skipped',sent:0,simulated:0,retried:0,suppressed:0},alerts:{status:'skipped',sent:0,simulated:0,failed:0}};
 if(!operationsWorkerConfigured()){result.status='review-required';result.holds.status=result.outbox.status=result.alerts.status='disabled';return result;}
 const budget=()=>now()-started<OPERATIONS_BUDGET_MS-20_000;
 try{result.holds={status:'completed',expired:await adapter.expirePendingBookings(new Date(now()).toISOString())};}catch{result.holds.status='failed';}
 if(budget())try{const value=await processOutbox(adapter,{limit:1});result.outbox={status:value.disabled?'disabled':value.retried?'review-required':'completed',sent:value.sent,simulated:value.simulated,retried:value.retried,suppressed:value.suppressed};}catch{result.outbox.status='failed';}
 if(budget())try{const value=await dispatchOperatorAlerts(adapter,{limit:1});result.alerts={status:value.disabled?'disabled':value.failed?'review-required':'completed',sent:value.sent,simulated:value.simulated,failed:value.failed};}catch{result.alerts.status='failed';}
 if([result.holds,result.outbox,result.alerts].some(value=>value.status!=='completed'))result.status='review-required';
 return result;
}
