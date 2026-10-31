"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function Footer() {
  const pathname=usePathname();
  if(pathname.startsWith("/admin")) return null;
  return <footer className="border-t border-line bg-paper px-5 pb-28 pt-7 text-xs text-moss"><div className="mx-auto max-w-[816px]">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3"><p>Casa Pacifica · A little more room to unwind.</p><nav aria-label="Footer" className="flex flex-wrap gap-4"><Link href="/properties" className="py-2 underline underline-offset-4">Plan your stay</Link><Link href="/booking-access" className="py-2 underline underline-offset-4">Your booking</Link><Link href="/contact" className="py-2 underline underline-offset-4">Ask Kipper <span aria-hidden="true">↗</span></Link></nav></div>
    <details className="mt-4"><summary className="w-fit cursor-pointer py-2">Policies &amp; property information</summary><div className="mt-3 space-y-3 leading-6"><nav aria-label="Policies" className="flex flex-wrap gap-4"><Link href="/policies/cancellation" className="underline">Cancellation policy</Link><Link href="/policies/terms" className="underline">Terms of stay</Link><Link href="/policies/privacy" className="underline">Privacy policy</Link><Link href="/faq" className="underline">Frequently asked questions</Link></nav><p>Cancellation schedule confirmed. Terms of stay and privacy wording remain under review.</p><p>Casa Pacifica property · San Diego STRO Tier-2 License STR-13982L · TOT 660372</p><p>Kipper concierge AI is in development. This Casa Pacifica preview does not accept reservations or payments.</p><p>© 2026 Casa Pacifica.</p></div></details>
  </div></footer>;
}
