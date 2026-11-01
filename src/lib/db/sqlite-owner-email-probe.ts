import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PROVIDER_MESSAGE_ID,validEmailProviderEvent,type EmailProviderEvent} from './email-evidence';
import type {ProbeConfig} from '../owner-email-probe';
type Row={id:string;fingerprint:string;issued_at:number;expires_at:number;attempts:number;lease_token:string|null;lease_until:number|null;provider_id:string|null;state:string;updated_at:number};
const ranks:Record<string,number>={accepted:0,delivered:1,bounced:2,complained:3};
export class OwnerEmailProbeStore {
 private db:InstanceType<typeof Database>;
 constructor(file=process.env.SQLITE_PATH??path.join(process.cwd(),'data','bookings.db')){
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||fs.realpathSync(file)!==path.resolve(file))throw new Error('Probe database unavailable');
  this.db=new Database(file,{fileMustExist:true});this.db.pragma('busy_timeout = 5000');
  this.db.exec(`CREATE TABLE IF NOT EXISTS owner_email_probes(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,issued_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,lease_token TEXT,lease_until INTEGER,provider_id TEXT UNIQUE,state TEXT NOT NULL DEFAULT 'pending',updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS owner_email_probe_events(event_id TEXT PRIMARY KEY,probe_id TEXT NOT NULL,provider_id TEXT NOT NULL,type TEXT NOT NULL,occurred_at TEXT NOT NULL,payload_hash TEXT NOT NULL);`);
 }
 close(){this.db.close();}
 private row(id:string){return this.db.prepare('SELECT * FROM owner_email_probes WHERE id=?').get(id) as Row|undefined;}
 claim(config:ProbeConfig,now:number):{kind:'claimed';lease:string;idempotencyKey:string}|{kind:'blocked'|'accepted'|'busy'}{
  return this.db.transaction(()=>{
   if(now<config.issuedAt||now>=config.expiresAt)return {kind:'blocked' as const};
   const prior=this.row(config.id);if(prior&&prior.fingerprint!==config.fingerprint)return {kind:'blocked' as const};
   if(prior?.provider_id)return {kind:'accepted' as const};
   if(prior?.lease_until&&prior.lease_until>now)return {kind:'busy' as const};
   if(this.db.prepare('SELECT id FROM owner_email_probes WHERE lease_until>? AND provider_id IS NULL LIMIT 1').get(now))return {kind:'busy' as const};
   const total=this.db.prepare('SELECT COALESCE(SUM(attempts),0) AS total FROM owner_email_probes WHERE expires_at>?').get(now-86400000) as {total:number};
   if(total.total>=3)return {kind:'blocked' as const};
   this.db.prepare('INSERT OR IGNORE INTO owner_email_probes(id,fingerprint,issued_at,expires_at,updated_at) VALUES(?,?,?,?,?)').run(config.id,config.fingerprint,config.issuedAt,config.expiresAt,now);
   const lease=randomUUID();this.db.prepare("UPDATE owner_email_probes SET attempts=attempts+1,lease_token=?,lease_until=?,state='pending',updated_at=? WHERE id=?").run(lease,now+30000,now,config.id);
   return {kind:'claimed' as const,lease,idempotencyKey:`owner-probe:${config.id}`};
  }).immediate();
 }
 accepted(config:ProbeConfig,lease:string,id:string,now:number){
  if(!PROVIDER_MESSAGE_ID.test(id))return false;
  return this.db.transaction(()=>{
   const row=this.row(config.id);if(!row||row.fingerprint!==config.fingerprint||row.lease_token!==lease||row.provider_id&&row.provider_id!==id)return false;
   this.db.prepare("UPDATE owner_email_probes SET provider_id=?,state='accepted',lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=?").run(id,now,config.id);return true;
  }).immediate();
 }
 uncertain(config:ProbeConfig,lease:string,now:number){this.db.prepare("UPDATE owner_email_probes SET state='uncertain',updated_at=? WHERE id=? AND fingerprint=? AND lease_token=? AND provider_id IS NULL").run(now,config.id,config.fingerprint,lease);}
 status(config:ProbeConfig){const row=this.row(config.id);if(!row)return {id:config.id,state:'not-started'};if(row.fingerprint!==config.fingerprint)return {id:config.id,state:'configuration-mismatch'};return {id:row.id,state:row.state};}
 event(config:ProbeConfig,event:EmailProviderEvent):'recorded'|'duplicate'|'unknown'|'conflict'{
  if(!validEmailProviderEvent(event))return 'conflict';
  return this.db.transaction(()=>{
   const row=this.row(config.id);if(!row||row.fingerprint!==config.fingerprint||row.provider_id!==event.providerMessageId)return 'unknown' as const;
   const prior=this.db.prepare('SELECT * FROM owner_email_probe_events WHERE event_id=?').get(event.eventId) as {probe_id:string;provider_id:string;type:string;occurred_at:string;payload_hash:string}|undefined;
   if(prior)return prior.probe_id===config.id&&prior.provider_id===event.providerMessageId&&prior.type===event.type&&prior.occurred_at===event.occurredAt&&prior.payload_hash===event.payloadHash?'duplicate' as const:'conflict' as const;
   this.db.prepare('INSERT INTO owner_email_probe_events VALUES(?,?,?,?,?,?)').run(event.eventId,config.id,event.providerMessageId,event.type,event.occurredAt,event.payloadHash);
   if(ranks[event.type]>(ranks[row.state]??-1))this.db.prepare('UPDATE owner_email_probes SET state=?,updated_at=? WHERE id=?').run(event.type,Date.parse(event.receivedAt),config.id);
   return 'recorded' as const;
  }).immediate();
 }
}
