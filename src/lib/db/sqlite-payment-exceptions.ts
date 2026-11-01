import {ensureOperatorAlertSchema,enqueueOperatorAlert,suppressOperatorAlerts} from "./sqlite-operator-alerts";
import type Database from 'better-sqlite3';
import {newId} from '../ids';
import {validatePaymentException,type PaymentException,type PaymentExceptionInput,type PaymentExceptionStore} from './payment-exceptions';
type DB=InstanceType<typeof Database>;
export const PAYMENT_EXCEPTION_SCHEMA=`
CREATE TABLE IF NOT EXISTS payment_exceptions (
 id TEXT PRIMARY KEY,payment_intent_id TEXT NOT NULL,payment_mode TEXT NOT NULL,booking_id TEXT,
 amount_cents INTEGER NOT NULL,amount_received_cents INTEGER NOT NULL,currency TEXT NOT NULL,reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open',first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,event_count INTEGER NOT NULL DEFAULT 1,
 attention_required INTEGER NOT NULL DEFAULT 1,reviewed_at TEXT,review_note TEXT,
 UNIQUE(payment_mode,payment_intent_id)
);
CREATE TABLE IF NOT EXISTS payment_exception_events (
 payment_mode TEXT NOT NULL,event_id TEXT NOT NULL,exception_id TEXT NOT NULL REFERENCES payment_exceptions(id),
 PRIMARY KEY(payment_mode,event_id)
);
CREATE TABLE IF NOT EXISTS payment_exception_reviews (
 idempotency_key TEXT PRIMARY KEY,exception_id TEXT NOT NULL UNIQUE REFERENCES payment_exceptions(id),note TEXT NOT NULL,created_at TEXT NOT NULL
);`;
interface Row {id:string;payment_intent_id:string;payment_mode:'test'|'live';booking_id:string|null;amount_cents:number;amount_received_cents:number;currency:string;reason:PaymentException['reason'];status:'open'|'reviewed';first_seen_at:string;last_seen_at:string;event_count:number;attention_required:number;reviewed_at:string|null;review_note:string|null}
const map=(r:Row):PaymentException=>({id:r.id,paymentIntentId:r.payment_intent_id,paymentMode:r.payment_mode,bookingId:r.booking_id??undefined,amountCents:r.amount_cents,amountReceivedCents:r.amount_received_cents,currency:r.currency,reason:r.reason,status:r.status,firstSeenAt:r.first_seen_at,lastSeenAt:r.last_seen_at,eventCount:r.event_count,attentionRequired:!!r.attention_required,reviewedAt:r.reviewed_at??undefined,reviewNote:r.review_note??undefined});
export class SqlitePaymentExceptions implements PaymentExceptionStore {
 constructor(private db:DB){db.exec(PAYMENT_EXCEPTION_SCHEMA);ensureOperatorAlertSchema(db);}
 async recordPaymentException(input:PaymentExceptionInput){validatePaymentException(input);return this.db.transaction(()=>{
  const seen=this.db.prepare('SELECT exception_id FROM payment_exception_events WHERE payment_mode=? AND event_id=?').get(input.paymentMode,input.providerEventId) as {exception_id:string}|undefined;
  if(seen){const existing=this.db.prepare('SELECT * FROM payment_exceptions WHERE id=?').get(seen.exception_id) as Row;if(existing.payment_intent_id!==input.paymentIntentId)throw new Error('Provider event is already associated with another payment.');if(existing.status==='open')enqueueOperatorAlert(this.db,{kind:'payment_exception',incidentId:existing.id,episode:1,paymentMode:existing.payment_mode},new Date().toISOString());return {exception:map(existing),created:false};}
  const now=new Date().toISOString();let row=this.db.prepare('SELECT * FROM payment_exceptions WHERE payment_mode=? AND payment_intent_id=?').get(input.paymentMode,input.paymentIntentId) as Row|undefined;
  const created=!row;
  if(!row){const id=newId('payreview');this.db.prepare('INSERT INTO payment_exceptions(id,payment_intent_id,payment_mode,booking_id,amount_cents,amount_received_cents,currency,reason,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,input.paymentIntentId,input.paymentMode,input.bookingId??null,input.amountCents,input.amountReceivedCents,input.currency.toLowerCase(),input.reason,now,now);row=this.db.prepare('SELECT * FROM payment_exceptions WHERE id=?').get(id) as Row;}
  else {if(row.amount_cents!==input.amountCents||row.amount_received_cents!==input.amountReceivedCents||row.currency!==input.currency.toLowerCase())throw new Error('Payment evidence changed; reconciliation required.');this.db.prepare('UPDATE payment_exceptions SET last_seen_at=?,event_count=event_count+1 WHERE id=?').run(now,row.id);}
  if(row.status==='open')enqueueOperatorAlert(this.db,{kind:'payment_exception',incidentId:row.id,episode:1,paymentMode:row.payment_mode},now);
  this.db.prepare('INSERT INTO payment_exception_events(payment_mode,event_id,exception_id) VALUES(?,?,?)').run(input.paymentMode,input.providerEventId,row.id);
  return {exception:map(this.db.prepare('SELECT * FROM payment_exceptions WHERE id=?').get(row.id) as Row),created};
 }).immediate();}
 async listPaymentExceptions(){return (this.db.prepare('SELECT * FROM payment_exceptions ORDER BY first_seen_at DESC,id').all() as Row[]).map(map);}
 async reviewPaymentException(id:string,note:string,key:string){if(note.trim().length<10||note.length>1000||key.length<8||key.length>128)throw new Error('Review needs an explanatory note and idempotency key.');return this.db.transaction(()=>{
  const row=this.db.prepare('SELECT * FROM payment_exceptions WHERE id=?').get(id) as Row|undefined;if(!row)return null;
  const prior=this.db.prepare('SELECT exception_id,note FROM payment_exception_reviews WHERE idempotency_key=?').get(key) as {exception_id:string;note:string}|undefined;
  if(prior){if(prior.exception_id!==id||prior.note!==note.trim())throw new Error('Review key belongs to another action.');return map(row);}
  if(row.status!=='open')throw new Error('This review case is already closed; no duplicate action was recorded.');
  suppressOperatorAlerts(this.db,'payment_exception',id);
  const now=new Date().toISOString();this.db.prepare('INSERT INTO payment_exception_reviews(idempotency_key,exception_id,note,created_at) VALUES(?,?,?,?)').run(key,id,note.trim(),now);
  this.db.prepare("UPDATE payment_exceptions SET status='reviewed',attention_required=0,reviewed_at=?,review_note=? WHERE id=? AND status='open'").run(now,note.trim(),id);
  return map(this.db.prepare('SELECT * FROM payment_exceptions WHERE id=?').get(id) as Row);
 }).immediate();}
}
