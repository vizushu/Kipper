'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { formatCents } from '@/lib/types';
import { createRecoveryClient, INITIAL_RECOVERY_VIEW, type RecoveryView } from './recovery-client';
const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-clay';

export default function BookingAccessClient() {
  const [client] = useState(() => createRecoveryClient((...args) => fetch(...args), () => typeof navigator !== 'undefined' && navigator.onLine));
  const [state, setState] = useState<RecoveryView>(INITIAL_RECOVERY_VIEW);
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const unsubscribe = client.subscribe(setState);
    const clear = () => { client.clear(); setReference(''); setEmail(''); setCode(''); };
    const offline = () => { client.disconnect(); setReference(''); setEmail(''); setCode(''); };
    const visibility = () => { if (document.visibilityState === 'hidden') clear(); };
    window.addEventListener('offline', offline); window.addEventListener('pagehide', clear); window.addEventListener('pageshow', clear); document.addEventListener('visibilitychange', visibility);
    return () => { unsubscribe(); client.clear(); window.removeEventListener('offline', offline); window.removeEventListener('pagehide', clear); window.removeEventListener('pageshow', clear); document.removeEventListener('visibilitychange', visibility); };
  }, [client]);
  useEffect(() => { if (state.phase === 'ready') { setReference(''); setEmail(''); setCode(''); summaryHeading.current?.focus(); } }, [state.phase]);
  const busy = state.phase === 'requesting' || state.phase === 'verifying';
  const booking = state.booking;
  return <div className="mt-6">
    <p className="text-sm leading-relaxed text-stone-600">Use the reference and email from your original confirmation, or enter a single-use recovery code. Codes expire after 15 minutes. Keep your code private.</p>
    <p className="mt-3 text-xs leading-relaxed text-stone-500">Details are held only in this page’s memory and cleared when you hide or leave it. Nothing is stored for offline access or submitted automatically.</p>
    <div role={state.phase === 'error' ? 'alert' : 'status'} aria-live="polite" className="mt-5 text-sm leading-relaxed text-stone-600">{state.message}</div>
    {booking ? <section aria-labelledby="recovered-booking" className="mt-6 rounded-xl border border-stone-300 bg-[#fffcf6] p-6">
      <h2 ref={summaryHeading} tabIndex={-1} id="recovered-booking" className="font-display text-2xl font-medium">{booking.propertyName}</h2>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-stone-500">Reference</dt><dd>{booking.reference}</dd></div>
        <div><dt className="text-stone-500">Booking status</dt><dd>{booking.status === 'confirmed' ? 'Confirmed' : booking.status === 'cancelled' ? 'Cancelled' : 'Pending payment — not confirmed'}</dd></div>
        <div><dt className="text-stone-500">Accepted accommodation</dt><dd>{booking.accommodation}</dd></div>
        <div><dt className="text-stone-500">Stay dates</dt><dd>{booking.checkIn} to {booking.checkOut}</dd></div>
        <div><dt className="text-stone-500">Recorded total</dt><dd>{formatCents(booking.totalCents)}</dd></div>
        <div><dt className="text-stone-500">Recorded payment status</dt><dd>{booking.paymentStatus === 'paid_test' ? 'Test payment recorded — not a real charge' : booking.paymentStatus}</dd></div>
      </dl>
      <h3 className="mt-6 font-medium">Accepted cancellation terms</h3><p className="mt-2 text-sm leading-relaxed text-stone-600">{booking.cancellationPolicy}</p>
      <p className="mt-4 text-xs text-stone-500">This page cannot cancel a stay, issue a refund, or display entry credentials. Contact the verified host for changes.</p>
      <Button className="mt-6" variant="secondary" onClick={() => client.clear()}>Clear booking details</Button>
    </section> : <div className="mt-6 grid gap-6">
      <form onSubmit={event => { event.preventDefault(); if (!busy) void client.requestAccess(reference, email); }} className="rounded-xl border border-stone-300 bg-[#fffcf6] p-5">
        <h2 className="font-display text-2xl font-normal">Request a code</h2>
        <label className="mt-5 block text-sm font-medium" htmlFor="recovery-reference">Booking reference<input id="recovery-reference" name="reference" className={inputClass} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={64} required value={reference} onChange={event => setReference(event.target.value)} disabled={busy} /></label>
        <label className="mt-4 block text-sm font-medium" htmlFor="recovery-email">Booking email<input id="recovery-email" name="email" type="email" className={inputClass} autoComplete="off" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
        <Button type="submit" className="mt-5 w-full" disabled={busy}>{state.phase === 'requesting' ? 'Preparing request…' : 'Request access code'}</Button>
      </form>
      <form onSubmit={event => { event.preventDefault(); if (!busy) { const submitted = code; setCode(''); void client.exchangeCode(submitted); } }} className="rounded-xl border border-stone-300 bg-cream p-5">
        <h2 className="font-display text-2xl font-normal">Already have a code?</h2>
        <label className="mt-5 block text-sm font-medium" htmlFor="recovery-code">Recovery code<input id="recovery-code" name="code" type="password" className={inputClass} autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={43} maxLength={43} required value={code} onChange={event => setCode(event.target.value)} disabled={busy} /></label>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">Paste the complete code. It is exchanged once; it will not be added to the page address.</p>
        <Button type="submit" className="mt-5 w-full" disabled={busy}>{state.phase === 'verifying' ? 'Verifying…' : 'View my booking'}</Button>
      </form>
    </div>}
  </div>;
}
