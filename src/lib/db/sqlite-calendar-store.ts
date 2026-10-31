import type Database from 'better-sqlite3';
import {createHash,randomUUID} from 'node:crypto';
import {BookingError} from '../types';
import {calendarPropertyId,calendarSourceId,calendarTime,validateCalendarEvents,CALENDAR_LEASE_MS,CALENDAR_MAX_AGE_MS,type CalendarSnapshot,type CalendarStatus,type CalendarStore} from './calendar-store';
type DB=InstanceType<typeof Database>;
const SCHEMA=`
CREATE TABLE IF NOT EXISTS calendar_sources (
 property_id TEXT NOT NULL,source_id TEXT NOT NULL,status TEXT NOT NULL,
 last_success_at TEXT,last_attempt_at TEXT NOT NULL,lease_id TEXT,lease_until TEXT,
 conflict_count INTEGER NOT NULL DEFAULT 0,last_reviewed_at TEXT,review_count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(property_id,source_id)
);
CREATE TABLE IF NOT EXISTS calendar_events (
 property_id TEXT NOT NULL,source_id TEXT NOT NULL,uid_hash TEXT NOT NULL,block_id TEXT NOT NULL UNIQUE,
 PRIMARY KEY(property_id,source_id,uid_hash),
 FOREIGN KEY(property_id,source_id) REFERENCES calendar_sources(property_id,source_id),
 FOREIGN KEY(block_id) REFERENCES blocks(id)
);
CREATE TABLE IF NOT EXISTS calendar_conflicts (
 incident_hash TEXT PRIMARY KEY,property_id TEXT NOT NULL,source_id TEXT NOT NULL,detected_at TEXT NOT NULL,resolved_at TEXT
);
`;
interface SourceRow {property_id:string;source_id:string;status:CalendarStatus['status'];last_success_at:string|null;last_attempt_at:string;lease_id:string|null;lease_until:string|null;conflict_count:number;last_reviewed_at:string|null;review_count:number}
export class SqliteCalendarStore implements CalendarStore {
 constructor(private db:DB){db.exec(SCHEMA);}
 private row(propertyId:string,sourceId:string){return this.db.prepare('SELECT * FROM calendar_sources WHERE property_id=? AND source_id=?').get(propertyId,sourceId) as SourceRow|undefined;}
 private count(propertyId:string,sourceId:string){return (this.db.prepare('SELECT count(*) n FROM calendar_events WHERE property_id=? AND source_id=?').get(propertyId,sourceId) as {n:number}).n;}
 assertFresh(propertyId:string,nowISO:string):void {
  const property=calendarPropertyId(propertyId),now=calendarTime(nowISO);const rows=this.db.prepare('SELECT * FROM calendar_sources WHERE property_id=?').all(property) as SourceRow[];
  if((!rows.length&&process.env.CALENDAR_SYNC_REQUIRED==='true')||rows.some(r=>r.status!=='healthy'||r.conflict_count>0||!r.last_success_at||!Number.isFinite(Date.parse(r.last_success_at))||now-Date.parse(r.last_success_at)>=CALENDAR_MAX_AGE_MS||Date.parse(r.last_success_at)>now))throw new BookingError('UNAVAILABLE','Availability needs calendar verification. Please contact us about these dates.');
 }
 async beginCalendarSync(propertyId:string,sourceId:string,nowISO=new Date().toISOString()) {
  const p=calendarPropertyId(propertyId),s=calendarSourceId(sourceId),now=calendarTime(nowISO),leaseId=randomUUID();
  return this.db.transaction(()=>{
   const row=this.row(p,s);if(row?.lease_until&&Date.parse(row.lease_until)>now)return null;
   if(row&&Date.parse(row.last_attempt_at)>now)throw new Error('Calendar timestamp moved backwards.');
   this.db.prepare(`INSERT INTO calendar_sources(property_id,source_id,status,last_attempt_at,lease_id,lease_until) VALUES(?,?,'pending',?,?,?) ON CONFLICT(property_id,source_id) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,lease_id=excluded.lease_id,lease_until=excluded.lease_until`).run(p,s,nowISO,leaseId,new Date(now+CALENDAR_LEASE_MS).toISOString());return {leaseId};
  }).immediate();
 }
 async completeCalendarSync(input:CalendarSnapshot) {
  const p=calendarPropertyId(input.propertyId),s=calendarSourceId(input.sourceId),now=calendarTime(input.nowISO);validateCalendarEvents(input.events);
  return this.db.transaction(()=>{
   const row=this.row(p,s);const count=this.count(p,s);
   if(!row||row.lease_id!==input.leaseId)return {applied:false,blockCount:count,conflictCount:row?.conflict_count??0};
   if(!row.lease_until||Date.parse(row.lease_until)<=now||Date.parse(row.last_attempt_at)>now){
    this.db.prepare("UPDATE calendar_sources SET status='failed',lease_id=NULL,lease_until=NULL WHERE property_id=? AND source_id=? AND lease_id=?").run(p,s,input.leaseId);
    return {applied:false,blockCount:count,conflictCount:row.conflict_count};
   }
   if(!input.events.length&&!input.allowEmpty){this.db.prepare("UPDATE calendar_sources SET status='failed',lease_id=NULL,lease_until=NULL WHERE property_id=? AND source_id=?").run(p,s);return {applied:false,blockCount:count,conflictCount:row.conflict_count};}
   const old=this.db.prepare('SELECT block_id FROM calendar_events WHERE property_id=? AND source_id=?').all(p,s) as {block_id:string}[];
   this.db.prepare('DELETE FROM calendar_events WHERE property_id=? AND source_id=?').run(p,s);
   for(const event of old)this.db.prepare('DELETE FROM blocks WHERE id=?').run(event.block_id);
   for(const e of input.events){
    const id='cal_'+createHash('sha256').update(JSON.stringify([p,s,e.uidHash])).digest('hex');
    this.db.prepare("INSERT INTO blocks(id,property_id,from_date,to_date,reason) VALUES(?,?,?,?,'External calendar block')").run(id,p,e.from,e.to);
    this.db.prepare('INSERT INTO calendar_events(property_id,source_id,uid_hash,block_id) VALUES(?,?,?,?)').run(p,s,e.uidHash,id);
    const overlaps=this.db.prepare("SELECT id FROM bookings WHERE property_id=? AND check_in<? AND check_out>? AND (status='confirmed' OR (status='pending_payment' AND (hold_expires_at IS NULL OR hold_expires_at>?)))").all(p,e.to,e.from,input.nowISO) as {id:string}[];
    for(const booking of overlaps){const hash=createHash('sha256').update(JSON.stringify([p,s,e.uidHash,booking.id])).digest('hex');this.db.prepare('INSERT INTO calendar_conflicts(incident_hash,property_id,source_id,detected_at) VALUES(?,?,?,?) ON CONFLICT(incident_hash) DO UPDATE SET resolved_at=NULL').run(hash,p,s,input.nowISO);}
   }
   const conflicts=(this.db.prepare('SELECT count(*) n FROM calendar_conflicts WHERE property_id=? AND source_id=? AND resolved_at IS NULL').get(p,s) as {n:number}).n;
   this.db.prepare('UPDATE calendar_sources SET status=?,last_success_at=?,lease_id=NULL,lease_until=NULL,conflict_count=? WHERE property_id=? AND source_id=?').run(conflicts?'conflict':'healthy',input.nowISO,conflicts,p,s);
   return {applied:true,blockCount:input.events.length,conflictCount:conflicts};
  }).immediate();
 }
 async failCalendarSync(propertyId:string,sourceId:string,leaseId:string,nowISO:string) {
  const p=calendarPropertyId(propertyId),s=calendarSourceId(sourceId);calendarTime(nowISO);
  this.db.prepare("UPDATE calendar_sources SET status='failed',lease_id=NULL,lease_until=NULL WHERE property_id=? AND source_id=? AND lease_id=? AND last_attempt_at<=?").run(p,s,leaseId,nowISO);
 }
 async getCalendarStatus(propertyId:string,sourceId:string):Promise<CalendarStatus|null> {
  const p=calendarPropertyId(propertyId),s=calendarSourceId(sourceId),r=this.row(p,s);return r?{propertyId:p,sourceId:s,status:r.status,lastSuccessAt:r.last_success_at,lastAttemptAt:r.last_attempt_at,blockCount:this.count(p,s),conflictCount:r.conflict_count,lastReviewedAt:r.last_reviewed_at,reviewCount:r.review_count}:null;
 }
 async listCalendarBlockIds(propertyId:string){return (this.db.prepare('SELECT block_id FROM calendar_events WHERE property_id=?').all(calendarPropertyId(propertyId)) as {block_id:string}[]).map(r=>r.block_id);}
 async resolveCalendarConflict(propertyId:string,sourceId:string,nowISO:string):Promise<boolean> {
  const p=calendarPropertyId(propertyId),s=calendarSourceId(sourceId),now=calendarTime(nowISO);
  return this.db.transaction(()=>{
   const row=this.row(p,s);if(!row||!row.conflict_count)return false;
   const overlap=this.db.prepare(`SELECT 1 FROM calendar_events e JOIN blocks b ON b.id=e.block_id JOIN bookings k ON k.property_id=b.property_id AND k.check_in<b.to_date AND k.check_out>b.from_date WHERE e.property_id=? AND e.source_id=? AND (k.status='confirmed' OR (k.status='pending_payment' AND (k.hold_expires_at IS NULL OR k.hold_expires_at>?))) LIMIT 1`).get(p,s,nowISO);
   if(overlap)return false;
   this.db.prepare('UPDATE calendar_conflicts SET resolved_at=? WHERE property_id=? AND source_id=? AND resolved_at IS NULL').run(nowISO,p,s);
   const healthy=row.status==='conflict'&&row.last_success_at&&now-Date.parse(row.last_success_at)<CALENDAR_MAX_AGE_MS&&Date.parse(row.last_success_at)<=now;
   this.db.prepare('UPDATE calendar_sources SET conflict_count=0,status=?,last_reviewed_at=?,review_count=review_count+1 WHERE property_id=? AND source_id=?').run(healthy?'healthy':'failed',nowISO,p,s);return true;
  }).immediate();
 }
 async listCalendarExportRanges(propertyId:string,nowISO:string):Promise<{id:string;from:string;to:string}[]> {
  const p=calendarPropertyId(propertyId);calendarTime(nowISO);
  return this.db.transaction(()=>{
   const bookings=this.db.prepare(`SELECT id,check_in AS "from",check_out AS "to" FROM bookings WHERE property_id=? AND payment_mode='live' AND ((status='confirmed' AND payment_status='paid') OR (status='pending_payment' AND hold_expires_at>?))`).all(p,nowISO) as {id:string;from:string;to:string}[];
   const manual=this.db.prepare(`SELECT b.id,b.from_date AS "from",b.to_date AS "to" FROM blocks b WHERE b.property_id=? AND NOT EXISTS (SELECT 1 FROM calendar_events e WHERE e.block_id=b.id)`).all(p) as {id:string;from:string;to:string}[];
   return [...bookings,...manual].sort((a,b)=>a.from.localeCompare(b.from)||a.id.localeCompare(b.id));
  })();
 }
 isImportedBlock(id:string):boolean{return !!this.db.prepare('SELECT 1 FROM calendar_events WHERE block_id=?').get(id);}
}
