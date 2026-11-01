import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({outbox:vi.fn(),alerts:vi.fn()}));
vi.mock('../src/lib/outbox',()=>({processOutbox:mocks.outbox}));
vi.mock('../src/lib/operator-alerts',()=>({dispatchOperatorAlerts:mocks.alerts}));
import {operationsWorkerAuthorized,operationsWorkerConfigured,runOperations} from '../src/lib/operations-worker';
import type {DataAdapter} from '../src/lib/db/adapter';
const key='o'.repeat(43);
beforeEach(()=>{vi.stubEnv('OPERATIONS_WORKER_SECRET',key);vi.stubEnv('OPERATIONS_WORKER_APPROVED','true');vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('DATA_ADAPTER','sqlite');mocks.outbox.mockReset().mockResolvedValue({disabled:false,sent:1,simulated:0,retried:0,suppressed:0});mocks.alerts.mockReset().mockResolvedValue({disabled:false,sent:1,simulated:0,failed:0});});
afterEach(()=>vi.unstubAllEnvs());
const req=(token=key)=>new Request('https://innkipper.com/api/operations/run',{headers:{authorization:`Bearer ${token}`}});
it('requires dedicated approval and key, never admin or shared worker credentials',()=>{
 expect(operationsWorkerAuthorized(req())).toBe(true);expect(operationsWorkerAuthorized(req('bad'))).toBe(false);
 for(const env of ['ADMIN_SECRET','CALENDAR_WORKER_SECRET','OWNER_EMAIL_PROBE_SECRET','CALENDAR_EXPORT_TOKEN','RESEND_API_KEY','STRIPE_SECRET_KEY','RESEND_OWNER_PROBE_WEBHOOK_SECRET']){vi.stubEnv(env,key);expect(operationsWorkerConfigured()).toBe(false);vi.stubEnv(env,'different');}
 vi.stubEnv('OPERATIONS_WORKER_APPROVED','false');expect(operationsWorkerAuthorized(req())).toBe(false);
});
it.each(['SITE_PREVIEW_MODE','STAGING_TEST_MODE'])('blocks %s before database or delivery',async(flag)=>{
 vi.stubEnv(flag,'true');const adapter=new Proxy({},{get(){throw Error('must not touch');}}) as DataAdapter;
 expect(operationsWorkerAuthorized(req())).toBe(false);expect(await runOperations(adapter)).toMatchObject({status:'review-required',holds:{status:'disabled'}});expect(mocks.outbox).not.toHaveBeenCalled();
});
it('fails closed unsupported storage and malformed secret',()=>{vi.stubEnv('DATA_ADAPTER','supabase');expect(operationsWorkerConfigured()).toBe(false);vi.stubEnv('DATA_ADAPTER','sqlite');vi.stubEnv('OPERATIONS_WORKER_SECRET','weak');expect(operationsWorkerConfigured()).toBe(false);});
it('closed intake does not prevent owed delivery and each queue is limited to one',async()=>{
 vi.stubEnv('BOOKING_PAYMENT_MODE','closed');const expire=vi.fn().mockResolvedValue(3),adapter={expirePendingBookings:expire} as unknown as DataAdapter;
 expect(await runOperations(adapter)).toMatchObject({status:'completed',holds:{expired:3},outbox:{sent:1},alerts:{sent:1}});expect(mocks.outbox).toHaveBeenCalledWith(adapter,{limit:1});expect(mocks.alerts).toHaveBeenCalledWith(adapter,{limit:1});
});
it('isolates per-subjob failure without raw errors and still attempts operator alerts',async()=>{
 const expire=vi.fn().mockRejectedValue(Error('private guest data'));mocks.outbox.mockRejectedValue(Error('secret token'));const result=await runOperations({expirePendingBookings:expire} as unknown as DataAdapter);
 expect(result).toMatchObject({status:'review-required',holds:{status:'failed'},outbox:{status:'failed'},alerts:{status:'completed'}});expect(JSON.stringify(result)).not.toMatch(/private guest|secret token/);
});
it('does not mistake disabled or failed deliveries for success',async()=>{
 mocks.outbox.mockResolvedValue({disabled:true,sent:0,simulated:0,retried:0,suppressed:0});mocks.alerts.mockResolvedValue({disabled:false,sent:0,simulated:0,failed:1});expect(await runOperations({expirePendingBookings:async()=>0} as unknown as DataAdapter)).toMatchObject({status:'review-required',outbox:{status:'disabled'},alerts:{status:'review-required'}});
});
it('does not start another job without its reserved deadline budget',async()=>{
 let time=0;mocks.outbox.mockImplementation(async()=>{time=26000;return {disabled:false,sent:1,simulated:0,retried:0,suppressed:0};});const result=await runOperations({expirePendingBookings:async()=>0} as unknown as DataAdapter,()=>time);expect(result.alerts.status).toBe('skipped');expect(mocks.alerts).not.toHaveBeenCalled();
});
