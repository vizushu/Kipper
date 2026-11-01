import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {deliverOutboxMessage,outboxEnvelope,processOutbox} from '../src/lib/outbox';
import {deliverOperatorAlert,operatorAlertEnvelope} from '../src/lib/operator-alerts';
import {configuredReplyTo,liveEmailDeliveryConfigured} from '../src/lib/email-delivery';
import {sendBookingConfirmation} from '../src/lib/email';
import type {Booking,Property} from '../src/lib/types';
import type {OutboxJob} from '../src/lib/db/workflows';
import type {OperatorAlert} from '../src/lib/db/operator-alerts';
import type {DataAdapter} from '../src/lib/db/adapter';
const booking={id:'bk_fixture',reference:'CP-FIXTURE',propertyId:'casa-pacifica',checkIn:'2027-02-20',checkOut:'2027-02-22',nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'Fixture',email:'guest@example.test'},lineItems:[],totalCents:50000,currency:'USD',status:'confirmed',paymentStatus:'paid',paymentMode:'live',createdAt:'2026-10-30T12:00:00Z',confirmedAt:'2026-10-30T12:01:00Z',idempotencyKey:'fixture'} as Booking;
const job={id:'mail_fixture',bookingId:booking.id,kind:'guest_confirmation',dedupeKey:'guest_confirmation/bk_fixture/v1',status:'processing',payload:{booking},attempts:1,createdAt:booking.createdAt,nextAttemptAt:booking.createdAt,leaseToken:'fixture'} as OutboxJob;
beforeEach(()=>{
 for(const [key,value] of Object.entries({SITE_PREVIEW_MODE:'false',EMAIL_DELIVERY_MODE:'live',EMAIL_LIVE_APPROVED:'true',RESEND_API_KEY:'synthetic-no-real-key',BOOKING_FROM_EMAIL:'Casa Pacifica <sender@example.test>',HOST_NOTIFY_EMAIL:'host@example.test',BOOKING_REPLY_TO_EMAIL:'replies@example.test',BOOKING_PAYMENT_MODE:'closed',BOOKING_TEST_MODE:'true',LIVE_BOOKING_APPROVED:'false',OPERATOR_ALERTS_APPROVED:'true',OPERATOR_ALERT_DELIVERY_QA_APPROVED:'true'}))vi.stubEnv(key,value);
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}'));
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it('delivers historical paid live receipt when new bookings are closed or in test mode',async()=>{
 expect(liveEmailDeliveryConfigured()).toBe(true);
 expect(await deliverOutboxMessage(job,outboxEnvelope(job))).toBe('sent');
 const options=vi.mocked(fetch).mock.calls[0][1]!;
 expect((options.headers as Record<string,string>)['Idempotency-Key']).toBe(job.dedupeKey);
 expect(JSON.parse(String(options.body)).reply_to).toBe('replies@example.test');
});
it('allows authorized historical live recovery independently of booking mode',async()=>{
 const recovery={...job,kind:'access_recovery',payload:{recovery:{recipient:'guest@example.test',token:'fixture-token',reference:booking.reference,expiresAt:'2027-01-01T00:00:00Z',paymentMode:'live'}}} as OutboxJob;
 expect(await deliverOutboxMessage(recovery,outboxEnvelope(recovery))).toBe('sent');
});
it.each([{paymentMode:'test',paymentStatus:'paid_test'},{paymentStatus:'unpaid'},{status:'cancelled'}])('never upgrades synthetic/unpaid/cancelled snapshots to live receipt delivery',async patch=>{
 const changed={...job,payload:{booking:{...booking,...patch} as Booking}};
 await expect(deliverOutboxMessage(changed,outboxEnvelope(changed))).rejects.toThrow('not enabled');expect(fetch).not.toHaveBeenCalled();
});
it('test-mode recovery never becomes live because current delivery is enabled',async()=>{
 const changed={...job,kind:'access_recovery',payload:{recovery:{recipient:'guest@example.test',token:'fixture-token',reference:booking.reference,expiresAt:'2027-01-01T00:00:00Z',paymentMode:'test'}}} as OutboxJob;
 await expect(deliverOutboxMessage(changed,outboxEnvelope(changed))).rejects.toThrow('not enabled');expect(fetch).not.toHaveBeenCalled();
});
it('preview blocks transport and claims despite contradictory delivery approvals',async()=>{
 vi.stubEnv('SITE_PREVIEW_MODE','true');const adapter={claimOutbox:vi.fn()} as unknown as DataAdapter;
 expect((await processOutbox(adapter)).disabled).toBe(true);expect(adapter.claimOutbox).not.toHaveBeenCalled();
 await expect(deliverOutboxMessage(job,outboxEnvelope(job))).rejects.toThrow('Preview');expect(fetch).not.toHaveBeenCalled();
});
it('preserves frozen reply address and provider idempotency across retries/config changes',async()=>{
 const frozen=outboxEnvelope(job);vi.stubEnv('BOOKING_REPLY_TO_EMAIL','changed@example.test');
 await deliverOutboxMessage(job,frozen);await deliverOutboxMessage(job,frozen);
 const [first,second]=vi.mocked(fetch).mock.calls;
 expect(first[1]!.body).toBe(second[1]!.body);
 expect(JSON.parse(String(first[1]!.body)).reply_to).toBe('replies@example.test');
 expect((first[1]!.headers as Record<string,string>)['Idempotency-Key']).toBe((second[1]!.headers as Record<string,string>)['Idempotency-Key']);
});
it('optional reply-to is omitted, not backfilled into already frozen envelopes',async()=>{
 vi.stubEnv('BOOKING_REPLY_TO_EMAIL','');const frozen=outboxEnvelope(job);expect(frozen).not.toHaveProperty('replyTo');
 vi.stubEnv('BOOKING_REPLY_TO_EMAIL','changed@example.test');await deliverOutboxMessage(job,frozen);
 expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]!.body))).not.toHaveProperty('reply_to');
});
it.each(['bad-address','a..b@example.test','private@example.test\r\nBcc: secret@example.test','one@example.test,two@example.test'])('rejects malformed reply configuration without exposing its value',async value=>{
 vi.stubEnv('BOOKING_REPLY_TO_EMAIL',value);expect(liveEmailDeliveryConfigured()).toBe(false);
 let message='';try{configuredReplyTo();}catch(e){message=(e as Error).message;}
 expect(message).toBe('Invalid email reply configuration');expect(message).not.toContain(value);expect(fetch).not.toHaveBeenCalled();
});
it('revalidates persisted envelopes before provider request',async()=>{
 const frozen={...outboxEnvelope(job),replyTo:'private@example.test\nBcc: hidden@example.test'};
 await expect(deliverOutboxMessage(job,frozen)).rejects.toThrow('Invalid email envelope');expect(fetch).not.toHaveBeenCalled();
});
it.each(['BOOKING_FROM_EMAIL','HOST_NOTIFY_EMAIL','RESEND_API_KEY','EMAIL_LIVE_APPROVED'])('fails closed when %s readiness is missing',key=>{vi.stubEnv(key,'');expect(liveEmailDeliveryConfigured()).toBe(false);});
it('operator alerts carry a frozen configured reply address with existing approval gates',async()=>{
 const alert={id:'alert_fixture',kind:'calendar_health',incidentId:'opaque',episode:1,paymentMode:'live',dedupeKey:'alert/fixture'} as OperatorAlert;
 const frozen=operatorAlertEnvelope(alert);vi.stubEnv('BOOKING_REPLY_TO_EMAIL','changed@example.test');
 expect(await deliverOperatorAlert(alert,frozen)).toBe('sent');
 expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]!.body)).reply_to).toBe('replies@example.test');
});
it('legacy receipt renderer no longer promises an automatic Wi-Fi followup',async()=>{
 const property={name:'Casa Pacifica',address:'Fixture address',city:'Fixture city',state:'CA',zip:'00000',checkInMethod:'Contact host',quietHours:'Consult terms'} as Property;
 await sendBookingConfirmation(booking,property);
 const body=JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]!.body));
 expect(body.html).not.toMatch(/follow-up before arrival/i);expect(body.html).toContain('Contact your host for arrival and Wi-Fi details.');
});
