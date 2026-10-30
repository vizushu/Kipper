import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import BookingAccessPage from '../src/app/booking-access/page';
import { createRecoveryClient, RECOVERY_REQUEST_NOTICE } from '../src/app/booking-access/recovery-client';
const token = 'synthetic-access-token';
const code = 'x'.repeat(43);
const booking = { reference: 'CP-SYNTHETIC', checkIn: '2027-02-20', checkOut: '2027-02-22', totalCents: 25000, currency: 'USD', status: 'confirmed', paymentStatus: 'paid_test', guest: { name: 'Private synthetic name', email: 'private@example.test' }, stripePaymentIntentId: 'pi_private', adminNotes: 'Private note', staySnapshot: { propertyName: 'Original property name', label: 'Accepted 3-bedroom accommodation', cancellationPolicy: 'Original accepted terms' } };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const successful = () => vi.fn<typeof fetch>().mockResolvedValueOnce(response({ reference: booking.reference, accessToken: token })).mockResolvedValueOnce(response({ booking }));
afterEach(() => vi.unstubAllEnvs());

describe('booking access server gate', () => {
  it('renders no forms or client UI in public preview despite contradictory recovery flags', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'true'); vi.stubEnv('BOOKING_RECOVERY_MODE', 'true'); vi.stubEnv('BOOKING_ACCESS_SECRET', 'synthetic'.repeat(8));
    const html = renderToStaticMarkup(<BookingAccessPage />);
    expect(html).toContain('No booking details or recovery codes are collected');
    expect(html).not.toMatch(/<form|<input|<textarea/);
  });
  it('fails closed when recovery or signing secret is missing', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'false'); vi.stubEnv('BOOKING_RECOVERY_MODE', 'false');
    expect(renderToStaticMarkup(<BookingAccessPage />)).not.toContain('<form');
    vi.stubEnv('BOOKING_RECOVERY_MODE', 'true'); vi.stubEnv('BOOKING_ACCESS_SECRET', '');
    expect(renderToStaticMarkup(<BookingAccessPage />)).not.toContain('<form');
  });
  it('renders two labelled, explicit forms only when recovery is enabled', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'false'); vi.stubEnv('BOOKING_RECOVERY_MODE', 'true'); vi.stubEnv('BOOKING_ACCESS_SECRET', 'synthetic'.repeat(8));
    const html = renderToStaticMarkup(<BookingAccessPage />);
    expect(html.match(/<form /g)).toHaveLength(2);
    expect(html).toContain('for="recovery-reference"'); expect(html).toContain('for="recovery-email"'); expect(html).toContain('for="recovery-code"');
    expect(html).toContain('type="password"'); expect(html).toContain('sm:grid-cols-2');
  });
});
describe('memory-only recovery controller', () => {
  it('uses generic request copy and does not render response payloads revealing match or guest data', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ message: 'Private synthetic detail' }, 202));
    const client = createRecoveryClient(fetcher, () => true); await client.requestAccess(' CP-SYNTHETIC ', ' synthetic@example.test ');
    expect(client.getState()).toEqual({ phase: 'requested', message: RECOVERY_REQUEST_NOTICE });
    expect(fetcher.mock.calls[0][0]).toBe('/api/bookings/recovery');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ reference: 'CP-SYNTHETIC', email: 'synthetic@example.test' });
  });
  it('exchanges by POST and loads the exact booking with Bearer auth, projecting only permitted summary fields', async () => {
    const fetcher = successful(); const client = createRecoveryClient(fetcher, () => true); await client.exchangeCode(code);
    expect(fetcher.mock.calls[0][0]).toBe('/api/bookings/recovery/exchange');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ token: code });
    expect(fetcher.mock.calls[1][0]).toBe('/api/bookings/ref/CP-SYNTHETIC');
    expect(fetcher.mock.calls[1][1]).toMatchObject({ headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', referrerPolicy: 'no-referrer' });
    expect(client.getState()).toMatchObject({ phase: 'ready', booking: { propertyName: 'Original property name', cancellationPolicy: 'Original accepted terms' } });
    const state = JSON.stringify(client.getState());
    for (const secret of [token, code, 'private@example.test', 'Private synthetic name', 'pi_private', 'Private note']) expect(state).not.toContain(secret);
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes('?'))).toBe(true);
  });
  it.each([400, 401, 404])('shows the same invalid/expired/used code error for status %s without provider details', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: 'Private backend details' }, status));
    const client = createRecoveryClient(fetcher, () => true); await client.exchangeCode(code);
    expect(client.getState()).toEqual({ phase: 'error', message: 'This code is invalid, expired or already used. Request a new code if needed.' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed codes locally and does not fetch', async () => {
    const fetcher = vi.fn<typeof fetch>(); const client = createRecoveryClient(fetcher, () => true); await client.exchangeCode('not-a-code');
    expect(fetcher).not.toHaveBeenCalled(); expect(client.getState().phase).toBe('error');
  });
  it('does not submit offline or automatically retry later', async () => {
    let online = false; const fetcher = successful(); const client = createRecoveryClient(fetcher, () => online);
    await client.exchangeCode(code); await client.requestAccess('CP-SYNTHETIC', 'synthetic@example.test'); online = true;
    expect(fetcher).not.toHaveBeenCalled(); expect(client.getState().message).toContain('Nothing is queued');
  });
  it('coalesces duplicate submit while a request is in flight', async () => {
    let resolve!: (response: Response) => void; const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(r => { resolve = r; }));
    const client = createRecoveryClient(fetcher, () => true); const first = client.requestAccess('CP-SYNTHETIC', 'synthetic@example.test');
    await client.requestAccess('CP-SYNTHETIC', 'synthetic@example.test'); await client.exchangeCode(code);
    expect(fetcher).toHaveBeenCalledTimes(1); resolve(response({}, 202)); await first;
  });
  it('clearing or disconnecting invalidates late responses and aborts the request', async () => {
    let resolve!: (response: Response) => void; const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(r => { resolve = r; }));
    const client = createRecoveryClient(fetcher, () => true); const request = client.exchangeCode(code); const signal = fetcher.mock.calls[0][1]!.signal!;
    client.disconnect(); resolve(response({ reference: booking.reference, accessToken: token })); await request;
    expect(signal.aborted).toBe(true); expect(fetcher).toHaveBeenCalledTimes(1); expect(client.getState().booking).toBeUndefined(); expect(client.getState().message).toContain('offline');
  });
  it('refuses a booking response for a different reference', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ reference: booking.reference, accessToken: token })).mockResolvedValueOnce(response({ booking: { ...booking, reference: 'CP-OTHER' } }));
    const client = createRecoveryClient(fetcher, () => true); await client.exchangeCode(code); expect(client.getState().phase).toBe('error'); expect(client.getState().booking).toBeUndefined();
  });
  it('a failed booking read never replays the consumed code or leaks the capability', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ reference: booking.reference, accessToken: token })).mockRejectedValueOnce(new Error('Private provider error'));
    const client = createRecoveryClient(fetcher, () => true); await client.exchangeCode(code);
    expect(fetcher).toHaveBeenCalledTimes(2); expect(client.getState().message).toContain('request a new code'); expect(JSON.stringify(client.getState())).not.toContain(token);
  });
  it('clear removes all displayed booking data', async () => {
    const client = createRecoveryClient(successful(), () => true); await client.exchangeCode(code); client.clear(); expect(client.getState()).toEqual({ phase: 'idle', message: '' });
  });
  it('UI/controller contain no URL navigation, persistent browser storage or logging', () => {
    const source = readFileSync('src/app/booking-access/BookingAccessClient.tsx', 'utf8') + readFileSync('src/app/booking-access/recovery-client.ts', 'utf8');
    expect(source).not.toMatch(/localStorage|sessionStorage|console\.|location\.(?:href|assign|replace)|router\.(?:push|replace)/);
    expect(source).toContain("visibilityState === 'hidden'"); expect(source).toContain("'pagehide'"); expect(source).toContain("'pageshow'"); expect(source).toContain("summaryHeading.current?.focus()");
  });
});
