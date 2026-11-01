/** Exact-job rehearsal using the real durable operator queue; never a fabricated incident. */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {SqliteOperatorAlerts,enqueueOperatorAlert} from './db/sqlite-operator-alerts';
import {deliverOperatorAlert} from './operator-alerts';
import {operatorRehearsalConfig,type OperatorRehearsalConfig} from './operator-rehearsal-config';
import type {OperatorAlert,OperatorAlertEnvelope} from './db/operator-alerts';
type DB=InstanceType<typeof Database>;
function openStore(){const file=process.env.SQLITE_PATH??path.join(process.cwd(),'data','bookings.db');const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||fs.realpathSync(file)!==path.resolve(file))throw new Error('Rehearsal storage unavailable');const db=new Database(file,{fileMustExist:true});try{db.pragma('busy_timeout = 5000');if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'").get())throw new Error('Rehearsal database not initialized');const queue=new SqliteOperatorAlerts(db);db.exec('CREATE TABLE IF NOT EXISTS operator_rehearsal_authorizations(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,alert_id TEXT NOT NULL UNIQUE,issued_at INTEGER NOT NULL,expires_at INTEGER NOT NULL)');return {db,queue};}catch(error){db.close();throw error;}}
function current(config:OperatorRehearsalConfig,now:number){return operatorRehearsalConfig(now)?.fingerprint===config.fingerprint;}
function ensureJob(db:DB,config:OperatorRehearsalConfig,now:string):boolean {return db.transaction(()=>{
 const prior=db.prepare('SELECT fingerprint FROM operator_rehearsal_authorizations WHERE id=?').get(config.id) as {fingerprint:string}|undefined;if(prior)return prior.fingerprint===config.fingerprint;
 // Conservative one authorization per rolling day; a changed ID must never evade an uncertain send.
 if(db.prepare('SELECT id FROM operator_rehearsal_authorizations WHERE expires_at>? LIMIT 1').get(Date.parse(now)-86400000))return false;
 db.prepare('INSERT INTO operator_rehearsal_authorizations VALUES(?,?,?,?,?)').run(config.id,config.fingerprint,config.alertId,config.issuedAt,config.expiresAt);
 enqueueOperatorAlert(db,{kind:'operator_rehearsal',incidentId:config.id,episode:1,paymentMode:'live'},now);
 db.prepare("UPDATE operator_alerts SET id=?,envelope_json=? WHERE kind='operator_rehearsal' AND incident_id=? AND episode=1").run(config.alertId,JSON.stringify(config.envelope),config.id);return true;
 }).immediate();}
function status(db:DB,config:OperatorRehearsalConfig){const auth=db.prepare('SELECT fingerprint FROM operator_rehearsal_authorizations WHERE id=?').get(config.id) as {fingerprint:string}|undefined;if(auth&&auth.fingerprint!==config.fingerprint)return {id:config.id,state:'configuration-mismatch'};const row=db.prepare("SELECT status FROM operator_alerts WHERE id=? AND kind='operator_rehearsal'").get(config.alertId) as {status:string}|undefined;return {id:config.id,state:row?.status==='sent'?'provider-accepted':row?.status??'not-started'};}
export async function operatorRehearsalStatus(config:OperatorRehearsalConfig){if(operatorRehearsalConfig(Date.now(),true)?.fingerprint!==config.fingerprint)return {id:config.id,state:'disabled'};const {db}=openStore();try{return status(db,config);}finally{db.close();}}
export async function runOperatorRehearsal(config:OperatorRehearsalConfig,options:{now?:()=>number;deliver?:(job:OperatorAlert,envelope:OperatorAlertEnvelope)=>Promise<'sent'|'simulated'>}={}){
 const now=options.now??Date.now;if(!current(config,now()))return {id:config.id,state:'disabled'};
 const {db,queue}=openStore();try{
  if(!ensureJob(db,config,new Date(now()).toISOString()))return {id:config.id,state:'authorization-conflict'};
  const [job]=await queue.claimOperatorAlerts(new Date(now()).toISOString(),1,config.alertId);if(!job)return status(db,config);
  try{
   if(!current(config,now()))throw new Error('Rehearsal authorization expired');
   const envelope=await queue.prepareOperatorAlertMessage(job.id,job.leaseToken!,config.envelope,new Date(now()).toISOString());if(!envelope)throw new Error('Rehearsal lease unavailable');
   const result=await(options.deliver?options.deliver(job,envelope):deliverOperatorAlert(job,envelope,config.fingerprint));
   if(!await queue.finishOperatorAlert(job.id,job.leaseToken!,result,new Date(now()).toISOString()))return {id:config.id,state:'outcome-unverified'};
  }catch{await queue.finishOperatorAlert(job.id,job.leaseToken!,'failed',new Date(now()).toISOString());return {id:config.id,state:'outcome-unverified'};}
  // Never certify dispatcher heartbeat or flip delivery QA. Only provider acceptance is known here.
  return status(db,config);
 }finally{db.close();}
}
