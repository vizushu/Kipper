import {createHash,timingSafeEqual} from 'node:crypto';
import {configuredReplyTo,liveEmailDeliveryConfigured} from './email-delivery';
import type {OperatorAlertEnvelope} from './db/operator-alerts';
export interface OperatorRehearsalConfig {id:string;alertId:string;fingerprint:string;issuedAt:number;expiresAt:number;envelope:OperatorAlertEnvelope}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function operatorRehearsalConfig(now=Date.now(),statusOnly=false):OperatorRehearsalConfig|null {
 if(process.env.SITE_PREVIEW_MODE==='true'||process.env.STAGING_TEST_MODE==='true'||process.env.BOOKING_PAYMENT_MODE!=='closed'||process.env.OPERATOR_REHEARSAL_APPROVED!=='true'||process.env.OPERATOR_ALERTS_APPROVED!=='true'||!liveEmailDeliveryConfigured()||(process.env.DATA_ADAPTER??'sqlite')!=='sqlite')return null;
 const id=process.env.OPERATOR_REHEARSAL_ID??'',key=process.env.OPERATOR_ALERT_WORKER_SECRET??'';
 const issuedAt=Date.parse(process.env.OPERATOR_REHEARSAL_ISSUED_AT??''),expiresAt=Date.parse(process.env.OPERATOR_REHEARSAL_EXPIRES_AT??'');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)||!/^[-_A-Za-z0-9]{43,128}$/.test(key)||!Number.isFinite(issuedAt)||!Number.isFinite(expiresAt)||expiresAt<=issuedAt||expiresAt-issuedAt>3600000||now<issuedAt||now>=(statusOnly?issuedAt+7*86400000:expiresAt))return null;
 if(['ADMIN_SECRET','CALENDAR_WORKER_SECRET','OPERATIONS_WORKER_SECRET','OWNER_EMAIL_PROBE_SECRET','BOOKING_ACCESS_SECRET','STAGING_SESSION_SECRET','STAGING_ACCESS_PASSWORD','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','RESEND_OWNER_PROBE_WEBHOOK_SECRET','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','CALENDAR_EXPORT_TOKEN'].some(name=>process.env[name]===key))return null;
 const envelope:OperatorAlertEnvelope={from:process.env.BOOKING_FROM_EMAIL!,to:process.env.HOST_NOTIFY_EMAIL!,...(configuredReplyTo()?{replyTo:configuredReplyTo()}:{}),subject:'Casa Pacifica: operator alert rehearsal — no incident',text:'OPERATOR ALERT REHEARSAL ONLY. This is an explicitly authorized delivery rehearsal, not an actual calendar conflict, booking, payment exception or guest message. No reservation, inventory, charge or refund was changed. Please verify receipt in the approved operator inbox. Provider acceptance alone does not establish inbox delivery or launch readiness.'};
 return {id,alertId:`rehearsal_${hash(id).slice(0,32)}`,issuedAt,expiresAt,envelope,fingerprint:hash(JSON.stringify({id,issuedAt,expiresAt,envelope,keyHash:hash(key),providerKeyHash:hash(process.env.RESEND_API_KEY!)}))};
}
export function operatorRehearsalAuthorized(req:Request,statusOnly=false){const config=operatorRehearsalConfig(Date.now(),statusOnly),header=req.headers.get('authorization')??'';if(!config||header.length>256||!header.startsWith('Bearer '))return null;return timingSafeEqual(Buffer.from(hash(header.slice(7)),'hex'),Buffer.from(hash(process.env.OPERATOR_ALERT_WORKER_SECRET!),'hex'))?config:null;}
