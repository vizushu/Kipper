import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { isPublicPreview } from "@/lib/booking-launch";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your Casa Pacifica stay and pay securely.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  if (isPublicPreview()) return <section className="mx-auto max-w-[590px] px-5 py-12 sm:px-8"><p className="mb-4 text-xs uppercase tracking-[0.18em] text-stone-500">Your stay · Checkout</p><h1 className="font-display text-4xl font-normal tracking-tight">Checkout is disabled in this preview</h1><p className="mt-5 text-sm leading-relaxed text-stone-600">Explore the website without entering personal or payment information. No booking or payment can be submitted here.</p><a href="/properties" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Explore stays</a></section>;
  return <CheckoutClient />;
}
