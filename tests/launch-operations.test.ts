import {describe,it,expect,vi,afterEach} from 'vitest';
import type {DataAdapter} from '../src/lib/db/adapter';
import {getLaunchReadiness} from '../src/lib/launch-readiness';
import {runMaintenance,maintenanceSummary} from '../src/lib/maintenance';
const mocks=vi.hoisted(()=>({processOutbox:vi.fn()}));
vi.mock('../src/lib/outbox',()=>({processOutbox:mocks.processOutbox}));
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('launch operations remain explicit and bounded',()=>{
 it('never considers env flags, live-looking keys or fresh iCal enough to launch',()=>{
  vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('BOOKING_TEST_MODE','true');vi.stubEnv('LIVE_BOOKING_ENABLED','true');vi.stubEnv('INVENTORY_VERIFIED','true');vi.stubEnv('STRIPE_SECRET_KEY','sk_live_synthetic_not_a_real_key');
  const report=getLaunchReadiness();expect(report.canAcceptLiveBookings).toBe(false);expect(report.inventory).toMatchObject({instantBookingReady:false,icalIsAuthoritative:false});expect(JSON.stringify(report)).not.toContain('sk_live');
 });
 it('preview cannot perform maintenance or expose job metadata',async()=>{
  vi.stubEnv('SITE_PREVIEW_MODE','true');const a={expirePendingBookings:vi.fn(),listOutbox:vi.fn()} as unknown as DataAdapter;
  expect(await runMaintenance(a)).toEqual({disabled:true,expiredHolds:0});expect(await maintenanceSummary(a)).toEqual({disabled:true});expect(a.expirePendingBookings).not.toHaveBeenCalled();expect(a.listOutbox).not.toHaveBeenCalled();expect(mocks.processOutbox).not.toHaveBeenCalled();
 });
 it('expires holds then requests a bounded drain, returning counts not guest data',async()=>{
  vi.stubEnv('SITE_PREVIEW_MODE','false');const a={expirePendingBookings:vi.fn().mockResolvedValue(2)} as unknown as DataAdapter;mocks.processOutbox.mockResolvedValue({disabled:true,claimed:0});
  expect(await runMaintenance(a)).toEqual({disabled:false,expiredHolds:2,delivery:{disabled:true,claimed:0}});expect(mocks.processOutbox).toHaveBeenCalledWith(a,{limit:10});
 });
 it('operational status reveals only counts and review flag',async()=>{
  vi.stubEnv('SITE_PREVIEW_MODE','false');const a={listPaymentExceptions:vi.fn().mockResolvedValue([{attentionRequired:true,paymentIntentId:'private-provider-id'}]),listOutbox:vi.fn().mockResolvedValue([{status:'dead',payload:{recovery:{token:'synthetic-private-code',recipient:'private@example.test'}}},{status:'pending'}])} as unknown as DataAdapter;
  const result=await maintenanceSummary(a);expect(result).toMatchObject({needsReview:true,openPaymentReviews:1,counts:{dead:1,pending:1}});expect(JSON.stringify(result)).not.toMatch(/private|token|recipient/);
 });
});
