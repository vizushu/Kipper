import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPaymentIntent, verifyPaymentIntent } from '../src/lib/stripe';
import { LIVE_APPROVAL_FLAGS } from '../src/lib/payment-mode';
import type { Quote } from '../src/lib/types';

const transport = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));
vi.mock('stripe', () => ({ default: class { paymentIntents = transport; } }));
const quote = { paymentMode: 'live', totalCents: 50000, currency: 'USD', propertyId: 'casa-pacifica', checkIn: '2027-02-20', checkOut: '2027-02-22' } as Quote;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SITE_PREVIEW_MODE', 'false');
  vi.stubEnv('BOOKING_PAYMENT_MODE', 'closed');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_synthetic_only');
  transport.retrieve.mockResolvedValue({ id: 'pi_synthetic', status: 'succeeded', amount: 50000, amount_received: 50000, currency: 'usd', livemode: true, metadata: { mode: 'live' } });
});
afterEach(() => vi.unstubAllEnvs());
describe('read-only payment evidence after booking closure', () => {
  it('retrieves evidence without reopening creation or fulfilling a reservation', async () => {
    const evidence = await verifyPaymentIntent('pi_synthetic', 'live');
    expect(evidence).toMatchObject({ id: 'pi_synthetic', amountReceivedCents: 50000, livemode: true });
    expect(transport.retrieve).toHaveBeenCalledExactlyOnceWith('pi_synthetic');
    await expect(createPaymentIntent(quote, 'synthetic', 'booking_synthetic')).rejects.toThrow('not approved');
    expect(transport.create).not.toHaveBeenCalled();
  });
  it('does not require current approval flags for read-only evidence', async () => {
    vi.stubEnv('BOOKING_PAYMENT_MODE', 'live');
    for (const flag of LIVE_APPROVAL_FLAGS) vi.stubEnv(flag, 'false');
    await expect(verifyPaymentIntent('pi_synthetic', 'live')).resolves.toHaveProperty('id', 'pi_synthetic');
    await expect(createPaymentIntent(quote, 'synthetic', 'booking_synthetic')).rejects.toThrow('not approved');
  });
  it('still blocks all provider access in public preview', async () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'true');
    await expect(verifyPaymentIntent('pi_synthetic', 'live')).rejects.toThrow('public preview');
    await expect(createPaymentIntent(quote, 'synthetic', 'booking_synthetic')).rejects.toThrow('public preview');
    expect(transport.retrieve).not.toHaveBeenCalled();
    expect(transport.create).not.toHaveBeenCalled();
  });
  it('requires a key matching the stored booking mode even after closure', async () => {
    await expect(verifyPaymentIntent('pi_synthetic', 'test')).rejects.toThrow('mode does not match');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    await expect(verifyPaymentIntent('pi_synthetic', 'live')).rejects.toThrow('mode does not match');
    expect(transport.retrieve).not.toHaveBeenCalled();
  });
  it('permits creation only under the complete explicit live contract (mock transport)', async () => {
    vi.stubEnv('BOOKING_PAYMENT_MODE', 'live');
    for (const flag of LIVE_APPROVAL_FLAGS) vi.stubEnv(flag, 'true');
    vi.stubEnv('INVENTORY_POLICY', 'exclusive_direct');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_synthetic_only');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_synthetic_only');
    transport.create.mockResolvedValue({ id: 'pi_synthetic', client_secret: 'synthetic_only', amount: 50000, status: 'requires_payment_method' });
    await expect(createPaymentIntent(quote, 'synthetic', 'booking_synthetic')).resolves.toHaveProperty('id', 'pi_synthetic');
    expect(transport.create.mock.calls[0][0].metadata.mode).toBe('live');
    expect(transport.create.mock.calls[0][0].payment_method_types).toEqual(['card']);
    expect(transport.create.mock.calls[0][0]).not.toHaveProperty('automatic_payment_methods');
    expect(transport.retrieve).not.toHaveBeenCalled();
  });
});
