import {afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({getAdapter:vi.fn(),ranges:vi.fn()}));
vi.mock('../src/lib/db',()=>({getAdapter:mocks.getAdapter}));
import {GET as workerStatus, POST as workerSync} from '../src/app/api/calendar/sync/route';
import {calendarWorkerAuthorized} from '../src/lib/calendar-access';
import {getBookingPaymentMode} from '../src/lib/payment-mode';
import {GET as exportCalendar} from '../src/app/api/calendar/direct.ics/route';
import {GET as calendarStatus,POST as calendarSync} from '../src/app/api/admin/calendar/route';
const key='synthetic_private_calendar_key_'.repeat(2);
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('preview overrides valid export capability and admin credentials before DB/network',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('ADMIN_SECRET','synthetic_admin');
 expect((await exportCalendar(new Request('https://example.test/api/calendar/direct.ics?key='+key))).status).toBe(404);
 for(const call of [calendarStatus,calendarSync])expect((await call(new NextRequest('https://example.test/api/admin/calendar',{method:call===calendarSync?'POST':'GET',headers:{'x-admin-secret':'synthetic_admin'}}))).status).toBe(401);
 expect(mocks.getAdapter).not.toHaveBeenCalled();
});
it('rejects wrong and repeated credentials without DB access and marks all responses private',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);
 for(const query of ['', '?key=wrong','?key='+key+'&key='+key]){const response=await exportCalendar(new Request('https://example.test/api/calendar/direct.ics'+query));expect(response.status).toBe(404);expect(response.headers.get('cache-control')).toContain('no-store');}
 expect(mocks.getAdapter).not.toHaveBeenCalled();
});
it('returns minimal calendar with privacy headers only after capability verification',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);mocks.ranges.mockResolvedValue([{id:'private-booking-id',from:'2027-02-20',to:'2027-02-22'}]);mocks.getAdapter.mockReturnValue({listCalendarExportRanges:mocks.ranges});
 const response=await exportCalendar(new Request('https://example.test/api/calendar/direct.ics?key='+key));expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('text/calendar');expect(response.headers.get('x-robots-tag')).toContain('noindex');expect(response.headers.get('referrer-policy')).toBe('no-referrer');const body=await response.text();expect(body).not.toContain(key);expect(body).not.toContain('private-booking-id');expect(body).toContain('SUMMARY:Unavailable');
});

it('calendar-only approval can expose authorized busy dates while booking remains closed',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);mocks.ranges.mockResolvedValue([]);mocks.getAdapter.mockReturnValue({listCalendarExportRanges:mocks.ranges});
 expect((await exportCalendar(new Request('https://example.test/api/calendar/direct.ics?key='+key))).status).toBe(200);expect(getBookingPaymentMode()).toBeNull();
});
it('calendar operator credential is independent, bounded and revocable without opening preview admin',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('CALENDAR_WORKER_SECRET',key);
 const request=new Request('https://example.test/api/calendar/sync',{headers:{authorization:'Bearer '+key}});expect(calendarWorkerAuthorized(request)).toBe(true);expect(getBookingPaymentMode()).toBeNull();
 vi.stubEnv('CALENDAR_WORKER_SECRET','rotated_synthetic_operator_key_'.repeat(2));expect(calendarWorkerAuthorized(request)).toBe(false);
 expect((await workerStatus(request)).status).toBe(404);expect((await workerSync(request)).status).toBe(404);expect(mocks.getAdapter).not.toHaveBeenCalled();
});

it('approved calendar worker stays rate bounded in preview without enabling guest checkout',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_SYNC_ENABLED','true');vi.stubEnv('CALENDAR_WORKER_SECRET',key);vi.stubEnv('AIRBNB_ICAL_URL','');
 const limiter=vi.fn().mockResolvedValue({allowed:true,retryAfterSeconds:0});mocks.getAdapter.mockReturnValue({consumeRateLimit:limiter});
 const req=()=>new Request('https://example.test/api/calendar/sync',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}'});
 const response=await workerSync(req());expect(response.status).toBe(200);expect(await response.json()).toEqual({status:'not-configured'});expect(getBookingPaymentMode()).toBeNull();expect(limiter.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
 limiter.mockResolvedValue({allowed:false,retryAfterSeconds:100});expect((await workerSync(req())).status).toBe(429);
});
