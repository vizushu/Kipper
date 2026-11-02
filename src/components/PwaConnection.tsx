"use client";
import { useEffect, useState } from 'react';

/** Install support plus honest connection status; never queues booking requests. */
export default function PwaConnection() {
  const [status, setStatus] = useState<'online' | 'offline' | 'reconnected'>('online');
  useEffect(() => {
    if (!navigator.onLine) setStatus('offline');
    const offline = () => setStatus('offline');
    const online = () => setStatus('reconnected');
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // The online site remains usable if installation is unavailable.
      });
    }
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, []);
  if (status === 'online') return null;
  return <div role="status" aria-live="polite" className="border-b border-stone-200 bg-cream px-4 py-3 text-center text-sm text-ink">
    {status === 'offline' ? 'You’re offline. Booking and payments need an internet connection; nothing will be submitted automatically.' : 'Connection restored. Recheck availability and price before continuing your booking.'}
    {status === 'reconnected' && <button type="button" className="ml-3 min-h-11 underline underline-offset-4" onClick={() => setStatus('online')}>Dismiss</button>}
  </div>;
}
