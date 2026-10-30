/** Memory-only recovery flow. Never writes credentials or booking details to URL/storage/logs. */
export interface RecoveredBooking {
  reference: string; propertyName: string; accommodation: string; checkIn: string; checkOut: string;
  totalCents: number; status: 'pending_payment' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid_test' | 'paid' | 'failed' | 'refunded'; cancellationPolicy: string;
}
export type RecoveryView = { phase: 'idle' | 'requesting' | 'requested' | 'verifying' | 'ready' | 'error'; message: string; booking?: RecoveredBooking };
export const INITIAL_RECOVERY_VIEW: RecoveryView = { phase: 'idle', message: '' };
export const RECOVERY_REQUEST_NOTICE = 'If those details match a booking, recovery instructions will be prepared. Delivery depends on the configured recovery service; this response is not a delivery confirmation. This response does not confirm whether a booking exists.';
const INVALID_CODE = 'This code is invalid, expired or already used. Request a new code if needed.';
const CONNECTION_ERROR = 'Access could not be verified. Reconnect, then request a new code if your previous code was already used. Nothing will retry automatically.';
function shortText(value: unknown, fallback: string, max = 200): string { return typeof value === 'string' && value.length > 0 && value.length <= max ? value : fallback; }
function bookingProjection(value: unknown, reference: string): RecoveredBooking {
  if (!value || typeof value !== 'object') throw new Error('Invalid booking response');
  const b = value as Record<string, unknown>;
  if (b.reference !== reference || typeof b.checkIn !== 'string' || typeof b.checkOut !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(b.checkOut) ||
      !Number.isSafeInteger(b.totalCents) || (b.totalCents as number) < 0 || b.currency !== 'USD' ||
      !['pending_payment','confirmed','cancelled'].includes(String(b.status)) ||
      !['unpaid','paid_test','paid','failed','refunded'].includes(String(b.paymentStatus))) throw new Error('Invalid booking response');
  const snapshot = b.staySnapshot && typeof b.staySnapshot === 'object' ? b.staySnapshot as Record<string, unknown> : {};
  return { reference, propertyName: shortText(snapshot.propertyName, 'Your booked accommodation'),
    accommodation: shortText(snapshot.label, 'Consult your original confirmation'), checkIn: b.checkIn, checkOut: b.checkOut,
    totalCents: b.totalCents as number, status: b.status as RecoveredBooking['status'], paymentStatus: b.paymentStatus as RecoveredBooking['paymentStatus'],
    cancellationPolicy: shortText(snapshot.cancellationPolicy, 'Consult your original confirmation for the accepted cancellation terms.', 4000) };
}
export function createRecoveryClient(fetcher: typeof fetch, isOnline: () => boolean) {
  let view: RecoveryView = INITIAL_RECOVERY_VIEW;
  let generation = 0;
  let pending: AbortController | undefined;
  const subscribers = new Set<(state: RecoveryView) => void>();
  function publish(next: RecoveryView) { view = next; subscribers.forEach(listener => listener(next)); }
  function clear() { generation++; pending?.abort(); pending = undefined; publish(INITIAL_RECOVERY_VIEW); }
  function disconnect() { clear(); publish({ phase: 'error', message: 'You’re offline. Reconnect before requesting or entering a code. Nothing is queued to submit later.' }); }
  function begin(phase: 'requesting' | 'verifying') {
    if (pending) return null;
    if (!isOnline()) { disconnect(); return null; }
    const id = ++generation; pending = new AbortController(); publish({ phase, message: '' });
    return { id, signal: pending.signal };
  }
  function current(id: number) { return id === generation && isOnline(); }
  return {
    subscribe(listener: (state: RecoveryView) => void) { subscribers.add(listener); listener(view); return () => { subscribers.delete(listener); }; },
    getState: () => view,
    clear, disconnect,
    async requestAccess(reference: string, email: string) {
      const request = begin('requesting'); if (!request) return;
      try {
        const response = await fetcher('/api/bookings/recovery', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: reference.trim(), email: email.trim() }), cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: request.signal });
        if (!current(request.id)) return;
        // Deliberately never render backend text/details or distinguish match vs miss.
        publish(response.status === 202 ? { phase: 'requested', message: RECOVERY_REQUEST_NOTICE } : { phase: 'error', message: 'Booking access recovery is unavailable right now. No booking details can be confirmed here.' });
      } catch { if (current(request.id)) publish({ phase: 'error', message: CONNECTION_ERROR }); }
      finally { if (request.id === generation) pending = undefined; }
    },
    async exchangeCode(code: string) {
      const request = begin('verifying'); if (!request) return;
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(code.trim())) { publish({ phase: 'error', message: INVALID_CODE }); return; }
        const response = await fetcher('/api/bookings/recovery/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: code.trim() }), cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: request.signal });
        if (!current(request.id)) return;
        if (!response.ok) { publish({ phase: 'error', message: response.status === 503 ? 'Booking access recovery is not enabled.' : INVALID_CODE }); return; }
        const result: unknown = await response.json();
        if (!current(request.id)) return;
        const access = result as {reference?:unknown;accessToken?:unknown};
        if (!access || typeof access.reference !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(access.reference) || typeof access.accessToken !== 'string' || access.accessToken.length > 2048 || !access.accessToken.length) throw new Error('Invalid access response');
        // Capability exists only within this call; never returned to UI state or navigation.
        const bookingResponse = await fetcher(`/api/bookings/ref/${encodeURIComponent(access.reference)}`, { headers: { Authorization: `Bearer ${access.accessToken}` }, cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: request.signal });
        if (!current(request.id)) return;
        if (!bookingResponse.ok) { publish({ phase: 'error', message: INVALID_CODE }); return; }
        const body: unknown = await bookingResponse.json();
        if (!current(request.id)) return;
        const booking = bookingProjection((body as { booking?: unknown })?.booking, access.reference);
        publish({ phase: 'ready', message: 'Booking details verified for this session.', booking });
      } catch { if (current(request.id)) publish({ phase: 'error', message: CONNECTION_ERROR }); }
      finally { if (request.id === generation) pending = undefined; }
    },
  };
}
