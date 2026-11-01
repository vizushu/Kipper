/** Svix documented HMAC-SHA256 protocol. Raw bytes, bounded input, timestamp tolerance, constant-time comparison. */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {PROVIDER_MESSAGE_ID,type EmailProviderEvent} from './db/email-evidence';
export const EMAIL_WEBHOOK_MAX_BYTES=64*1024;
export const EMAIL_WEBHOOK_TOLERANCE_SECONDS=300;
export class EmailWebhookError extends Error {constructor(public status=400){super('Invalid email webhook');}}
function signingKey(secret:string|undefined):Buffer {
 if(!secret||!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)||secret.length>256)throw new EmailWebhookError(503);
 const value=secret.slice(6);const key=Buffer.from(value,'base64');
 if(key.length<16||key.length>64||key.toString('base64').replace(/=+$/,'')!==value.replace(/=+$/,''))throw new EmailWebhookError(503);
 return key;
}
export function emailWebhookEnabled():boolean {
 if(process.env.STAGING_TEST_MODE==='true'||process.env.SITE_PREVIEW_MODE==='true'||process.env.EMAIL_WEBHOOK_APPROVED!=='true')return false;
 try{signingKey(process.env.RESEND_WEBHOOK_SECRET);return true;}catch{return false;}
}
export async function boundedBody(message:Request|Response,maxBytes:number):Promise<Buffer>{
 const length=message.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw new EmailWebhookError(413);
 if(!message.body)return Buffer.alloc(0);
 const reader=message.body.getReader();const chunks:Buffer[]=[];let size=0;let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});},10_000);
 try{while(true){const part=await reader.read();if(timedOut)throw new EmailWebhookError(408);if(part.done)break;size+=part.value.byteLength;if(size>maxBytes){void reader.cancel().catch(()=>{});throw new EmailWebhookError(413);}chunks.push(Buffer.from(part.value));}}
 finally{clearTimeout(timer);reader.releaseLock();}
 return Buffer.concat(chunks,size);
}
export function verifyEmailWebhookSignature(raw:Buffer,headers:Headers,secret:string|undefined,now=Date.now()):string {
 const key=signingKey(secret);
 const id=headers.get('svix-id')??'';const timestamp=headers.get('svix-timestamp')??'';const signatures=headers.get('svix-signature')??'';
 if(raw.length>EMAIL_WEBHOOK_MAX_BYTES||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||!/^\d{1,12}$/.test(timestamp)||signatures.length>1024||!signatures)throw new EmailWebhookError();
 const seconds=Number(timestamp);if(!Number.isSafeInteger(seconds)||Math.abs(Math.floor(now/1000)-seconds)>EMAIL_WEBHOOK_TOLERANCE_SECONDS)throw new EmailWebhookError();
 const candidates=signatures.split(' ');if(candidates.length>8)throw new EmailWebhookError();
 const expected=createHmac('sha256',key).update(`${id}.${timestamp}.`).update(raw).digest();
 let valid=false;
 for(const item of candidates){if(!/^v1,[A-Za-z0-9+/]{43}=$/.test(item))continue;const received=Buffer.from(item.slice(3),'base64');if(received.length===expected.length&&timingSafeEqual(expected,received))valid=true;}
 if(!valid)throw new EmailWebhookError();return id;
}
export function emailProviderEvent(raw:Buffer,eventId:string,now=Date.now()):EmailProviderEvent|null {
 let parsed:unknown;
 try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new EmailWebhookError();}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new EmailWebhookError();
 const event=parsed as {type?:unknown;created_at?:unknown;data?:{email_id?:unknown}};
 if(typeof event.type!=='string'||event.type.length>64)throw new EmailWebhookError();
 if(!['email.delivered','email.bounced','email.complained'].includes(event.type))return null;
 const emailId=event.data?.email_id;
 if(typeof emailId!=='string'||!PROVIDER_MESSAGE_ID.test(emailId)||typeof event.created_at!=='string'||event.created_at.length>40||!/^\d{4}-\d{2}-\d{2}T/.test(event.created_at)||!Number.isFinite(Date.parse(event.created_at))||Date.parse(event.created_at)>now+300_000)throw new EmailWebhookError();
 return {eventId,providerMessageId:emailId.toLowerCase(),type:event.type.slice(6) as EmailProviderEvent['type'],occurredAt:new Date(event.created_at).toISOString(),receivedAt:new Date(now).toISOString(),payloadHash:createHash('sha256').update(raw).digest('hex')};
}
