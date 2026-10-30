import type Database from 'better-sqlite3';
import {newId} from '../ids';
import type {Booking} from '../types';
import type {OutboxEnvelope,OutboxJob,WorkflowStore} from './workflows';
type DB=InstanceType<typeof Database>;
export const WORKFLOW_SCHEMA=`
CREATE TABLE IF NOT EXISTS delivery_outbox (
 id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), kind TEXT NOT NULL,
 dedupe_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending', payload_json TEXT NOT NULL,
 envelope_json TEXT, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
 next_attempt_at TEXT NOT NULL, first_attempt_at TEXT, lease_token TEXT, lease_until TEXT, last_error TEXT
);
CREATE INDEX IF NOT EXISTS outbox_due ON delivery_outbox(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS booking_recovery (
 token_hash TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), reference TEXT NOT NULL,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT
);
CREATE TABLE IF NOT EXISTS recovery_rate_limits (bucket_hash TEXT NOT NULL,window_start TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(bucket_hash,window_start));
`;
interface Row {id:string;booking_id:string;kind:OutboxJob['kind'];dedupe_key:string;status:OutboxJob['status'];payload_json:string;envelope_json:string|null;attempts:number;created_at:string;next_attempt_at:string;first_attempt_at:string|null;lease_token:string|null;lease_until:string|null;last_error:string|null}
const map=(r:Row):OutboxJob=>({id:r.id,bookingId:r.booking_id,kind:r.kind,dedupeKey:r.dedupe_key,status:r.status,payload:JSON.parse(r.payload_json),envelope:r.envelope_json?JSON.parse(r.envelope_json):undefined,attempts:r.attempts,createdAt:r.created_at,nextAttemptAt:r.next_attempt_at,firstAttemptAt:r.first_attempt_at??undefined,leaseToken:r.lease_token??undefined,leaseUntil:r.lease_until??undefined,lastError:r.last_error??undefined});
export class SqliteWorkflows implements WorkflowStore {
 constructor(private db:DB,private booking:(id:string)=>Booking|null){db.exec(WORKFLOW_SCHEMA);}
 queueReceipts(booking:Booking,now:string):void {
  if(booking.status!=='confirmed')return;
  for(const kind of ['guest_confirmation','host_notification'] as const){const key=`${kind}/${booking.id}/v1`;this.db.prepare(`INSERT OR IGNORE INTO delivery_outbox(id,booking_id,kind,dedupe_key,payload_json,created_at,next_attempt_at) VALUES(?,?,?,?,?,?,?)`).run(newId('mail'),booking.id,kind,key,JSON.stringify({booking}),now,now);}
 }
 async ensureReceiptOutbox(id:string):Promise<void>{this.db.transaction(()=>{const b=this.booking(id);if(b)this.queueReceipts(b,new Date().toISOString());}).immediate();}
 private suppress(now:string):void {
  this.db.prepare(`UPDATE delivery_outbox SET status='suppressed',payload_json='{}',envelope_json=NULL,lease_token=NULL,lease_until=NULL,last_error='booking_cancelled_or_recovery_expired' WHERE status IN ('pending','processing') AND ((kind!='access_recovery' AND booking_id IN (SELECT id FROM bookings WHERE status!='confirmed')) OR (kind='access_recovery' AND (json_extract(payload_json,'$.recovery.expiresAt')<=? OR NOT EXISTS(SELECT 1 FROM booking_recovery r WHERE r.booking_id=delivery_outbox.booking_id AND r.token_hash=substr(delivery_outbox.dedupe_key,10) AND r.consumed_at IS NULL AND r.expires_at>?))))`).run(now,now);
  this.db.prepare(`UPDATE delivery_outbox SET status='dead',payload_json='{}',envelope_json=NULL,lease_token=NULL,lease_until=NULL,last_error='retry_budget_exhausted' WHERE status IN ('pending','processing') AND ((attempts>=5 AND (lease_until IS NULL OR lease_until<=?)) OR (first_attempt_at IS NOT NULL AND first_attempt_at<=?))`).run(now,new Date(Date.parse(now)-23*3600_000).toISOString());
 }
 async claimOutbox(now:string,limit:number,jobId?:string):Promise<OutboxJob[]>{return this.db.transaction(()=>{
  this.suppress(now);
  const rows=this.db.prepare(`SELECT * FROM delivery_outbox WHERE ((status='pending' AND next_attempt_at<=?) OR (status='processing' AND lease_until<=?)) AND (? IS NULL OR id=?) ORDER BY created_at,id LIMIT ?`).all(now,now,jobId??null,jobId??null,Math.max(1,Math.min(limit,10))) as Row[];
  return rows.map(row=>{const token=newId('lease');this.db.prepare(`UPDATE delivery_outbox SET status='processing',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,?),lease_token=?,lease_until=? WHERE id=?`).run(now,token,new Date(Date.parse(now)+5*60_000).toISOString(),row.id);return map(this.db.prepare('SELECT * FROM delivery_outbox WHERE id=?').get(row.id) as Row);});
 }).immediate();}
 async prepareOutboxMessage(id:string,lease:string,envelope:OutboxEnvelope,now:string):Promise<OutboxEnvelope|null>{return this.db.transaction(()=>{
  this.suppress(now);
  const result=this.db.prepare(`UPDATE delivery_outbox SET envelope_json=coalesce(envelope_json,?) WHERE id=? AND status='processing' AND lease_token=? AND lease_until>?`).run(JSON.stringify(envelope),id,lease,now);
  if(!result.changes)return null;return JSON.parse((this.db.prepare('SELECT envelope_json FROM delivery_outbox WHERE id=?').get(id) as {envelope_json:string}).envelope_json);
 }).immediate();}
 async finishOutbox(id:string,lease:string,outcome:'sent'|'simulated'|'failed',now:string):Promise<boolean>{return this.db.transaction(()=>{
  this.suppress(now);const row=this.db.prepare(`SELECT * FROM delivery_outbox WHERE id=? AND status='processing' AND lease_token=? AND lease_until>?`).get(id,lease,now) as Row|undefined;if(!row)return false;
  const terminal=outcome!=='failed'||row.attempts>=5;const status=outcome==='failed'?(terminal?'dead':'pending'):outcome;
  const delay=[60,300,900,3600,3600][Math.min(row.attempts-1,4)]*1000;
  this.db.prepare(`UPDATE delivery_outbox SET status=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,last_error=?,payload_json=CASE WHEN ? THEN '{}' ELSE payload_json END,envelope_json=CASE WHEN ? THEN NULL ELSE envelope_json END WHERE id=? AND lease_token=?`).run(status,new Date(Date.parse(now)+delay).toISOString(),outcome==='failed'?'delivery_failed':null,terminal?1:0,terminal?1:0,id,lease);return true;
 }).immediate();}
 async listOutbox():Promise<OutboxJob[]>{return (this.db.prepare('SELECT * FROM delivery_outbox ORDER BY created_at,id').all() as Row[]).map(map);}
 async consumeRecoveryRateLimit(bucket:string,window:string,limit:number):Promise<boolean>{return this.db.transaction(()=>{
  this.suppress(new Date().toISOString());
  this.db.prepare('DELETE FROM booking_recovery WHERE expires_at<?').run(new Date(Date.parse(window)-48*3600_000).toISOString());
  this.db.prepare('DELETE FROM recovery_rate_limits WHERE window_start<?').run(new Date(Date.parse(window)-48*3600_000).toISOString());
  this.db.prepare(`INSERT INTO recovery_rate_limits(bucket_hash,window_start,count) VALUES(?,?,1) ON CONFLICT(bucket_hash,window_start) DO UPDATE SET count=count+1`).run(bucket,window);
  return (this.db.prepare('SELECT count FROM recovery_rate_limits WHERE bucket_hash=? AND window_start=?').get(bucket,window) as {count:number}).count<=limit;
 }).immediate();}
 async createBookingRecovery(input:{tokenHash:string;bookingId:string;reference:string;expiresAt:string;createdAt:string},notification:{recipient:string;token:string}):Promise<void>{this.db.transaction(()=>{
  const b=this.booking(input.bookingId);if(!b||b.reference!==input.reference||b.guest.email.trim().toLowerCase()!==notification.recipient.trim().toLowerCase())throw new Error('Recovery identity mismatch');
  this.db.prepare('UPDATE booking_recovery SET consumed_at=? WHERE booking_id=? AND consumed_at IS NULL').run(input.createdAt,input.bookingId);
  this.db.prepare(`UPDATE delivery_outbox SET status='suppressed',payload_json='{}',envelope_json=NULL,lease_token=NULL,lease_until=NULL WHERE booking_id=? AND kind='access_recovery' AND status IN ('pending','processing')`).run(input.bookingId);
  this.db.prepare('INSERT INTO booking_recovery(token_hash,booking_id,reference,expires_at,created_at) VALUES(?,?,?,?,?)').run(input.tokenHash,input.bookingId,input.reference,input.expiresAt,input.createdAt);
  this.db.prepare(`INSERT INTO delivery_outbox(id,booking_id,kind,dedupe_key,payload_json,created_at,next_attempt_at) VALUES(?,?,'access_recovery',?,?,?,?)`).run(newId('mail'),input.bookingId,`recovery/${input.tokenHash}`,JSON.stringify({recovery:{...notification,reference:input.reference,expiresAt:input.expiresAt}}),input.createdAt,input.createdAt);
 }).immediate();}
 async consumeBookingRecovery(hash:string,now:string):Promise<{reference:string}|null>{return this.db.transaction(()=>{
  const row=this.db.prepare('SELECT r.reference FROM booking_recovery r JOIN bookings b ON b.id=r.booking_id WHERE r.token_hash=? AND r.consumed_at IS NULL AND r.expires_at>?').get(hash,now) as {reference:string}|undefined;if(!row)return null;
  this.db.prepare('UPDATE booking_recovery SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL').run(now,hash);this.suppress(now);return row;
 }).immediate();}
}
