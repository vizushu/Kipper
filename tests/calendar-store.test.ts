import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SqliteAdapter} from '../src/lib/db/sqlite';
import {SupabaseAdapter} from '../src/lib/db/supabase';
import {configuredCalendarFingerprint,calendarStatusReady,calendarPropertyId,type CalendarEvent} from '../src/lib/db/calendar-store';
import type {NewBookingInput} from '../src/lib/db/adapter';
let dir:string,a:SqliteAdapter,b:SqliteAdapter;
const p='casa-pacifica',s='airbnb-primary';const now=()=>new Date().toISOString();
const event=(from='2027-02-10',to='2027-02-12',uid='a'):CalendarEvent=>({uidHash:uid.repeat(64),from,to});
const booking=(key='test',from='2027-02-20',to='2027-02-22'):NewBookingInput=>({propertyId:p,checkIn:from,checkOut:to,nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'Synthetic',email:'fixture@example.test'},lineItems:[],totalCents:10000,currency:'USD',idempotencyKey:key});
async function sync(events:CalendarEvent[],allowEmpty=false,source=s){const lease=await a.beginCalendarSync(p,source,now());expect(lease).not.toBeNull();return a.completeCalendarSync({propertyId:p,sourceId:source,leaseId:lease!.leaseId,events,nowISO:now(),allowEmpty});}
beforeEach(()=>{vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com/calendar/ical/syntheticA.ics?s=synthetic');vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));vi.stubEnv('CALENDAR_SYNC_REQUIRED','false');dir=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-store-'));a=new SqliteAdapter(path.join(dir,'db'));b=new SqliteAdapter(path.join(dir,'db'));});
afterEach(()=>{a.close();b.close();fs.rmSync(dir,{recursive:true,force:true});vi.useRealTimers();vi.unstubAllEnvs();});
it('canonically maps both versions and aliases to one physical inventory',async()=>{
 expect(calendarPropertyId('casa-pacifica-3br')).toBe(p);expect(calendarPropertyId('casa-pacifica-5br')).toBe(p);expect(calendarPropertyId('casa-pacifica-san-diego')).toBe(p);
 await sync([event()]);await expect(a.createBookingIfAvailable({...booking('cross','2027-02-10','2027-02-12'),propertyId:'casa-pacifica-5br'})).rejects.toThrow('unavailable');
 expect(await a.getCalendarStatus('casa-pacifica-3br',s)).toEqual(await a.getCalendarStatus(p,s));
});
it('repeats and moves stable UID blocks while preserving manual and other source blocks',async()=>{
 const manual=await a.createBlock({propertyId:p,from:'2027-01-01',to:'2027-01-02',reason:'Synthetic private note'});
 await sync([event()]);const first=await a.listCalendarBlockIds(p);await sync([event()]);expect(await a.listCalendarBlockIds(p)).toEqual(first);
 await sync([event('2027-03-10','2027-03-12','b')],false,'other-source');await sync([event('2027-02-12','2027-02-14')]);
 const blocks=await a.listBlocks(p);expect(blocks).toHaveLength(3);expect(blocks.find(x=>x.id===first[0])).toMatchObject({from:'2027-02-12',to:'2027-02-14'});expect(blocks.find(x=>x.id===manual.id)?.reason).toBe('Synthetic private note');
 expect(await a.deleteBlock(first[0])).toBe(false);expect(await a.deleteBlock(manual.id)).toBe(true);
});
it('requires explicit approval for initial and subsequent empty snapshots',async()=>{
 expect(await sync([])).toMatchObject({applied:false,blockCount:0});expect((await a.getCalendarStatus(p,s))?.status).toBe('failed');
 await sync([event()]);expect(await sync([])).toMatchObject({applied:false,blockCount:1});expect(await a.listBlocks(p)).toHaveLength(1);
 expect(await sync([],true)).toMatchObject({applied:true,blockCount:0});expect(await a.listBlocks(p)).toHaveLength(0);
});
it('removes only absent source events after a valid nonempty snapshot',async()=>{
 await sync([event(),event('2027-02-15','2027-02-17','b')]);await sync([event()]);expect(await a.listBlocks(p)).toHaveLength(1);
});
it('failed refresh retains blocks and makes even otherwise free dates unavailable',async()=>{
 await sync([event()]);const lease=await a.beginCalendarSync(p,s,now());await a.failCalendarSync(p,s,lease!.leaseId,now());expect(await a.listBlocks(p)).toHaveLength(1);
 await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');expect(calendarStatusReady(await a.getCalendarStatus(p,s),now())).toBe(false);
 await sync([event()]);expect((await a.createBookingIfAvailable(booking())).status).toBe('pending_payment');
});
it('leases prevent parallel fetches and expired or older results cannot replace a newer snapshot',async()=>{
 const old=await a.beginCalendarSync(p,s,now());expect(await b.beginCalendarSync(p,s,now())).toBeNull();vi.advanceTimersByTime(120_000);
 const newer=await b.beginCalendarSync(p,s,now());expect(newer).not.toBeNull();await b.completeCalendarSync({propertyId:p,sourceId:s,leaseId:newer!.leaseId,events:[event()],nowISO:now()});
 expect(await a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:old!.leaseId,events:[event('2027-05-01','2027-05-02')],nowISO:now()})).toMatchObject({applied:false});await a.failCalendarSync(p,s,old!.leaseId,now());expect((await a.getCalendarStatus(p,s))?.status).toBe('healthy');
});
it('rejects malformed or duplicate event snapshots atomically',async()=>{
 await sync([event()]);const lease=await a.beginCalendarSync(p,s,now());await expect(a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:lease!.leaseId,events:[event(),event()],nowISO:now()})).rejects.toThrow('review');expect(await a.listBlocks(p)).toHaveLength(1);
});
it('freshness is exclusive at 15 minutes, rejects future clock and requires a source when configured',async()=>{
 vi.stubEnv('CALENDAR_SYNC_REQUIRED','true');await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');
 await sync([event()]);const status=await a.getCalendarStatus(p,s);expect(calendarStatusReady(status,now(),true)).toBe(true);
 expect(calendarStatusReady(status,'2026-10-31T11:59:59.000Z')).toBe(false);vi.advanceTimersByTime(900_000);expect(calendarStatusReady(status,now())).toBe(false);await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');
});
it('import during a hold records durable conflict and cannot confirm or auto-resolve',async()=>{
 const held=await a.createBookingIfAvailable(booking());await a.attachPaymentIntent(held.id,'pi_synthetic');
 expect(await sync([event(held.checkIn,held.checkOut)])).toMatchObject({conflictCount:1});expect(await a.confirmBookingPayment(held.id,'pi_synthetic',now())).toBeNull();
 expect(await a.resolveCalendarConflict(p,s,now())).toBe(false);await sync([event('2027-02-10','2027-02-12')]);expect((await a.getCalendarStatus(p,s))?.conflictCount).toBe(1);
 expect(await a.resolveCalendarConflict(p,s,now())).toBe(true);expect(await a.getCalendarStatus(p,s)).toMatchObject({conflictCount:0,status:'healthy',reviewCount:1,lastReviewedAt:now()});
 expect((await a.getBooking(held.id))?.status).toBe('pending_payment');
});
it('overlap with paid booking is retained, deduped and never auto-cancels the booking',async()=>{
 const held=await a.createBookingIfAvailable({...booking(),paymentMode:'live'});await a.attachPaymentIntent(held.id,'pi_live_fixture');await a.confirmBookingPayment(held.id,'pi_live_fixture',now());
 await sync([event(held.checkIn,held.checkOut)]);await sync([event(held.checkIn,held.checkOut)]);expect((await a.getCalendarStatus(p,s))?.conflictCount).toBe(1);expect(await a.resolveCalendarConflict(p,s,now())).toBe(false);expect((await a.getBooking(held.id))?.status).toBe('confirmed');
});
it('serializes imported overlap against new holds on separate connections, checkout remains exclusive across DST',async()=>{
 await sync([event('2027-03-13','2027-03-15')]);await expect(b.createBookingIfAvailable(booking('overlap','2027-03-14','2027-03-16'))).rejects.toThrow('unavailable');expect((await b.createBookingIfAvailable(booking('boundary','2027-03-15','2027-03-17'))).checkIn).toBe('2027-03-15');
});
it('exports only own live occupancy and manual blocks, without guests/import loops or test fixtures',async()=>{
 const held=await a.createBookingIfAvailable({...booking('paid'),paymentMode:'live'});await a.attachPaymentIntent(held.id,'pi_paid');await a.confirmBookingPayment(held.id,'pi_paid',now());
 const active=await a.createBookingIfAvailable({...booking('active','2027-02-23','2027-02-25'),paymentMode:'live'});await a.createBookingIfAvailable(booking('test','2027-02-26','2027-02-28'));
 const manual=await a.createBlock({propertyId:p,from:'2027-01-01',to:'2027-01-02',reason:'Private never export'});await sync([event()]);
 const ranges=await a.listCalendarExportRanges(p,now());expect(ranges.map(r=>r.id).sort()).toEqual([held.id,active.id,manual.id].sort());expect(JSON.stringify(ranges)).not.toMatch(/Private|Synthetic|example|uidHash|reason/);
 vi.advanceTimersByTime(900_000);expect((await a.listCalendarExportRanges(p,now())).map(r=>r.id)).not.toContain(active.id);
});
it('keeps manual block reasons out of booking errors and unsupported adapter fail-closed',async()=>{
 await a.createBlock({propertyId:p,from:'2027-02-20',to:'2027-02-22',reason:'Private note secret'});await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('Those dates are unavailable.');
 vi.stubEnv('SUPABASE_URL','https://synthetic.invalid');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-no-network');const supa=new SupabaseAdapter();await expect(supa.beginCalendarSync(p,s)).rejects.toThrow('not implemented');vi.stubEnv('CALENDAR_SYNC_REQUIRED','true');await expect(supa.createBookingIfAvailable(booking())).rejects.toThrow('supported adapter');expect(await supa.confirmBookingPayment('id','pi',now())).toBeNull();
});

