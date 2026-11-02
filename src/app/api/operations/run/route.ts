import {createHash,randomUUID} from 'node:crypto';
import {getAdapter} from '@/lib/db';
import {OperationsLeaseStore} from '@/lib/operations-store';
import {operationsWorkerAuthorized,runOperations} from '@/lib/operations-worker';
import {json} from '../../_helpers';
export const runtime='nodejs';
/** Machine-only scope: no input actions, arbitrary job IDs, administration, calendar sync or resolution. */
export async function POST(req:Request){
 if(!operationsWorkerAuthorized(req))return json({error:'Not found.'},404);
 let store:OperationsLeaseStore|undefined;let acquired=false;
 const tokenHash=createHash('sha256').update(randomUUID()).digest('hex');
 try{
  store=new OperationsLeaseStore();const lease=store.acquire(tokenHash,Date.now());
  if(!lease.acquired){const response=json({error:'Worker is busy or rate limited.'},429);response.headers.set('Retry-After',String(lease.retryAfterSeconds));return response;}
  acquired=true;return json(await runOperations(getAdapter()));
 }catch{return json({error:'Operations worker unavailable.'},503);}
 finally{if(store){try{if(acquired)store.release(tokenHash);}catch{/* lease expires; never expose storage errors */}try{store.close();}catch{/* no raw storage errors */}}}
}
