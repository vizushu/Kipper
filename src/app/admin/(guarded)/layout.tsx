/**
 * Admin layout — guards every /admin/* route except /admin/login.
 *
 * Session check: GET /api/admin/session (backend-owned) with the request
 * cookies forwarded. Any non-OK response redirects to /admin/login.
 * Guests must never reach admin pages.
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

async function isAuthenticated(): Promise<boolean> {
  try {
    const h = await headers();
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${base}/api/admin/session`, {
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

const NAV = [
  { href: "/admin", label: "Reservations" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/rates", label: "Rates" },
  { href: "/admin/properties", label: "Properties" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-display text-lg font-medium text-ink">
            Casa Pacifica <span className="text-sm font-normal text-stone-500">· Host admin</span>
          </p>
          <nav className="flex items-center gap-1" aria-label="Admin">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-cream hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
