import type { Booking } from '../types';
export type OutboxKind = 'guest_confirmation' | 'host_notification' | 'access_recovery';
export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'simulated' | 'suppressed' | 'dead';
export interface OutboxEnvelope { from: string; to: string; subject: string; html: string }
export interface OutboxJob {
  id:string; bookingId:string; kind:OutboxKind; dedupeKey:string; status:OutboxStatus;
  payload:{booking?:Booking; recovery?:{recipient:string;token:string;reference:string;expiresAt:string}};
  envelope?:OutboxEnvelope; attempts:number; createdAt:string; nextAttemptAt:string;
  firstAttemptAt?:string; leaseToken?:string; leaseUntil?:string; lastError?:string;
}
export interface WorkflowStore {
  ensureReceiptOutbox(bookingId:string):Promise<void>;
  claimOutbox(now:string,limit:number,jobId?:string):Promise<OutboxJob[]>;
  prepareOutboxMessage(id:string,leaseToken:string,envelope:OutboxEnvelope,now:string):Promise<OutboxEnvelope|null>;
  finishOutbox(id:string,leaseToken:string,outcome:'sent'|'simulated'|'failed',now:string):Promise<boolean>;
  listOutbox():Promise<OutboxJob[]>;
  consumeRecoveryRateLimit(bucketHash:string,windowStartISO:string,limit:number):Promise<boolean>;
  createBookingRecovery(input:{tokenHash:string;bookingId:string;reference:string;expiresAt:string;createdAt:string},notification:{recipient:string;token:string}):Promise<void>;
  consumeBookingRecovery(tokenHash:string,nowISO:string):Promise<{reference:string}|null>;
}
