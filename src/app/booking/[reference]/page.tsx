import { bookingStatusHeading } from "@/lib/booking-flow-state";
import { cookies } from "next/headers";
import { BOOKING_SESSION_COOKIE } from "@/lib/booking-session";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, DetailRow } from "@/components/ui";
import { IconCheck, IconKey } from "@/components/icons";
import { getBookingByReference } from "@/data/api";
import { formatCents } from "@/lib/types";
import { guestSummary } from "@/components/GuestSelector";

export const metadata: Metadata = {
  title: "Booking confirmation",
  description: "Your Casa Pacifica booking confirmation and arrival details.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const token = (await cookies()).get(BOOKING_SESSION_COOKIE)?.value;
  if (!token) notFound();
  const booking = await getBookingByReference(reference, token);
  if (!booking) notFound();

  const snapshot = booking.staySnapshot;
  const originalTerms = "Consult your original confirmation for the agreed terms.";
  const propertyName = snapshot?.propertyName ?? "Your booked property (see original confirmation)";

  const statusTone =
    booking.status === "confirmed" && ["paid", "paid_test"].includes(booking.paymentStatus) ? "moss" : booking.status === "cancelled" ? "clay" : "stone";
  const statusLabel =
    booking.status === "confirmed"
      ? booking.paymentStatus === "paid_test" || booking.paymentMode !== "live" ? "Test confirmation" : booking.paymentStatus === "paid" ? "Confirmed" : "Payment review"
      : booking.status === "cancelled"
        ? "Cancelled"
        : "Pending payment";

  return (
    <div className="mx-auto max-w-[590px] px-5 py-10 pb-20 sm:px-8">
      <div className="text-center" data-booking-status={booking.status}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss/10 text-moss">
          <IconCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-4xl font-normal tracking-tight text-ink">
          {bookingStatusHeading(booking)}
        </h1>
        <p className="mt-2 text-stone-600">
          Guest contact: {booking.guest.email}.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Badge tone="cream" className="px-4 py-1.5 font-mono text-sm tracking-widest">
            {booking.reference}
          </Badge>
          <Badge tone={statusTone as "moss" | "clay" | "stone"}>{statusLabel}</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <Card className="rounded-xl border-stone-300 bg-[#fffcf6] p-5 shadow-none sm:p-6">
          <h2 className="font-display text-2xl font-normal text-ink">Your stay</h2>
          <dl className="mt-2 divide-y divide-stone-100">
            <DetailRow label="Property" value={propertyName} />
            <DetailRow label="Check-in" value={`${fmtDate(booking.checkIn)} · ${snapshot ? `from ${snapshot.checkInTime}` : originalTerms}`} />
            <DetailRow label="Check-out" value={`${fmtDate(booking.checkOut)} · ${snapshot ? `by ${snapshot.checkOutTime}` : originalTerms}`} />
            <DetailRow
              label="Guests"
              value={`${guestSummary(booking.guests)}${booking.pets > 0 ? ` · ${booking.pets} pet` : ""}`}
            />
            <DetailRow label="Nights" value={booking.nights} />
          </dl>
        </Card>

        <Card className="rounded-xl border-stone-300 bg-[#fffcf6] p-5 shadow-none sm:p-6">
          <h2 className="font-display text-2xl font-normal text-ink">Payment summary</h2>
          <dl className="mt-2 divide-y divide-stone-100">
            {booking.lineItems.map((item, i) => (
              <DetailRow
                key={`${item.label}-${i}`}
                label={item.label}
                value={`${item.amountCents < 0 ? "−" : ""}${formatCents(Math.abs(item.amountCents))}`}
              />
            ))}
            <div className="flex items-center justify-between py-3">
              <dt className="text-base font-semibold text-ink">Booking total</dt>
              <dd className="text-xl font-semibold text-ink">{formatCents(booking.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-stone-500">
            Payment status: {booking.paymentStatus === "paid_test" ? "Paid (test mode)" : booking.paymentStatus}
          </p>
        </Card>

        <Card className="rounded-xl border-stone-300 bg-[#fffcf6] p-5 shadow-none sm:p-6">
          <h2 className="font-display text-2xl font-normal text-ink">Arrival info</h2>
          <p className="mt-3 flex gap-3 text-sm text-stone-600">
            <IconKey className="h-4 w-4 shrink-0 text-clay" />
            Arrival instructions and access details are shared privately by your host. Consult your original confirmation.
          </p>
          {snapshot?.houseRules && <ul className="mt-3 list-disc pl-5 text-sm text-stone-600">
            {snapshot.houseRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>}

        </Card>

        <Card className="rounded-xl border-stone-300 bg-[#fffcf6] p-5 shadow-none sm:p-6">
          <h2 className="font-display text-2xl font-normal text-ink">Cancellation terms</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {snapshot?.cancellationPolicy ?? originalTerms}
          </p>
        </Card>

        <div className="rounded-2xl bg-cream px-6 py-5 text-center">
          <p className="text-sm text-stone-600">
            For changes to an existing stay, consult the verified host contact in your original confirmation.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="secondary">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
