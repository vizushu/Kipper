'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function AdminLogout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  async function logout() {
    setBusy(true); setError(false);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign-out failed');
      router.replace('/admin/login'); router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={logout} className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-cream">{busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert" className="text-xs text-red-700">Sign-out failed. Please retry.</p>}</div>;
}
