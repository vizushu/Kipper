"use client";
/**
 * Site footer: contact, policies, FAQ, legal.
 * Policy pages are marked as drafts pending Renier's review.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPin } from "@/components/icons";

const POLICY_LINKS = [
  { href: "/policies/cancellation", label: "Cancellation policy" },
  { href: "/policies/terms", label: "Terms of stay" },
  { href: "/policies/privacy", label: "Privacy policy" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-stone-200 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-xl font-medium text-ink">Kipper Property Management</p>
            <p className="mt-1 text-sm text-stone-500">
              Independent San Diego hosting — book direct
            </p>
            <address className="mt-4 flex items-start gap-2 text-sm not-italic leading-relaxed text-stone-600">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                Mira Mesa
                <br />
                San Diego, CA 92126 · Mira Mesa
              </span>
            </address>
            <p className="mt-4 text-sm text-stone-600">
              Questions about a stay? Your host, <strong className="font-medium text-ink">Kipper</strong>,
              can help with questions about the accommodation.
            </p>
          </div>
          <nav aria-label="Policies">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Policies
            </p>
            <ul className="mt-3 space-y-2">
              {POLICY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <span className="text-xs text-stone-500">Cancellation schedule confirmed. Terms of stay and privacy wording remain under review.</span>
            </p>
          </nav>
          <nav aria-label="Explore">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Explore
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/properties" className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline">
                  Browse stays
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline">
                  About Kipper
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline">
                  Frequently asked questions
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-stone-600 underline-offset-4 hover:text-ink hover:underline">
                  Why book direct
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-stone-300/60 pt-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Kipper Property Management. All rights reserved.</p>
          <p>San Diego STRO Tier-2 License STR-13982L · TOT 660372</p>
        </div>
      </div>
    </footer>
  );
}
