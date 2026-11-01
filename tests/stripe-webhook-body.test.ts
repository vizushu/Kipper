import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Stripe from 'stripe';
import {POST} from '../src/app/api/webhooks/stripe/route';
const mocks=vi.hoisted(()=>({getBookingByPaymentIntentId:vi.fn()}));
vi.mock('@/lib/db',()=>({getAdapter:()=>mocks}));
vi.mock('@/lib/outbox',()=>({tryProcessOutbox:vi.fn()}));
const secret='whsec_synthetic_body_test';
function request(body:BodyInit,headers:Record<string,string>={}){
 return new Request('https://example.test/api/webhooks/stripe',{method:'POST',body,headers,duplex:'half'} as RequestInit);
}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('BOOKING_PAYMENT_MODE','closed');vi.stubEnv('STRIPE_SECRET_KEY','rk_live_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET',secret);mocks.getBookingByPaymentIntentId.mockResolvedValue(null);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
describe('bounded Stripe callbacks in production mode',()=>{
 it('preserves signed raw UTF-8 bytes with whitespace and live provenance',async()=>{
  const payload=' \n'+JSON.stringify({id:'evt_body',type:'payment_intent.payment_failed',livemode:true,data:{object:{id:'pi_body',status:'requires_payment_method',amount:44900,amount_received:0,currency:'usd',livemode:true,metadata:{note:'café — synthetic'}}}})+'\n';
  const signature=new Stripe('sk_test_synthetic').webhooks.generateTestHeaderString({payload,secret});
  expect((await POST(request(payload,{'stripe-signature':signature}))).status).toBe(200);
  expect(mocks.getBookingByPaymentIntentId).toHaveBeenCalledWith('pi_body');
 });
 it('rejects excessive declared length before storage',async()=>{
  expect((await POST(request('{}',{'content-length':'65537'}))).status).toBe(413);
  expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
 });
 it('rejects oversized streamed bytes without trusting the length header',async()=>{
  expect((await POST(request('x'.repeat(65537)))).status).toBe(413);
  expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
 });
 it('cancels a stalled body after five seconds without storage',async()=>{
  vi.useFakeTimers();const cancel=vi.fn();
  const response=POST(request(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([123]));},cancel})));
  await vi.advanceTimersByTimeAsync(5001);
  expect((await response).status).toBe(408);expect(cancel).toHaveBeenCalled();
  expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
 });
 it('rejects invalid UTF-8 without reflecting payload bytes',async()=>{
  const response=await POST(request(new Uint8Array([0xff,0xfe])));
  expect(response.status).toBe(400);expect(await response.text()).toContain('Invalid webhook body');
  expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
 });
 it('keeps preview denial ahead of parsing despite live-shaped credentials',async()=>{
  vi.stubEnv('SITE_PREVIEW_MODE','true');
  expect((await POST(request('x'.repeat(65537)))).status).toBe(503);
  expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
 });
});
