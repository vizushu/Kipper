import {createHash,timingSafeEqual} from 'node:crypto';
/** Independent, explicit calendar-only approval. Never enables guest booking or payment. */
export function calendarOperationsApproved(){return process.env.CALENDAR_OPERATIONS_APPROVED==='true';}
export function calendarSyncEnabled(){return calendarOperationsApproved()&&process.env.CALENDAR_SYNC_ENABLED==='true';}
export function calendarWorkerAuthorized(request:Request):boolean {
 const secret=process.env.CALENDAR_WORKER_SECRET;
 if(!calendarSyncEnabled()||!secret||!/^[-_A-Za-z0-9]{43,128}$/.test(secret))return false;
 const header=request.headers.get('authorization')??'';
 if(!header.startsWith('Bearer ')||header.length>256)return false;
 const candidate=header.slice(7);return timingSafeEqual(createHash('sha256').update(candidate).digest(),createHash('sha256').update(secret).digest());
}
