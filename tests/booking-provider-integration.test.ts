/** Route -> actual SQLite -> synthetic provider integration. No account, network, email or real payment. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteAdapter } from '../src/lib/db/sqlite';
import type { Quote } from '../src/lib/types';
import { paymentEvidence } from '../src/lib/payment-verification';
import { processOutbox } from '../src/lib/outbox';
import { POST as quoteRoute } from '../src/app/api/quote/route';
import { POST as bookingRoute } from '../src/app/api/bookings/route';
import { POST as confirmRoute } from '../src/app/api/bookings/[id]/confirm/route';
import { POST as webhookRoute } from '../src/app/api/webhooks/stripe/route';
const provider = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));
vi.mock('../src/lib/db', () => ({ getAdapter: () => adapter }));
vi.mock('../src/lib/stripe', () => ({ createPaymentIntent: provider.create, verifyPaymentIntent: provider.retrieve }));
let adapter: SqliteAdapter;
let directory: string;
let intents: Map<string, Stripe.PaymentIntent>;
let keys: Map<string, string>;
let network = vi.fn<typeof fetch>();
const guest = { name: 'Synthetic Integration Guest', email: 'synthetic-integration@example.test' };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function post(url: string, body: unknown) { return new Request(`https://example.test${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
function succeed(id: string) { const intent = intents.get(id)!; intent.status = 'succeeded'; intent.amount_received = intent.amount; return intent; }
function signedEvent(intent: Stripe.PaymentIntent, eventId = 'evt_synthetic', type = 'payment_intent.succeeded') {
  const payload = JSON.stringify({ id: eventId, object: 'event', type, livemode: false, data: { object: intent } });
  const signature = new Stripe('sk_test_synthetic').webhooks.generateTestHeaderString({ payload, secret: 'whsec_synthetic' });
  return new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } });
}
async function getQuote() {
  const response = await quoteRoute(post('/api/quote', { propertyId: 'casa-pacifica', checkIn: '2027-02-20', checkOut: '2027-02-22', guests: { adults: 2, children: 0, infants: 0 }, pets: 0 }));
  expect(response.status).toBe(200);
  return (await response.json()).quote as Quote;
}
async function reserve(quote: Quote, key = 'synthetic-integration-1') {
  const response = await bookingRoute(post('/api/bookings', { quoteId: quote.id, guest, idempotencyKey: key }));
  expect(response.status).toBe(201);
  const body = await response.json();
  const stored = await adapter.getBooking(body.booking.id);
  expect(stored).not.toBeNull();
  return { response, body, booking: stored! };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T17:00:00.000Z'));
  vi.stubEnv('SITE_PREVIEW_MODE', 'false'); vi.stubEnv('BOOKING_TEST_MODE', 'true'); vi.stubEnv('EMAIL_DELIVERY_MODE', 'disabled');
  vi.stubEnv('BOOKING_ACCESS_SECRET', 'synthetic-integration-signing-secret-long-enough');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic'); vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_synthetic');
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'casa-provider-integration-')); adapter = new SqliteAdapter(path.join(directory, 'bookings.sqlite'));
  intents = new Map(); keys = new Map(); provider.create.mockReset(); provider.retrieve.mockReset();
  network = vi.fn<typeof fetch>().mockRejectedValue(new Error('Unexpected network request forbidden in synthetic harness'));
  vi.stubGlobal('fetch', network);
  provider.create.mockImplementation(async (quote: Quote, key: string, bookingId: string) => {
    let id = keys.get(key);
    if (!id) {
      id = `pi_synthetic_${intents.size + 1}`; keys.set(key, id);
      intents.set(id, { id, status: 'requires_payment_method', amount: quote.totalCents, amount_received: 0, currency: 'usd', livemode: false,
        metadata: { mode: 'test', booking_id: bookingId, property_id: quote.propertyId, check_in: quote.checkIn, check_out: quote.checkOut } } as unknown as Stripe.PaymentIntent);
    }
    return { id, clientSecret: `${id}_secret_synthetic`, amountCents: intents.get(id)!.amount, status: intents.get(id)!.status };
  });
  provider.retrieve.mockImplementation(async (id: string) => {
    const intent = intents.get(id); if (!intent) throw new Error('Synthetic intent not found'); return paymentEvidence(intent);
  });
});
afterEach(() => {
  expect(network).not.toHaveBeenCalled(); adapter.close(); fs.rmSync(directory, { recursive: true, force: true }); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe('booking routes with real durable storage and synthetic provider boundaries', () => {
  it('quotes, reserves, verifies payment, deduplicates webhooks and delivers two receipts exactly once', async () => {
    const quote = await getQuote();
    expect(quote.cleaningFeeCents).toBe(18000); expect(quote.staySnapshot).toMatchObject({ bedrooms: 3, maxGuests: 8, taxRatePct: 12.75, cleaningFeeCents: 18000 });
    const { response, booking } = await reserve(quote);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(booking.status).toBe('pending_payment'); expect(await adapter.listOutbox()).toHaveLength(0);
    const replay = await reserve(quote); expect(replay.booking.id).toBe(booking.id); expect((await adapter.listBookings())).toHaveLength(1);
    const intent = succeed(booking.stripePaymentIntentId!);
    const confirmation = await confirmRoute(post(`/api/bookings/${booking.id}/confirm`, { paymentIntentId: intent.id }), context(booking.id));
    expect(confirmation.status).toBe(200); expect((await adapter.getBooking(booking.id))?.paymentStatus).toBe('paid_test');
    expect((await confirmRoute(post(`/api/bookings/${booking.id}/confirm`, { paymentIntentId: intent.id }), context(booking.id))).status).toBe(200);
    expect((await webhookRoute(signedEvent(intent))).status).toBe(200); expect((await webhookRoute(signedEvent(intent))).status).toBe(200);
    const jobs = await adapter.listOutbox(); expect(jobs).toHaveLength(2); expect(jobs.every(job => job.status === 'pending' && job.attempts === 0)).toBe(true);
    const delivered = vi.fn().mockResolvedValue('sent'); expect((await processOutbox(adapter, { deliver: delivered })).sent).toBe(2);
    expect((await webhookRoute(signedEvent(intent, 'evt_duplicate_after_delivery'))).status).toBe(200);
    expect((await processOutbox(adapter, { deliver: delivered })).claimed).toBe(0); expect(delivered).toHaveBeenCalledTimes(2);
    expect((await adapter.listOutbox()).every(job => job.status === 'sent' && !job.envelope && Object.keys(job.payload).length === 0)).toBe(true);
    expect((await adapter.getBooking(booking.id))?.staySnapshot).toEqual(quote.staySnapshot);
  });
  it('two previously quoted checkout requests cannot both reserve the same physical inventory', async () => {
    const first = await getQuote(); const second = await getQuote();
    const requests = await Promise.all([bookingRoute(post('/api/bookings', { quoteId: first.id, guest, idempotencyKey: 'synthetic-competing-first' })), bookingRoute(post('/api/bookings', { quoteId: second.id, guest, idempotencyKey: 'synthetic-competing-second' }))]);
    expect(requests.map(r => r.status).sort()).toEqual([201, 409]); expect((await adapter.listBookings())).toHaveLength(1); expect(provider.create).toHaveBeenCalledTimes(1);
  });
  it('mismatched amount cannot confirm or enqueue receipts, but corrected evidence succeeds', async () => {
    const { booking } = await reserve(await getQuote()); const intent = succeed(booking.stripePaymentIntentId!); intent.amount_received--;
    expect((await confirmRoute(post('/confirm', { paymentIntentId: intent.id }), context(booking.id))).status).toBe(409);
    expect((await webhookRoute(signedEvent(intent))).status).toBe(200);
    expect(await adapter.listPaymentExceptions()).toHaveLength(1);
    expect((await adapter.getBooking(booking.id))?.status).toBe('pending_payment'); expect(await adapter.listOutbox()).toHaveLength(0);
    intent.amount_received = intent.amount; expect((await webhookRoute(signedEvent(intent, 'evt_corrected'))).status).toBe(200); expect(await adapter.listOutbox()).toHaveLength(2);
  });
  it('cancellation and a replacement hold win over the old payment confirmation and webhook', async () => {
    const original = (await reserve(await getQuote())).booking; const oldIntent = succeed(original.stripePaymentIntentId!);
    await adapter.cancelBooking(original.id);
    const replacement = (await reserve(await getQuote(), 'synthetic-replacement')).booking;
    expect((await confirmRoute(post('/confirm', { paymentIntentId: oldIntent.id }), context(original.id))).status).toBe(409);
    expect((await webhookRoute(signedEvent(oldIntent, 'evt_late_cancelled'))).status).toBe(200);
    expect((await adapter.getBooking(original.id))?.status).toBe('cancelled'); expect((await adapter.getBooking(replacement.id))?.status).toBe('pending_payment');
    expect(await adapter.listOutbox()).toHaveLength(0);
  });
  it('expired hold rejects late success without reopening inventory or sending a receipt', async () => {
    const { booking } = await reserve(await getQuote()); const intent = succeed(booking.stripePaymentIntentId!);
    vi.advanceTimersByTime(15 * 60_000 + 1);
    expect((await confirmRoute(post('/confirm', { paymentIntentId: intent.id }), context(booking.id))).status).toBe(409);
    expect((await adapter.getBooking(booking.id))?.status).toBe('cancelled');
    expect((await webhookRoute(signedEvent(intent, 'evt_late_expiry'))).status).toBe(200); expect(await adapter.listOutbox()).toHaveLength(0);
    const replacement = await reserve(await getQuote(), 'synthetic-after-expiry'); expect(replacement.booking.id).not.toBe(booking.id);
  });
  it('closed fulfillment records verified success durably and deduplicates retries without confirming', async () => {
    const {booking}=await reserve(await getQuote()); const intent=succeed(booking.stripePaymentIntentId!);
    vi.stubEnv('BOOKING_PAYMENT_MODE','closed');
    const response=await webhookRoute(signedEvent(intent,'evt_after_gate_close'));
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({reviewRequired:true});
    expect((await webhookRoute(signedEvent(intent,'evt_after_gate_close'))).status).toBe(200);
    const cases=await adapter.listPaymentExceptions();expect(cases).toHaveLength(1);expect(cases[0]).toMatchObject({reason:'launch_gate_closed',eventCount:1,attentionRequired:true});
    expect((await adapter.getBooking(booking.id))?.status).toBe('pending_payment');expect(await adapter.listOutbox()).toHaveLength(0);
  });
  it('retries a verified late event when durable review storage fails, then acknowledges after persistence', async () => {
    const {booking}=await reserve(await getQuote());const intent=succeed(booking.stripePaymentIntentId!);await adapter.cancelBooking(booking.id);
    const spy=vi.spyOn(adapter,'recordPaymentException').mockRejectedValueOnce(new Error('synthetic unavailable storage'));
    expect((await webhookRoute(signedEvent(intent,'evt_storage_retry'))).status).toBe(503);
    expect((await webhookRoute(signedEvent(intent,'evt_storage_retry'))).status).toBe(200);
    expect(await adapter.listPaymentExceptions()).toHaveLength(1);expect(await adapter.listOutbox()).toHaveLength(0);spy.mockRestore();
  });
  it('records unmatched property payments but not unrelated account payments',async()=>{
    const {booking}=await reserve(await getQuote());const intent={...succeed(booking.stripePaymentIntentId!),id:'pi_orphan_synthetic'};
    expect((await webhookRoute(signedEvent(intent,'evt_orphan'))).status).toBe(200);
    expect(await adapter.listPaymentExceptions()).toHaveLength(1);
    expect((await webhookRoute(signedEvent({...intent,id:'pi_other_account',metadata:{property_id:'other'}},'evt_unrelated'))).status).toBe(200);
    expect(await adapter.listPaymentExceptions()).toHaveLength(1);
  });
  it('a tampered unsigned webhook cannot mutate a legitimate pending booking', async () => {
    const { booking } = await reserve(await getQuote()); const intent = succeed(booking.stripePaymentIntentId!);
    const response = await webhookRoute(post('/api/webhooks/stripe', { type: 'payment_intent.succeeded', data: { object: intent } }));
    expect(response.status).toBe(400); expect((await adapter.getBooking(booking.id))?.status).toBe('pending_payment'); expect(await adapter.listOutbox()).toHaveLength(0);
  });
  it('preview overrides test configuration before provider calls or persisted state changes', async () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'true');
    expect((await quoteRoute(post('/api/quote', {}))).status).toBe(503);
    expect((await bookingRoute(post('/api/bookings', {}))).status).toBe(503);
    expect((await confirmRoute(post('/confirm', {}), context('synthetic-id'))).status).toBe(503);
    expect((await webhookRoute(post('/webhook', {}))).status).toBe(503);
    expect(provider.create).not.toHaveBeenCalled(); expect(provider.retrieve).not.toHaveBeenCalled(); expect(await adapter.listBookings()).toHaveLength(0); expect(await adapter.listOutbox()).toHaveLength(0);
  });
});
