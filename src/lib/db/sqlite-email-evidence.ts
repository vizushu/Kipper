import type Database from 'better-sqlite3';
import {PROVIDER_MESSAGE_ID,validEmailProviderEvent,type EmailEvidenceStore,type EmailDeliveryEvidence,type EmailProviderEvent,type EmailDeliveryStatus} from './email-evidence';
type DB=InstanceType<typeof Database>;
const ranks:Record<EmailDeliveryStatus,number>={accepted:0,delivered:1,bounced:2,complained:3};
const SCHEMA=`
CREATE TABLE IF NOT EXISTS email_delivery_evidence (
 provider_message_id TEXT PRIMARY KEY,job_id TEXT NOT NULL UNIQUE REFERENCES delivery_outbox(id),
 accepted_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted','delivered','bounced','complained')),status_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_acceptance_attempts (
 job_id TEXT NOT NULL REFERENCES delivery_outbox(id),attempt INTEGER NOT NULL,provider_message_id TEXT NOT NULL REFERENCES email_delivery_evidence(provider_message_id),accepted_at TEXT NOT NULL,PRIMARY KEY(job_id,attempt)
);
CREATE TABLE IF NOT EXISTS email_provider_events (
 event_id TEXT PRIMARY KEY,provider_message_id TEXT NOT NULL REFERENCES email_delivery_evidence(provider_message_id),type TEXT NOT NULL CHECK(type IN ('delivered','bounced','complained')),occurred_at TEXT NOT NULL,received_at TEXT NOT NULL,payload_hash TEXT NOT NULL
);`;
type Row={provider_message_id:string;job_id:string;accepted_at:string;status:EmailDeliveryStatus;status_at:string};
export class SqliteEmailEvidence implements EmailEvidenceStore {
 constructor(private db:DB){db.exec(SCHEMA);}
 async recordOutboxAcceptance(jobId:string,lease:string,id:string,now:string):Promise<boolean>{
  if(!PROVIDER_MESSAGE_ID.test(id)||!Number.isFinite(Date.parse(now)))return false;
  return this.db.transaction(()=>{
   const job=this.db.prepare("SELECT attempts FROM delivery_outbox WHERE id=? AND status='processing' AND lease_token=? AND lease_until>?").get(jobId,lease,now) as {attempts:number}|undefined;
   if(!job)return false;
   const linked=this.db.prepare('SELECT * FROM email_delivery_evidence WHERE provider_message_id=? OR job_id=?').all(id,jobId) as Row[];
   if(linked.some(r=>r.job_id!==jobId||r.provider_message_id!==id))return false;
   this.db.prepare("INSERT OR IGNORE INTO email_delivery_evidence(provider_message_id,job_id,accepted_at,status_at) VALUES(?,?,?,?)").run(id,jobId,now,now);
   const prior=this.db.prepare('SELECT provider_message_id FROM email_acceptance_attempts WHERE job_id=? AND attempt=?').get(jobId,job.attempts) as {provider_message_id:string}|undefined;
   if(prior&&prior.provider_message_id!==id)return false;
   this.db.prepare('INSERT OR IGNORE INTO email_acceptance_attempts(job_id,attempt,provider_message_id,accepted_at) VALUES(?,?,?,?)').run(jobId,job.attempts,id,now);
   return true;
  }).immediate();
 }
 async recordEmailProviderEvent(event:EmailProviderEvent):Promise<'recorded'|'duplicate'|'unknown'|'conflict'>{
  if(!validEmailProviderEvent(event))return 'conflict';
  return this.db.transaction(()=>{
   const existing=this.db.prepare('SELECT * FROM email_provider_events WHERE event_id=?').get(event.eventId) as {provider_message_id:string;type:string;occurred_at:string;payload_hash:string}|undefined;
   if(existing)return existing.provider_message_id===event.providerMessageId&&existing.type===event.type&&existing.occurred_at===event.occurredAt&&existing.payload_hash===event.payloadHash?'duplicate':'conflict';
   const known=this.db.prepare('SELECT * FROM email_delivery_evidence WHERE provider_message_id=?').get(event.providerMessageId) as Row|undefined;
   if(!known)return 'unknown';
   this.db.prepare('INSERT INTO email_provider_events(event_id,provider_message_id,type,occurred_at,received_at,payload_hash) VALUES(?,?,?,?,?,?)').run(event.eventId,event.providerMessageId,event.type,event.occurredAt,event.receivedAt,event.payloadHash);
   if(ranks[event.type]>ranks[known.status])this.db.prepare('UPDATE email_delivery_evidence SET status=?,status_at=? WHERE provider_message_id=?').run(event.type,event.occurredAt,event.providerMessageId);
   return 'recorded';
  }).immediate();
 }
 async getEmailDeliveryEvidence(jobId:string):Promise<EmailDeliveryEvidence|null>{const row=this.db.prepare('SELECT * FROM email_delivery_evidence WHERE job_id=?').get(jobId) as Row|undefined;return row?{providerMessageId:row.provider_message_id,jobId:row.job_id,acceptedAt:row.accepted_at,status:row.status,statusAt:row.status_at}:null;}
}
