import {afterEach,it,expect,vi} from 'vitest';
import {syncAirbnbCalendar,assertCalendarReady} from '../src/lib/calendar-sync';
import type {DataAdapter} from '../src/lib/db/adapter';
const fakeUrl='https://www.airbnb.com/calendar/ical/synthetic.ics?s=synthetic-private-key';
const feed='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:synthetic-event\r\nDTSTART;VALUE=DATE:20270313\r\nDTEND;VALUE=DATE:20270315\r\nSUMMARY:Private guest details\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
function adapter(){return {beginCalendarSync:vi.fn().mockResolvedValue({leaseId:'synthetic-lease'}),completeCalendarSync:vi.fn().mockResolvedValue({applied:true,blockCount:1,conflictCount:0}),failCalendarSync:vi.fn().mockResolvedValue(undefined),getCalendarStatus:vi.fn().mockResolvedValue(null)} as unknown as DataAdapter;}
afterEach(()=>vi.unstubAllEnvs());
it('does not fetch or initialize calendar state without separate calendar approval',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('AIRBNB_ICAL_URL',fakeUrl);const a=adapter(),fetcher=vi.fn();expect(await syncAirbnbCalendar(a,{fetcher})).toEqual({status:'disabled'});expect(fetcher).not.toHaveBeenCalled();expect(a.beginCalendarSync).not.toHaveBeenCalled();
});
it('passes only sanitized events to atomic reconciliation and returns safe counts',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('AIRBNB_ICAL_URL',fakeUrl);const a=adapter();const result=await syncAirbnbCalendar(a,{fetcher:async()=>feed});expect(result).toMatchObject({status:'updated',blockCount:1});const input=vi.mocked(a.completeCalendarSync).mock.calls[0][0];expect(input.events[0].from).toBe('2027-03-13');expect(JSON.stringify(input)).not.toMatch(/Private guest|synthetic-event|synthetic-private-key/);expect(input.allowEmpty).toBe(false);
});
it('retains old blocks on fetch/parse failure and never returns private errors',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('AIRBNB_ICAL_URL',fakeUrl);
 for(const fetcher of [async()=>{throw new Error(fakeUrl);},async()=>feed.slice(0,-20)]){const a=adapter();expect(await syncAirbnbCalendar(a,{fetcher})).toEqual({status:'failed'});expect(a.failCalendarSync).toHaveBeenCalled();expect(a.completeCalendarSync).not.toHaveBeenCalled();}
});
it('does not fetch while another sync lease owns the source',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('AIRBNB_ICAL_URL',fakeUrl);const a=adapter();vi.mocked(a.beginCalendarSync).mockResolvedValue(null);const fetcher=vi.fn();expect(await syncAirbnbCalendar(a,{fetcher})).toEqual({status:'busy'});expect(fetcher).not.toHaveBeenCalled();
});
it('quote/calendar readiness fails closed for missing required, stale, failed or conflicting feeds',async()=>{
 const a=adapter(),now=new Date('2026-10-31T00:30:00Z');vi.stubEnv('CALENDAR_SYNC_REQUIRED','true');await expect(assertCalendarReady(a,'casa-pacifica',now)).rejects.toThrow('Availability needs host review');
 for(const status of ['failed','conflict','healthy'] as const){vi.mocked(a.getCalendarStatus).mockResolvedValue({propertyId:'casa-pacifica',sourceId:'airbnb-primary',status,lastSuccessAt:'2026-10-31T00:00:00.000Z',lastAttemptAt:'2026-10-31T00:00:00.000Z',blockCount:1,conflictCount:0,lastReviewedAt:null,reviewCount:0});await expect(assertCalendarReady(a,'casa-pacifica',now)).rejects.toThrow();}
});

import {getBookingPaymentMode,livePaymentBlockers,LIVE_APPROVAL_FLAGS} from '../src/lib/payment-mode';
it('shared calendar flags can never make delayed feeds sufficient for live instant payments',()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('BOOKING_PAYMENT_MODE','live');vi.stubEnv('INVENTORY_POLICY','exclusive_direct');
 for(const flag of LIVE_APPROVAL_FLAGS)vi.stubEnv(flag,'true');
 vi.stubEnv('STRIPE_SECRET_KEY','sk_live_synthetic');vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_live_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET','synthetic');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');
 expect(livePaymentBlockers()).toContain('SHARED_CALENDAR_REVIEW_WORKFLOW_REQUIRED');expect(getBookingPaymentMode()).toBeNull();
});
