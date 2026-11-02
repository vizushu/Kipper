"use client";
import Link from "next/link";
import { IconArrowUpRight } from "@/components/icons";
import { usePathname } from "next/navigation";

export default function Header({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <header className="sticky top-0 z-40 border-b border-line bg-paper">
    <div className="mx-auto flex min-h-[74px] max-w-[1120px] items-center justify-between gap-3 px-[22px] py-3 sm:min-h-20 sm:px-7">
      <Link href="/" onClick={onNavigate} aria-label="Casa Pacifica home" className="leading-tight"><span className="block font-display text-[27px] tracking-[-1px]">casa pacifica</span><span className="mt-1 block text-[9px] uppercase tracking-[2.1px] text-moss">Mira Mesa · San Diego</span></Link>
      <nav aria-label="Primary" className="flex items-center gap-2"><Link href="/contact" onClick={onNavigate} className="flex min-h-11 items-center px-2 text-sm underline-offset-4 hover:underline">Ask Kipper <IconArrowUpRight className="ml-1 inline h-4 w-4 align-middle"/></Link></nav>
    </div>

  </header>;
}