it('an expired matching sync lease immediately marks failed while retaining the last good blocks',async()=>{
 await sync([event()]);const lease=await a.beginCalendarSync(p,s,now());vi.advanceTimersByTime(120_000);
 expect(await a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:lease!.leaseId,events:[event('2027-05-01','2027-05-02')],nowISO:now()})).toMatchObject({applied:false,blockCount:1});
 expect((await a.getCalendarStatus(p,s))?.status).toBe('failed');expect((await a.listBlocks(p))[0].from).toBe('2027-02-10');await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');
});

it('leaves ordinary unconfigured Supabase availability readable but rejects enabled shared calendar',async()=>{
 vi.stubEnv('SUPABASE_URL','https://synthetic.invalid');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-no-network');vi.stubEnv('CALENDAR_SYNC_ENABLED','false');vi.stubEnv('CALENDAR_SYNC_REQUIRED','false');const supa=new SupabaseAdapter();expect(await supa.getCalendarStatus(p,s)).toBeNull();vi.stubEnv('CALENDAR_SYNC_ENABLED','true');await expect(supa.getCalendarStatus(p,s)).rejects.toThrow('not implemented');await expect(supa.createBookingIfAvailable(booking())).rejects.toThrow('supported adapter');
});
it('rechecks source state before exposing provider setup and at intent attachment',async()=>{
 await sync([event()]);const held=await a.createBookingIfAvailable(booking('setup-race'));
 expect((await a.getPaymentEligibleBooking(held.id))?.id).toBe(held.id);
 const lease=await a.beginCalendarSync(p,s,now());await a.failCalendarSync(p,s,lease!.leaseId,now());
 expect(await a.getPaymentEligibleBooking(held.id)).toBeNull();expect(await a.attachPaymentIntent(held.id,'pi_not_exposed')).toBeNull();expect((await a.getBooking(held.id))?.stripePaymentIntentId).toBeUndefined();
});
it('a block inserted after hold prevents attaching a new payment intent',async()=>{
 const held=await a.createBookingIfAvailable(booking('manual-block-race'));await a.createBlock({propertyId:p,from:held.checkIn,to:held.checkOut,reason:'Synthetic private operator detail'});
 expect(await a.getPaymentEligibleBooking(held.id)).toBeNull();expect(await a.attachPaymentIntent(held.id,'pi_not_exposed')).toBeNull();
});
it('shared-live local transaction requires actual recent dispatcher heartbeat',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('INVENTORY_POLICY','shared_ical');vi.stubEnv('BOOKING_PAYMENT_MODE','live');await sync([event()]);
 await expect(a.createBookingIfAvailable(booking('dispatcher-missing'))).rejects.toThrow();
 await a.completeOperatorAlertRun(now());const held=await a.createBookingIfAvailable(booking('dispatcher-ok'));expect(held.status).toBe('pending_payment');
 vi.advanceTimersByTime(900000);expect(await a.getPaymentEligibleBooking(held.id)).toBeNull();
});
it('binds fresh snapshots to the configured feed, preserving blocks until the replacement feed succeeds',async()=>{
 await sync([event()]);expect(calendarStatusReady(await a.getCalendarStatus(p,s),now(),true)).toBe(true);const oldBlocks=await a.listCalendarBlockIds(p);
 vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com/calendar/ical/syntheticB.ics?s=synthetic');expect(await a.getCalendarStatus(p,s)).toMatchObject({configurationMatches:false});expect(calendarStatusReady(await a.getCalendarStatus(p,s),now(),true)).toBe(false);await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');expect(await a.listCalendarBlockIds(p)).toEqual(oldBlocks);
 await a.recordCalendarHealthAlert(p,false,now());await a.recordCalendarHealthAlert(p,true,now());expect((await a.listOperatorAlerts()).find(j=>j.kind==='calendar_health')?.status).toBe('pending');
 await sync([event('2027-02-12','2027-02-14','b')]);expect(calendarStatusReady(await a.getCalendarStatus(p,s),now(),true)).toBe(true);expect((await a.createBookingIfAvailable(booking())).status).toBe('pending_payment');expect(JSON.stringify(await a.getCalendarStatus(p,s))).not.toMatch(/synthetic|fingerprint|https/);
});
it('rejects an in-flight old-feed lease after a runtime configuration switch',async()=>{
 await sync([event()]);const oldBlocks=await a.listCalendarBlockIds(p);const lease=await a.beginCalendarSync(p,s,now());vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com/calendar/ical/syntheticB.ics?s=synthetic');
 expect(await a.completeCalendarSync({propertyId:p,sourceId:s,leaseId:lease!.leaseId,events:[event('2027-02-12','2027-02-14','b')],nowISO:now()})).toMatchObject({applied:false});expect(await a.getCalendarStatus(p,s)).toMatchObject({status:'failed',configurationMatches:false});expect(await a.listCalendarBlockIds(p)).toEqual(oldBlocks);await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');
});

it('normalizes validated URL fingerprints without returning any secret source data',()=>{
 vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com:443/calendar/ical/syntheticA.ics?b=two&a=one');const fingerprint=configuredCalendarFingerprint();expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);vi.stubEnv('AIRBNB_ICAL_URL','https://www.airbnb.com/calendar/ical/syntheticA.ics?a=one&b=two');expect(configuredCalendarFingerprint()).toBe(fingerprint);vi.stubEnv('AIRBNB_ICAL_URL','https://127.0.0.1/private');expect(configuredCalendarFingerprint()).toBeNull();
});
it('legacy unbound snapshots cannot certify a configured feed or shared inventory',async()=>{
 await sync([event()]);const raw=new Database(path.join(dir,'db'));raw.prepare('UPDATE calendar_sources SET success_fingerprint=NULL').run();raw.close();expect((await a.getCalendarStatus(p,s))?.configurationMatches).toBe(false);await expect(a.createBookingIfAvailable(booking())).rejects.toThrow('calendar verification');expect(await a.listCalendarBlockIds(p)).toHaveLength(1);
});
