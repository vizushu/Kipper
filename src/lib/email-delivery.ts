/** Delivery approval is independent of whether new bookings are open. Never expose bad config values. */
import {isPublicPreview} from './booking-launch';
const bareMailbox=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
function validBareMailbox(value:string):boolean {
 const local=value.split('@')[0];
 return value.length<=254&&local.length<=64&&!local.startsWith('.')&&!local.endsWith('.')&&!local.includes('..')&&bareMailbox.test(value);
}
export function validEmailAddress(value:unknown,allowDisplayName=false):value is string {
 if(typeof value!=='string'||value.length>320||/[\r\n\x00-\x1f\x7f,;]/.test(value)||value!==value.trim())return false;
 if(validBareMailbox(value))return true;
 if(!allowDisplayName)return false;
 const match=/^([^<>]+) <([^<>]+)>$/.exec(value);
 return !!match&&match[1].trim().length>0&&validBareMailbox(match[2]);
}
export function configuredReplyTo():string|undefined {
 const value=process.env.BOOKING_REPLY_TO_EMAIL;
 if(value===undefined||value==='')return undefined;
 if(!validEmailAddress(value))throw new Error('Invalid email reply configuration');
 return value;
}
export function liveEmailDeliveryConfigured():boolean {
 if(process.env.STAGING_TEST_MODE==='true'||isPublicPreview()||process.env.EMAIL_DELIVERY_MODE!=='live'||process.env.EMAIL_LIVE_APPROVED!=='true')return false;
 const key=process.env.RESEND_API_KEY;
 if(!key?.trim()||/[\r\n\x00-\x1f\x7f]/.test(key)||!validEmailAddress(process.env.BOOKING_FROM_EMAIL,true)||!validEmailAddress(process.env.HOST_NOTIFY_EMAIL))return false;
 try{configuredReplyTo();return true;}catch{return false;}
}
export function validateDeliveryEnvelope(envelope:{from:string;to:string;subject:string;replyTo?:string}):void {
 if(!validEmailAddress(envelope.from,true)||!validEmailAddress(envelope.to)||
  (envelope.replyTo!==undefined&&!validEmailAddress(envelope.replyTo))||
  !envelope.subject||/[\r\n\x00-\x1f\x7f]/.test(envelope.subject))throw new Error('Invalid email envelope');
}
