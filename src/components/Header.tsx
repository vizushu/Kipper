"use client";
/**
 * Site header: brand + primary nav + availability CTA.
 * Sticky, paper background, subtle bottom border.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/cn";
import { Button } from "@/components/ui";
import { IconMenu, IconX } from "@/components/icons";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Stays" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Kipper Property Management home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-paper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden className="h-5 w-5">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-medium text-ink">Kipper</span>
        <span className="block text-[11px] uppercase tracking-[0.12em] text-stone-500">
          Property Management
        </span>
      </span>
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null; // admin has its own chrome

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-cream text-ink"
                  : "text-stone-600 hover:bg-cream hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/properties" className="ml-2">
            <Button size="sm">Check availability</Button>
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/properties">
            <Button size="sm">Book</Button>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-xl p-2 text-ink hover:bg-cream"
          >
            {open ? <IconX className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-stone-200 bg-paper px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-4 py-3 text-base font-medium",
                pathname === item.href ? "bg-cream text-ink" : "text-stone-600",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
