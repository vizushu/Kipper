import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtempSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {OperationsLeaseStore} from '../src/lib/operations-store';
let dir:string;const hash='a'.repeat(64),other='b'.repeat(64);
beforeEach(()=>{vi.stubEnv('DATA_ADAPTER','sqlite');dir=mkdtempSync(join(tmpdir(),'operations-'));const db=new Database(join(dir,'bookings.db'));db.exec('CREATE TABLE bookings(id TEXT)');db.close();});
afterEach(()=>{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true});});
it('persists global lease across connections, retains rolling budget after CAS release',()=>{
 const file=join(dir,'bookings.db'),a=new OperationsLeaseStore(file),b=new OperationsLeaseStore(file);
 expect(a.acquire(hash,119999).acquired).toBe(true);expect(b.acquire(other,120000).acquired).toBe(false);b.release(other);expect(b.acquire(other,120001).acquired).toBe(false);a.release(hash);a.close();
 expect(b.acquire(other,239998).acquired).toBe(false);expect(b.acquire(other,239999).acquired).toBe(true);b.close();
});
it('recovers crashed lease only after expiry and stale release cannot revoke successor',()=>{
 const file=join(dir,'bookings.db'),a=new OperationsLeaseStore(file);a.acquire(hash,1000);a.close();const b=new OperationsLeaseStore(file);expect(b.acquire(other,300999).acquired).toBe(false);expect(b.acquire(other,301000).acquired).toBe(true);b.release(hash);expect(b.acquire(hash,301001).acquired).toBe(false);b.close();
});
it('never creates a mistaken DB or follows symlinks',()=>{
 const missing=join(dir,'absent.db');expect(()=>new OperationsLeaseStore(missing)).toThrow();expect(existsSync(missing)).toBe(false);symlinkSync(join(dir,'bookings.db'),join(dir,'linked.db'));expect(()=>new OperationsLeaseStore(join(dir,'linked.db'))).toThrow();
});
