"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconMenu, IconX } from "@/components/icons";

const NAV = [{ href: "/", label: "The home" }, { href: "/properties", label: "Plan a stay" }, { href: "/booking-access", label: "Find your booking" }, { href: "/contact", label: "Contact" }, { href: "/faq", label: "Questions" }];
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  if (pathname.startsWith("/admin")) return null;
  return <header className="sticky top-0 z-40 border-b border-line bg-paper">
    <div className="mx-auto flex min-h-[74px] max-w-[1120px] items-center justify-between gap-3 px-[22px] py-3 sm:min-h-20 sm:px-7">
      <Link href="/" aria-label="Casa Pacifica home" className="leading-tight"><span className="block font-display text-[27px] tracking-[-1px]">casa pacifica</span><span className="mt-1 block text-[9px] uppercase tracking-[2.1px] text-moss">Mira Mesa · San Diego</span></Link>
      <nav aria-label="Primary" className="flex items-center gap-2"><Link href="/contact" className="flex min-h-11 items-center px-2 text-sm underline-offset-4 hover:underline">Ask Kipper</Link><button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-menu" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream">{open ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}</button></nav>
    </div>
    {open && <nav id="site-menu" aria-label="Site menu" className="border-t border-line bg-paper px-5 py-3"><div className="mx-auto max-w-[1064px]">{NAV.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-cream" aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</div></nav>}
  </header>;
}
