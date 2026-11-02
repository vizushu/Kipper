import type { ReactNode } from "react";
import Link from "next/link";
import { BackLink } from "@/components/BackControl";

/** Approved prelaunch SMS disclosures, separate from draft lodging terms. */
export default function SmsPolicyShell({ title, children }: { title: string; children: ReactNode }) {
  return <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
    <BackLink href="/contact" className="mb-5"/>
    <p className="casa-eyebrow mb-3">Casa Pacifica / Ask Kipper · SMS support</p>
    <h1 className="casa-page-heading">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-moss">Prelaunch disclosures · Updated October 31, 2026. SMS support is not available yet.</p>
    <div className="mt-7 space-y-4 text-sm leading-7 text-moss [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:text-ink [&_a]:underline [&_a]:underline-offset-4">{children}</div>
    <nav aria-label="SMS policies" className="mt-8 flex flex-wrap gap-5 border-t border-line pt-5 text-sm">
      <Link href="/policies/sms-privacy" className="min-h-11 py-3 underline underline-offset-4">SMS Privacy Policy</Link>
      <Link href="/policies/sms-terms" className="min-h-11 py-3 underline underline-offset-4">SMS Terms &amp; Conditions</Link>
    </nav>
  </article>;
}
