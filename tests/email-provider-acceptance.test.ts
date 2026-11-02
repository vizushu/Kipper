import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {deliverOutboxMessage} from '../src/lib/outbox';
import type {OutboxJob} from '../src/lib/db/workflows';
const job={id:'mail_fixture',kind:'guest_confirmation',dedupeKey:'receipt/fixture/v1',payload:{booking:{paymentMode:'live',paymentStatus:'paid',status:'confirmed'}}} as OutboxJob;
const envelope={from:'host@example.test',to:'owner@example.test',subject:'Synthetic test',html:'Synthetic test'};
beforeEach(()=>{for(const[key,value]of Object.entries({SITE_PREVIEW_MODE:'false',EMAIL_DELIVERY_MODE:'live',EMAIL_LIVE_APPROVED:'true',BOOKING_FROM_EMAIL:'host@example.test',HOST_NOTIFY_EMAIL:'host@example.test',BOOKING_REPLY_TO_EMAIL:'',RESEND_API_KEY:'synthetic-not-a-key'}))vi.stubEnv(key,value);});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it.each([{}, {id:'private@example.test'},{id:'x'.repeat(5000)}])('rejects missing/malformed/oversized acceptance IDs without leaking provider response',async payload=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify(payload)));
 await expect(deliverOutboxMessage(job,envelope)).rejects.toThrow('Email provider acceptance could not be verified');
});
it('returns accepted provider ID, not a claim of delivered inbox email',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'11111111-1111-4111-8111-111111111111'})));
 expect(await deliverOutboxMessage(job,envelope)).toEqual({outcome:'sent',providerMessageId:'11111111-1111-4111-8111-111111111111'});
});
