import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import Database from 'better-sqlite3';
import {SqliteAdapter} from '../src/lib/db/sqlite';
import type {NewBookingInput} from '../src/lib/db/adapter';
import {enqueueOperatorAlert,SqliteOperatorAlerts} from '../src/lib/db/sqlite-operator-alerts';
import type {OperatorAlertEnvelope} from '../src/lib/db/operator-alerts';
let dir:string,a:SqliteAdapter,b:SqliteAdapter;
const now=()=>new Date().toISOString();const p='casa-pacifica',s='airbnb-primary';
const input=(key='one'):NewBookingInput=>({propertyId:p,checkIn:'2027-02-20',checkOut:'2027-02-22',nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'PRIVATE SYNTHETIC NAME',email:'private@example.test'},lineItems:[],totalCents:50000,currency:'USD',idempotencyKey:key,paymentMode:'live'});
const evidence={paymentIntentId:'pi_SYNTHETIC_PRIVATE',providerEventId:'evt_SYNTHETIC_PRIVATE',paymentMode:'live' as const,amountCents:50000,amountReceivedCents:50000,currency:'USD',reason:'unmatched_payment' as const};
const envelope:OperatorAlertEnvelope={from:'Test <sender@example.test>',to:'operator@example.test',subject:'Action needed',text:'Review an opaque incident in the authenticated console.'};
async function sync(from='2027-02-20',to='2027-02-22'){const lease=await a.beginCalendarSync(p,s,now());return a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:lease!.leaseId,events:[{uidHash:'a'.repeat(64),from,to}],nowISO:now()});}
beforeEach(()=>{vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com/calendar/ical/syntheticA.ics?s=synthetic');vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('INVENTORY_POLICY','exclusive_direct');vi.stubEnv('BOOKING_PAYMENT_MODE','test');dir=fs.mkdtempSync(path.join(os.tmpdir(),'operator-alerts-'));a=new SqliteAdapter(path.join(dir,'db'));b=new SqliteAdapter(path.join(dir,'db'));});
afterEach(()=>{a.close();b.close();fs.rmSync(dir,{recursive:true,force:true});vi.useRealTimers();vi.unstubAllEnvs();});
it('atomically enqueues a deduplicated unmatched payment alert without booking FK or provider/guest details',async()=>{
 const first=await a.recordPaymentException(evidence);await b.recordPaymentException(evidence);await a.recordPaymentException({...evidence,providerEventId:'evt_SECOND'});
 const alerts=await a.listOperatorAlerts();expect(alerts).toHaveLength(1);expect(alerts[0]).toMatchObject({kind:'payment_exception',incidentId:first.exception.id,episode:1,paymentMode:'live'});
 expect(JSON.stringify(alerts)).not.toMatch(/pi_SYNTHETIC|evt_|PRIVATE|example.test|amountCents/);
});
it('rolls back incident creation when durable alert enqueue fails',async()=>{
 const raw=new Database(path.join(dir,'db'));raw.exec("CREATE TRIGGER reject_operator_alert BEFORE INSERT ON operator_alerts BEGIN SELECT RAISE(ABORT,'synthetic enqueue failure'); END;");
 await expect(a.recordPaymentException(evidence)).rejects.toThrow();expect(await a.listPaymentExceptions()).toHaveLength(0);raw.close();
});
it('calendar duplicate imports alert once and reopening a resolved incident creates a new episode/key',async()=>{
 const booking=await a.createBookingIfAvailable(input());await a.attachPaymentIntent(booking.id,'pi_calendar');await a.confirmBookingPayment(booking.id,'pi_calendar',now());
 await sync();await sync();let jobs=(await a.listOperatorAlerts()).filter(j=>j.kind==='calendar_conflict');expect(jobs).toHaveLength(1);
 await sync('2027-02-10','2027-02-12');expect(await a.resolveCalendarConflict(p,s,now())).toBe(true);expect((await a.listOperatorAlerts())[0].status).toBe('suppressed');
 await sync();jobs=(await a.listOperatorAlerts()).filter(j=>j.kind==='calendar_conflict');expect(jobs).toHaveLength(2);expect(jobs.map(j=>j.episode).sort((a,b)=>a-b)).toEqual([1,2]);expect(new Set(jobs.map(j=>j.dedupeKey)).size).toBe(2);expect((await a.getBooking(booking.id))?.status).toBe('confirmed');
});
it('source failures enqueue generic health alerts, healthy recovery closes them and a recurrence reopens',async()=>{
 await sync('2027-02-10','2027-02-12');let lease=await a.beginCalendarSync(p,s,now());await a.failCalendarSync(p,s,lease!.leaseId,now());await a.recordCalendarHealthAlert(p,false,now());expect((await a.listOperatorAlerts()).filter(j=>j.kind==='calendar_health')).toHaveLength(1);
 await a.recordCalendarHealthAlert(p,true,now());expect((await a.listOperatorAlerts())[0].status).toBe('pending'); // stale optimistic observation cannot clear failed source
 await sync('2027-02-10','2027-02-12');await a.recordCalendarHealthAlert(p,true,now());expect((await a.listOperatorAlerts())[0].status).toBe('suppressed');
 lease=await a.beginCalendarSync(p,s,now());await a.failCalendarSync(p,s,lease!.leaseId,now());expect((await a.listOperatorAlerts()).map(j=>j.episode).sort((a,b)=>a-b)).toEqual([1,2]);
});
it('leases are exclusive across connections, stable envelope/key survive retry and stale completion cannot win',async()=>{
 await a.recordPaymentException(evidence);const [job]=await a.claimOperatorAlerts(now(),1);expect(await b.claimOperatorAlerts(now(),1)).toEqual([]);
 expect(await a.prepareOperatorAlertMessage(job.id,job.leaseToken!,envelope,now())).toEqual(envelope);
 expect(await a.finishOperatorAlert(job.id,job.leaseToken!,'failed',now())).toBe(true);vi.advanceTimersByTime(60_000);const [retry]=await b.claimOperatorAlerts(now(),1);
 expect(retry.dedupeKey).toBe(job.dedupeKey);expect(retry.attempts).toBe(2);expect(await b.prepareOperatorAlertMessage(retry.id,retry.leaseToken!,{...envelope,to:'different@example.test'},now())).toEqual(envelope);
 expect(await a.finishOperatorAlert(job.id,job.leaseToken!,'sent',now())).toBe(false);expect(await b.finishOperatorAlert(retry.id,retry.leaseToken!,'sent',now())).toBe(true);
});
it('caps retry attempts and never resets the provider dedupe window',async()=>{
 await a.recordPaymentException(evidence);let id='';for(let i=0;i<5;i++){const [job]=await a.claimOperatorAlerts(now(),1);expect(job).toBeDefined();id=job.id;await a.finishOperatorAlert(id,job.leaseToken!,'failed',now());vi.advanceTimersByTime([60,300,900,3600,3600][i]*1000);}
 expect((await a.listOperatorAlerts())[0].status).toBe('dead');expect(await a.claimOperatorAlerts(now(),1,id)).toEqual([]);
});
it('a crashed lease expires safely, and attempts outside the 23-hour window are dead',async()=>{
 await a.recordPaymentException(evidence);const [old]=await a.claimOperatorAlerts(now(),1);vi.advanceTimersByTime(5*60_000);const [newer]=await b.claimOperatorAlerts(now(),1);expect(newer.attempts).toBe(2);expect(await a.finishOperatorAlert(old.id,old.leaseToken!,'sent',now())).toBe(false);
 vi.advanceTimersByTime(23*3600_000);expect(await a.claimOperatorAlerts(now(),1)).toEqual([]);expect((await a.listOperatorAlerts())[0].status).toBe('dead');
});
it('preview cannot claim, prepare, finish, or mark a heartbeat even with existing jobs',async()=>{
 await a.recordPaymentException(evidence);const [job]=await a.claimOperatorAlerts(now(),1);vi.stubEnv('SITE_PREVIEW_MODE','true');expect(await a.claimOperatorAlerts(now(),1)).toEqual([]);expect(await a.prepareOperatorAlertMessage(job.id,job.leaseToken!,envelope,now())).toBeNull();expect(await a.finishOperatorAlert(job.id,job.leaseToken!,'sent',now())).toBe(false);await a.completeOperatorAlertRun(now());expect((await a.getOperatorAlertReadiness(now())).lastSuccessAt).toBeNull();
});
it('review suppresses a pending or leased alert without asserting refunds',async()=>{
 const {exception}=await a.recordPaymentException(evidence);const [job]=await a.claimOperatorAlerts(now(),1);await a.reviewPaymentException(exception.id,'Synthetic operator reviewed evidence only.','review-key-123');expect(await a.prepareOperatorAlertMessage(job.id,job.leaseToken!,envelope,now())).toBeNull();expect((await a.listOperatorAlerts())[0].status).toBe('suppressed');expect((await a.listPaymentExceptions())[0].status).toBe('reviewed');
});
it('payment setup failures persist privately with opaque deduplicated alerts, never represent a paid charge',async()=>{
 const booking=await a.createBookingIfAvailable(input());const first=await a.recordPaymentSetupFailure(booking.id,'pi_setup_private',now());expect((await a.recordPaymentSetupFailure(booking.id,'pi_setup_private',now())).created).toBe(false);expect(await a.listPaymentSetupFailures()).toEqual([{id:first.id,bookingId:booking.id,paymentIntentId:'pi_setup_private',createdAt:now(),status:'open'}]);
 const jobs=await a.listOperatorAlerts();expect(jobs).toHaveLength(1);expect(jobs[0].kind).toBe('payment_setup');expect(JSON.stringify(jobs)).not.toContain('pi_setup_private');expect(await a.listPaymentExceptions()).toHaveLength(0);expect((await a.getBooking(booking.id))?.paymentStatus).toBe('unpaid');
});
it('dispatcher heartbeat rejects missing/future/stale/dead/overdue states and guards shared-live holds',async()=>{
 await sync('2027-02-10','2027-02-12');vi.stubEnv('INVENTORY_POLICY','shared_ical');vi.stubEnv('BOOKING_PAYMENT_MODE','live');await expect(a.createBookingIfAvailable(input())).rejects.toThrow('alert coverage');await a.completeOperatorAlertRun(now());expect((await a.getOperatorAlertReadiness(now())).ready).toBe(true);expect((await a.createBookingIfAvailable(input())).status).toBe('pending_payment');
 expect((await a.getOperatorAlertReadiness('2026-10-31T11:59:59.000Z')).ready).toBe(false);vi.advanceTimersByTime(15*60_000);expect((await a.getOperatorAlertReadiness(now())).ready).toBe(false);
 await a.recordPaymentException(evidence);await a.completeOperatorAlertRun(now());vi.advanceTimersByTime(15*60_000);await a.completeOperatorAlertRun(now());expect(await a.getOperatorAlertReadiness(now())).toMatchObject({ready:false,overdueCount:1});
});
it('enqueue accepts only opaque identities and rolls back malformed caller data',()=>{
 const db=new Database(':memory:');const store=new SqliteOperatorAlerts(db);expect(store).toBeDefined();expect(()=>enqueueOperatorAlert(db,{kind:'payment_exception',incidentId:'https://private.example/feed?secret',episode:1,paymentMode:'live'},now())).toThrow('identity');db.close();
});
it('historical test alerts are not claimed and cannot poison live readiness',async()=>{
 await a.recordPaymentException({...evidence,paymentMode:'test'});await a.completeOperatorAlertRun(now());vi.advanceTimersByTime(20*60_000);await a.completeOperatorAlertRun(now());expect(await a.claimOperatorAlerts(now(),10)).toEqual([]);expect(await a.getOperatorAlertReadiness(now())).toMatchObject({ready:true,deadCount:0,overdueCount:0});
 const raw=new Database(path.join(dir,'db'));raw.prepare("UPDATE operator_alerts SET status='dead'").run();raw.close();expect((await a.getOperatorAlertReadiness(now())).ready).toBe(true);
});
it('setup review is audited and idempotent, resolves dead alerts without resurrecting retries or claiming refund',async()=>{
 const booking=await a.createBookingIfAvailable(input());const {id}=await a.recordPaymentSetupFailure(booking.id,'pi_setup_review',now());
 const raw=new Database(path.join(dir,'db'));raw.prepare("UPDATE operator_alerts SET status='dead',attempts=5").run();raw.close();await a.completeOperatorAlertRun(now());expect((await a.getOperatorAlertReadiness(now())).ready).toBe(false);
 const reviewed=await a.reviewPaymentSetupFailure(id,'Reviewed setup evidence; no provider action.','setup-review-key',now());expect(reviewed).toMatchObject({status:'reviewed',reviewKey:'setup-review-key',reviewedAt:now()});expect(await a.reviewPaymentSetupFailure(id,'Reviewed setup evidence; no provider action.','setup-review-key',now())).toEqual(reviewed);
 await expect(a.reviewPaymentSetupFailure(id,'Different review note.','different-key',now())).rejects.toThrow('already');expect((await a.listOperatorAlerts())[0]).toMatchObject({status:'suppressed',attempts:5});expect((await a.getOperatorAlertReadiness(now())).ready).toBe(true);expect(await a.claimOperatorAlerts(now(),10)).toEqual([]);
 await a.recordPaymentSetupFailure(booking.id,'pi_setup_review',now());expect((await a.listOperatorAlerts())[0].status).toBe('suppressed');expect((await a.getBooking(booking.id))?.paymentStatus).toBe('unpaid');
});
it('calendar health remains an operational live alert after the payment gate closes',async()=>{
 vi.stubEnv('BOOKING_PAYMENT_MODE','closed');await a.recordCalendarHealthAlert(p,false,now());expect((await a.claimOperatorAlerts(now(),1))[0]).toMatchObject({kind:'calendar_health',paymentMode:'live'});
});
it('calendar reconciliation and incident state roll back if atomic alert enqueue fails',async()=>{
 const booking=await a.createBookingIfAvailable(input());const raw=new Database(path.join(dir,'db'));raw.exec("CREATE TRIGGER reject_calendar_alert BEFORE INSERT ON operator_alerts WHEN NEW.kind='calendar_conflict' BEGIN SELECT RAISE(ABORT,'synthetic calendar alert failure'); END;");
 const lease=await a.beginCalendarSync(p,s,now());await expect(a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:lease!.leaseId,events:[{uidHash:'b'.repeat(64),from:'2027-02-20',to:'2027-02-22'}],nowISO:now()})).rejects.toThrow();expect((raw.prepare('SELECT count(*) n FROM calendar_conflicts').get() as {n:number}).n).toBe(0);expect(await a.listCalendarBlockIds(p)).toEqual([]);expect((await a.getBooking(booking.id))?.status).toBe('pending_payment');raw.close();
});
it('review preserves sent-alert evidence and attempt history rather than resending',async()=>{
 const booking=await a.createBookingIfAvailable(input());const {id}=await a.recordPaymentSetupFailure(booking.id,'pi_setup_sent',now());const [job]=await a.claimOperatorAlerts(now(),1);await a.finishOperatorAlert(job.id,job.leaseToken!,'sent',now());await a.reviewPaymentSetupFailure(id,'Inspected provider setup record.','sent-review-key',now());expect((await a.listOperatorAlerts())[0]).toMatchObject({status:'sent',attempts:1});expect(await a.claimOperatorAlerts(now(),1)).toEqual([]);
});
