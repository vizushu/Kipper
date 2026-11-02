/** Provider acceptance is not delivery. No guest identity or raw webhook payload is retained here. */
export type EmailDeliveryStatus='accepted'|'delivered'|'bounced'|'complained';
export interface EmailDeliveryEvidence {providerMessageId:string;jobId:string;acceptedAt:string;status:EmailDeliveryStatus;statusAt:string}
export interface EmailProviderEvent {eventId:string;providerMessageId:string;type:Exclude<EmailDeliveryStatus,'accepted'>;occurredAt:string;receivedAt:string;payloadHash:string}
export interface EmailEvidenceStore {
 recordOutboxAcceptance(jobId:string,leaseToken:string,providerMessageId:string,now:string):Promise<boolean>;
 recordEmailProviderEvent(event:EmailProviderEvent):Promise<'recorded'|'duplicate'|'unknown'|'conflict'>;
 getEmailDeliveryEvidence(jobId:string):Promise<EmailDeliveryEvidence|null>;
}
export const PROVIDER_MESSAGE_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validEmailProviderEvent(e:EmailProviderEvent):boolean {
 return /^[A-Za-z0-9_-]{1,128}$/.test(e.eventId)&&PROVIDER_MESSAGE_ID.test(e.providerMessageId)&&['delivered','bounced','complained'].includes(e.type)&&/^[a-f0-9]{64}$/.test(e.payloadHash)&&Number.isFinite(Date.parse(e.occurredAt))&&Number.isFinite(Date.parse(e.receivedAt));
}
