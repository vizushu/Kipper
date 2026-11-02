/** A separately authorized, fixed-recipient probe. Never a guest delivery bypass. */
import {createHash,timingSafeEqual} from 'node:crypto';
import {boundedBody} from './email-webhook';
import {PROVIDER_MESSAGE_ID} from './db/email-evidence';
export const OWNER_PROBE_ENVELOPE=Object.freeze({from:'Casa Pacifica <bookings@innkipper.com>',to:'vizushu@gmail.com',replyTo:'vizushu@gmail.com',subject:'Casa Pacifica owner email delivery test',text:'This is an owner-authorized Casa Pacifica email delivery test. It is not a reservation, payment receipt, guest message or live concierge reply. Please verify that this message reached your inbox and that Reply addresses the approved owner help mailbox.'});
export type ProbeConfig={id:string;issuedAt:number;expiresAt:number;fingerprint:string;key:string};
const strong=/^[-_A-Za-z0-9]{43,128}$/;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function ownerProbeConfig(now=Date.now(),allowExpired=false):ProbeConfig|null {
 if(process.env.STAGING_TEST_MODE==='true'||process.env.SITE_PREVIEW_MODE!=='true'||process.env.OWNER_EMAIL_PROBE_APPROVED!=='true'||(process.env.DATA_ADAPTER??'sqlite')!=='sqlite')return null;
 const id=process.env.OWNER_EMAIL_PROBE_ID??'',key=process.env.OWNER_EMAIL_PROBE_SECRET??'';
 const issuedAt=Date.parse(process.env.OWNER_EMAIL_PROBE_ISSUED_AT??''),expiresAt=Date.parse(process.env.OWNER_EMAIL_PROBE_EXPIRES_AT??'');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)||!strong.test(key)||!Number.isFinite(issuedAt)||!Number.isFinite(expiresAt)||expiresAt<=issuedAt||expiresAt-issuedAt>3600000||now<issuedAt||now>(allowExpired?issuedAt+7*86400000:expiresAt))return null;
 for(const name of ['ADMIN_SECRET','CALENDAR_WORKER_SECRET','CALENDAR_EXPORT_TOKEN','OPERATOR_ALERT_WORKER_SECRET','OPERATIONS_WORKER_SECRET','STAGING_ACCESS_PASSWORD','STAGING_SESSION_SECRET','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','RESEND_OWNER_PROBE_WEBHOOK_SECRET'])if(process.env[name]===key)return null;
 return {id,key,issuedAt,expiresAt,fingerprint:hash(JSON.stringify({id,issuedAt,expiresAt,keyHash:hash(key),providerKeyHash:hash(process.env.RESEND_API_KEY??''),envelope:OWNER_PROBE_ENVELOPE}))};
}
export function ownerProbeAuthorized(req:Request,config:ProbeConfig|null):config is ProbeConfig {
 const candidate=req.headers.get('authorization')??'';
 return !!config&&candidate.length<=256&&candidate.startsWith('Bearer ')&&timingSafeEqual(createHash('sha256').update(candidate.slice(7)).digest(),createHash('sha256').update(config.key).digest());
}
export function ownerProbeWebhookReady():boolean {
 const secret=process.env.RESEND_OWNER_PROBE_WEBHOOK_SECRET;
 if(!secret||!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)||secret.length>256)return false;
 const encoded=secret.slice(6),bytes=Buffer.from(encoded,'base64');
 if(bytes.length<16||bytes.length>64||bytes.toString('base64').replace(/=+$/,'')!==encoded.replace(/=+$/,''))return false;
 return !['RESEND_WEBHOOK_SECRET','RESEND_API_KEY','OWNER_EMAIL_PROBE_SECRET','ADMIN_SECRET','CALENDAR_WORKER_SECRET','OPERATIONS_WORKER_SECRET','OPERATOR_ALERT_WORKER_SECRET'].some(name=>process.env[name]===secret);
}
export function ownerProbeProviderReady(){const key=process.env.RESEND_API_KEY;return !!key&&key.length<=256&&!/[\s\x00-\x1f\x7f]/.test(key);}
export async function sendOwnerProbe(idempotencyKey:string,expectedFingerprint:string,fetcher:typeof fetch=fetch):Promise<string>{
 const config=ownerProbeConfig();
 if(!config||config.fingerprint!==expectedFingerprint||idempotencyKey!==`owner-probe:${config.id}`||!ownerProbeProviderReady()||process.env.OWNER_EMAIL_PROBE_WEBHOOK_APPROVED!=='true'||!ownerProbeWebhookReady())throw new Error('Probe provider unavailable');
 const e=OWNER_PROBE_ENVELOPE;
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:e.from,to:[e.to],reply_to:e.replyTo,subject:e.subject,text:e.text}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Probe provider unavailable');
 const parsed=JSON.parse((await boundedBody(response,4096)).toString('utf8'));
 if(typeof parsed.id!=='string'||!PROVIDER_MESSAGE_ID.test(parsed.id))throw new Error('Probe provider unavailable');
 return parsed.id.toLowerCase();
}
