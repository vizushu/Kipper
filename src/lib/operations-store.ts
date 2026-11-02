import Database from 'better-sqlite3';
import {lstatSync} from 'node:fs';
import path from 'node:path';
export const OPERATIONS_COOLDOWN_MS=120_000;
export const OPERATIONS_LEASE_MS=300_000;
/** SQLite-only, purpose-limited persistence. Never stores guest data or raw credentials. */
export class OperationsLeaseStore {
 private db:Database.Database;
 constructor(file=process.env.SQLITE_PATH??path.join(process.cwd(),'data','bookings.db')){
  if((process.env.DATA_ADAPTER??'sqlite').toLowerCase()!=='sqlite')throw new Error('Operations storage unavailable');
  file=path.resolve(file);
  // Never initialize an unintended empty DB; the application must already own this regular file.
  if(!lstatSync(file,{throwIfNoEntry:false})?.isFile())throw new Error('Operations database unavailable');
  for(let current=file;;current=path.dirname(current)){if(lstatSync(current).isSymbolicLink())throw new Error('Unsafe operations database path');if(path.dirname(current)===current)break;}
  this.db=new Database(file,{timeout:2000,fileMustExist:true});
  try{
  if(!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'").get())throw new Error('Operations database not initialized');
  this.db.exec('CREATE TABLE IF NOT EXISTS operations_worker_lease (id INTEGER PRIMARY KEY CHECK(id=1), token_hash TEXT NOT NULL, lease_until_ms INTEGER NOT NULL, last_started_ms INTEGER NOT NULL)');
  }catch(error){this.db.close();throw error;}
 }
 acquire(tokenHash:string,now:number):{acquired:boolean;retryAfterSeconds:number}{
  if(!/^[a-f0-9]{64}$/.test(tokenHash)||!Number.isSafeInteger(now)||now<0)throw new Error('Invalid operations lease');
  return this.db.transaction(()=>{
   const row=this.db.prepare('SELECT lease_until_ms,last_started_ms FROM operations_worker_lease WHERE id=1').get() as {lease_until_ms:number;last_started_ms:number}|undefined;
   const until=row?Math.max(row.lease_until_ms,row.last_started_ms+OPERATIONS_COOLDOWN_MS):0;
   if(until>now)return {acquired:false,retryAfterSeconds:Math.ceil((until-now)/1000)};
   this.db.prepare('INSERT INTO operations_worker_lease VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,lease_until_ms=excluded.lease_until_ms,last_started_ms=excluded.last_started_ms').run(tokenHash,now+OPERATIONS_LEASE_MS,now);
   return {acquired:true,retryAfterSeconds:0};
  }).immediate();
 }
 release(tokenHash:string):void{this.db.prepare('UPDATE operations_worker_lease SET lease_until_ms=0 WHERE id=1 AND token_hash=?').run(tokenHash);}
 close():void{this.db.close();}
}
