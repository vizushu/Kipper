import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../src/app/api/_context',()=>({loadPricingContext:mocks.load}));
import {POST} from '../src/app/api/quote/route';
import {getProperty} from '../src/lib/property';
beforeEach(()=>vi.stubEnv('BOOKING_TEST_MODE','true'));afterEach(()=>vi.unstubAllEnvs());
it.each([{cleaningFeeCents:15000,taxRatePct:10.5},{cleaningFeeCents:18000,taxRatePct:10.5},{cleaningFeeCents:20000,taxRatePct:12.75}])('refuses unreviewed persisted settings %j',async(settings)=>{mocks.load.mockResolvedValue({property:getProperty('casa-pacifica'),settings});const response=await POST(new Request('http://localhost/api/quote',{method:'POST',body:JSON.stringify({propertyId:'casa-pacifica',checkIn:'2027-02-20',checkOut:'2027-02-22',guests:{adults:2,children:0,infants:0}})}));expect(response.status).toBe(503);expect((await response.json()).code).toBe('PRICING_REVIEW_REQUIRED');expect(response.headers.get('cache-control')).toContain('no-store');});
