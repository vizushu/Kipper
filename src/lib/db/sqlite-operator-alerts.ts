import type Database from 'better-sqlite3';
import {newId} from '../ids';
import {configuredCalendarFingerprint,calendarTime,calendarPropertyId} from './calendar-store';
import type {OperatorAlert,OperatorAlertEnvelope,OperatorAlertKind,OperatorAlertStore,OperatorAlertReadiness,PaymentSetupFailure} from './operator-alerts';
type DB=InstanceType<typeof Database>;
const SCHEMA=`CREATE TABLE IF NOT EXISTS operator_alerts (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL,incident_id TEXT NOT NULL,episode INTEGER NOT NULL,
 payment_mode TEXT NOT NULL,dedupe_key TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,next_attempt_at TEXT NOT NULL,
 first_attempt_at TEXT,lease_token TEXT,lease_until TEXT,last_error TEXT,envelope_json TEXT
);
CREATE INDEX IF NOT EXISTS operator_alert_due ON operator_alerts(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS operator_calendar_health (property_id TEXT PRIMARY KEY,healthy INTEGER NOT NULL,episode INTEGER NOT NULL,last_observed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS operator_alert_dispatcher (id INTEGER PRIMARY KEY CHECK(id=1),last_success_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payment_setup_failures (id TEXT PRIMARY KEY,booking_id TEXT NOT NULL,payment_intent_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',review_note TEXT,reviewed_at TEXT,review_key TEXT);
`;
export function ensureOperatorAlertSchema(db:DB):void{db.exec(SCHEMA);const columns=new Set((db.prepare('PRAGMA table_info(payment_setup_failures)').all() as {name:string}[]).map(r=>r.name));for(const [name,definition] of Object.entries({status:"TEXT NOT NULL DEFAULT 'open'",review_note:'TEXT',reviewed_at:'TEXT',review_key:'TEXT'})){if(!columns.has(name))db.exec(`ALTER TABLE payment_setup_failures ADD COLUMN ${name} ${definition}`);}}
interface Row {id:string;kind:OperatorAlertKind;incident_id:string;episode:number;payment_mode:'test'|'live';dedupe_key:string;status:OperatorAlert['status'];attempts:number;created_at:string;next_attempt_at:string;first_attempt_at:string|null;lease_token:string|null;lease_until:string|null;last_error:string|null;envelope_json:string|null}
const map=(r:Row):OperatorAlert=>({id:r.id,kind:r.kind,incidentId:r.incident_id,episode:r.episode,paymentMode:r.payment_mode,dedupeKey:r.dedupe_key,status:r.status,attempts:r.attempts,createdAt:r.created_at,nextAttemptAt:r.next_attempt_at,...(r.first_attempt_at?{firstAttemptAt:r.first_attempt_at}:{}),...(r.lease_token?{leaseToken:r.lease_token}:{}),...(r.lease_until?{leaseUntil:r.lease_until}:{}),...(r.last_error?{lastError:r.last_error}:{}),...(r.envelope_json?{envelope:JSON.parse(r.envelope_json)}:{})});
/** Caller must own the incident's write transaction; failure rolls back both writes. */
export function enqueueOperatorAlert(db:DB,input:{kind:OperatorAlertKind;incidentId:string;episode:number;paymentMode:'test'|'live'},now:string):void {
 calendarTime(now);if(!['calendar_conflict','payment_exception','calendar_health','payment_setup'].includes(input.kind)||!/^[a-zA-Z0-9_-]{1,128}$/.test(input.incidentId)||!Number.isSafeInteger(input.episode)||input.episode<1||!['test','live'].includes(input.paymentMode))throw new Error('Invalid operator alert identity.');
 const key=`operator/${input.kind}/${input.incidentId}/v${input.episode}`;
 db.prepare('INSERT OR IGNORE INTO operator_alerts(id,kind,incident_id,episode,payment_mode,dedupe_key,created_at,next_attempt_at) VALUES(?,?,?,?,?,?,?,?)').run(newId('alert'),input.kind,input.incidentId,input.episode,input.paymentMode,key,now,now);
}
export function suppressOperatorAlerts(db:DB,kind:OperatorAlertKind,incidentId:string):void {
 db.prepare("UPDATE operator_alerts SET status='suppressed',lease_token=NULL,lease_until=NULL,envelope_json=NULL,last_error='incident_reviewed' WHERE kind=? AND incident_id=? AND status IN ('pending','processing','dead')").run(kind,incidentId);
}
export function recordCalendarHealth(db:DB,propertyId:string,healthy:boolean,now:string):void {
 const p=calendarPropertyId(propertyId);const time=calendarTime(now);
 if(healthy){const sources=db.prepare('SELECT status,last_success_at,conflict_count,success_fingerprint FROM calendar_sources WHERE property_id=?').all(p) as {status:string;last_success_at:string|null;conflict_count:number;success_fingerprint:string|null}[];healthy=sources.length>0&&sources.every(s=>(configuredCalendarFingerprint()?s.success_fingerprint===configuredCalendarFingerprint():!process.env.AIRBNB_ICAL_URL&&process.env.CALENDAR_SYNC_REQUIRED!=='true'&&process.env.INVENTORY_POLICY!=='shared_ical'&&s.success_fingerprint===null)&&s.status==='healthy'&&s.conflict_count===0&&s.last_success_at&&Number.isFinite(Date.parse(s.last_success_at))&&Date.parse(s.last_success_at)<=time&&time-Date.parse(s.last_success_at)<15*60_000);}
 const row=db.prepare('SELECT healthy,episode,last_observed_at FROM operator_calendar_health WHERE property_id=?').get(p) as {healthy:number;episode:number;last_observed_at:string}|undefined;
 if(row&&row.last_observed_at>now)throw new Error('Alert observation clock moved backwards.');
 const episode=healthy?(row?.episode??0):row?.healthy===0?row.episode:(row?.episode??0)+1;
 db.prepare('INSERT INTO operator_calendar_health(property_id,healthy,episode,last_observed_at) VALUES(?,?,?,?) ON CONFLICT(property_id) DO UPDATE SET healthy=excluded.healthy,episode=excluded.episode,last_observed_at=excluded.last_observed_at').run(p,healthy?1:0,episode,now);
 if(healthy)suppressOperatorAlerts(db,'calendar_health',p);
 else enqueueOperatorAlert(db,{kind:'calendar_health',incidentId:p,episode,paymentMode:'live'},now);
}
export function operatorAlertReadiness(db:DB,now:string):OperatorAlertReadiness {
 const time=calendarTime(now),row=db.prepare('SELECT last_success_at FROM operator_alert_dispatcher WHERE id=1').get() as {last_success_at:string}|undefined;
 const last=row?.last_success_at??null,stamp=last?Date.parse(last):NaN;
 const dead=(db.prepare("SELECT count(*) n FROM operator_alerts WHERE payment_mode='live' AND status='dead'").get() as {n:number}).n;
 const overdue=(db.prepare("SELECT count(*) n FROM operator_alerts WHERE payment_mode='live' AND status IN ('pending','processing') AND created_at<=?").get(new Date(time-15*60_000).toISOString()) as {n:number}).n;
 return {ready:Number.isFinite(stamp)&&stamp<=time&&time-stamp<15*60_000&&dead===0&&overdue===0,lastSuccessAt:last,deadCount:dead,overdueCount:overdue};
}
export function assertOperatorAlertReady(db:DB,now:string):void {if(!operatorAlertReadiness(db,now).ready)throw new Error('Operator alert dispatcher needs verification.');}
export class SqliteOperatorAlerts implements OperatorAlertStore {
 constructor(private db:DB){ensureOperatorAlertSchema(db);}
 async recordCalendarHealthAlert(p:string,healthy:boolean,now:string):Promise<void>{this.db.transaction(()=>recordCalendarHealth(this.db,p,healthy,now)).immediate();}
 async completeOperatorAlertRun(now:string):Promise<void>{if(process.env.SITE_PREVIEW_MODE==='true')return;calendarTime(now);this.db.prepare('INSERT INTO operator_alert_dispatcher(id,last_success_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_success_at=excluded.last_success_at WHERE operator_alert_dispatcher.last_success_at<=excluded.last_success_at').run(now);}
 async getOperatorAlertReadiness(now:string):Promise<OperatorAlertReadiness>{return this.db.transaction(()=>operatorAlertReadiness(this.db,now))();}
 async recordPaymentSetupFailure(bookingId:string,pi:string,now:string):Promise<{id:string;created:boolean}>{calendarTime(now);if(!/^pi_[A-Za-z0-9_]{1,180}$/.test(pi))throw new Error('Invalid payment setup identity.');return this.db.transaction(()=>{
  const booking=this.db.prepare('SELECT payment_mode FROM bookings WHERE id=?').get(bookingId) as {payment_mode:'test'|'live'}|undefined;if(!booking)throw new Error('Payment setup booking is unavailable.');
  const prior=this.db.prepare('SELECT id,booking_id,status FROM payment_setup_failures WHERE payment_intent_id=?').get(pi) as {id:string;booking_id:string;status:string}|undefined;if(prior&&prior.booking_id!==bookingId)throw new Error('Payment setup identity mismatch.');
  const id=prior?.id??newId('setupreview');if(!prior)this.db.prepare('INSERT INTO payment_setup_failures(id,booking_id,payment_intent_id,created_at) VALUES(?,?,?,?)').run(id,bookingId,pi,now);
  if(!prior||prior.status==='open')enqueueOperatorAlert(this.db,{kind:'payment_setup',incidentId:id,episode:1,paymentMode:booking.payment_mode},now);return {id,created:!prior};
 }).immediate();}
 private setupRecord(id:string):PaymentSetupFailure|null {const r=this.db.prepare('SELECT * FROM payment_setup_failures WHERE id=?').get(id) as {id:string;booking_id:string;payment_intent_id:string;created_at:string;status:'open'|'reviewed';review_note:string|null;reviewed_at:string|null;review_key:string|null}|undefined;return r?{id:r.id,bookingId:r.booking_id,paymentIntentId:r.payment_intent_id,createdAt:r.created_at,status:r.status,...(r.review_note?{reviewNote:r.review_note}:{}),...(r.reviewed_at?{reviewedAt:r.reviewed_at}:{}),...(r.review_key?{reviewKey:r.review_key}:{})}:null;}
 async reviewPaymentSetupFailure(id:string,note:string,key:string,now:string):Promise<PaymentSetupFailure|null>{calendarTime(now);if(typeof note!=='string'||note.trim().length<5||note.length>1000||typeof key!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(key))throw new Error('Invalid setup review.');return this.db.transaction(()=>{const r=this.setupRecord(id);if(!r)return null;if(r.status==='reviewed'){if(r.reviewKey!==key||r.reviewNote!==note.trim())throw new Error('Setup review already recorded.');return r;}this.db.prepare("UPDATE payment_setup_failures SET status='reviewed',review_note=?,reviewed_at=?,review_key=? WHERE id=? AND status='open'").run(note.trim(),now,key,id);suppressOperatorAlerts(this.db,'payment_setup',id);return this.setupRecord(id);}).immediate();}
 async listPaymentSetupFailures():Promise<PaymentSetupFailure[]>{return (this.db.prepare('SELECT id FROM payment_setup_failures ORDER BY created_at DESC LIMIT 500').all() as {id:string}[]).map(r=>this.setupRecord(r.id)!);}
 private expire(now:string):void {
  const before=new Date(Date.parse(now)-23*3600_000).toISOString();
  this.db.prepare("UPDATE operator_alerts SET status='dead',lease_token=NULL,lease_until=NULL,envelope_json=NULL,last_error='retry_budget_exhausted' WHERE status IN ('pending','processing') AND ((attempts>=5 AND (lease_until IS NULL OR lease_until<=?)) OR (first_attempt_at IS NOT NULL AND first_attempt_at<=?))").run(now,before);
 }
 async listOperatorAlerts():Promise<OperatorAlert[]>{return (this.db.prepare('SELECT * FROM operator_alerts ORDER BY created_at,id LIMIT 500').all() as Row[]).map(map);}
 async claimOperatorAlerts(now:string,limit:number,alertId?:string):Promise<OperatorAlert[]>{
  if(process.env.SITE_PREVIEW_MODE==='true')return [];calendarTime(now);if(!Number.isInteger(limit)||limit<1||limit>10)throw new Error('Invalid alert batch size.');
  return this.db.transaction(()=>{this.expire(now);const rows=this.db.prepare("SELECT * FROM operator_alerts WHERE payment_mode='live' AND ((status='pending' AND next_attempt_at<=?) OR (status='processing' AND lease_until<=?)) AND (? IS NULL OR id=?) ORDER BY created_at,id LIMIT ?").all(now,now,alertId??null,alertId??null,limit) as Row[];
   return rows.map(r=>{const lease=newId('lease');this.db.prepare("UPDATE operator_alerts SET status='processing',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,?),lease_token=?,lease_until=? WHERE id=?").run(now,lease,new Date(Date.parse(now)+5*60_000).toISOString(),r.id);return map(this.db.prepare('SELECT * FROM operator_alerts WHERE id=?').get(r.id) as Row);});
  }).immediate();
 }
 async prepareOperatorAlertMessage(id:string,lease:string,envelope:OperatorAlertEnvelope,now:string):Promise<OperatorAlertEnvelope|null>{
  if(process.env.SITE_PREVIEW_MODE==='true')return null;calendarTime(now);
  if(!envelope||![envelope.from,envelope.to,envelope.subject,envelope.text].every(v=>typeof v==='string'&&v.length>0&&v.length<=10000)||/[\r\n]/.test(envelope.from+envelope.to+envelope.subject))throw new Error('Invalid operator alert envelope.');
  return this.db.transaction(()=>{this.expire(now);const update=this.db.prepare("UPDATE operator_alerts SET envelope_json=coalesce(envelope_json,?) WHERE id=? AND status='processing' AND lease_token=? AND lease_until>?").run(JSON.stringify(envelope),id,lease,now);if(!update.changes)return null;return JSON.parse((this.db.prepare('SELECT envelope_json FROM operator_alerts WHERE id=?').get(id) as {envelope_json:string}).envelope_json);}).immediate();
 }
 async finishOperatorAlert(id:string,lease:string,outcome:'sent'|'simulated'|'failed',now:string):Promise<boolean>{
  if(process.env.SITE_PREVIEW_MODE==='true')return false;calendarTime(now);if(!['sent','simulated','failed'].includes(outcome))throw new Error('Invalid alert outcome.');
  return this.db.transaction(()=>{this.expire(now);const row=this.db.prepare("SELECT * FROM operator_alerts WHERE id=? AND status='processing' AND lease_token=? AND lease_until>?").get(id,lease,now) as Row|undefined;if(!row)return false;
   const terminal=outcome!=='failed'||row.attempts>=5;const status=outcome==='failed'?(terminal?'dead':'pending'):outcome;const delay=[60,300,900,3600,3600][Math.min(row.attempts-1,4)]*1000;
   this.db.prepare('UPDATE operator_alerts SET status=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,last_error=?,envelope_json=CASE WHEN ? THEN NULL ELSE envelope_json END WHERE id=? AND lease_token=?').run(status,new Date(Date.parse(now)+delay).toISOString(),outcome==='failed'?'delivery_failed':null,terminal?1:0,id,lease);return true;
  }).immediate();
 }
}
