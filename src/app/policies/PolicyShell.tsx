/**
 * PolicyShell — shared layout for the draft policy pages.
 * Every policy page is visibly marked as a draft under Renier's review.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { SampleBadge } from "@/components/ui";

export function PolicyShell({
  title,
  updated,
  children,
  draft = true,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  draft?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-ink hover:underline underline-offset-4">
          Home
        </Link>{" "}
        / <span className="text-ink">{title}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="casa-page-heading">{title}</h1>
        {draft && <SampleBadge />}
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {draft ? "Draft — under Renier’s review" : "Cancellation refund schedule confirmed"} · Last updated {updated}
      </p>
      <div className="prose-policy mt-6 space-y-4 text-[15px] leading-relaxed text-stone-600 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
      <p className="mt-10 rounded-2xl bg-cream px-5 py-4 text-sm text-stone-600">
        Questions about these policies?{" "}
        <Link href="/faq" className="font-medium text-clay underline-offset-4 hover:underline">
          See the FAQ
        </Link>{" "}
        or message the Casa Pacifica booking contact after booking.
      </p>
    </div>
  );
}
