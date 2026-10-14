import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, DetailRow } from "@/components/ui";
import { IconCheck, IconClock, IconKey, IconMoon, IconPin, IconWifi } from "@/components/icons";
import { getBookingByReference, getProperty } from "@/data/api";
import { formatCents } from "@/lib/types";
import { guestSummary } from "@/components/GuestSelector";

export const metadata: Metadata = {
  title: "Booking confirmation",
  description: "Your Casa Pacifica booking confirmation and arrival details.",
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
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();

  const property = await getProperty("casa-pacifica-san-diego");
  const propertyName = property?.name ?? "Casa Pacifica";
  const propertyAddress = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : "10840 New Salem Point, San Diego, CA 92126";

  const statusTone =
    booking.status === "confirmed" ? "moss" : booking.status === "cancelled" ? "clay" : "stone";
  const statusLabel =
    booking.status === "confirmed"
      ? "Confirmed"
      : booking.status === "cancelled"
        ? "Cancelled"
        : "Pending payment";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss/10 text-moss">
          <IconCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-medium text-ink">
          You're booked{booking.guest.name ? `, ${booking.guest.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-2 text-stone-600">
          A confirmation email is on its way to {booking.guest.email}.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Badge tone="cream" className="px-4 py-1.5 font-mono text-sm tracking-widest">
            {booking.reference}
          </Badge>
          <Badge tone={statusTone as "moss" | "clay" | "stone"}>{statusLabel}</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <Card className="p-6">
          <h2 className="font-display text-xl font-medium text-ink">Your stay</h2>
          <dl className="mt-2 divide-y divide-stone-100">
            <DetailRow label="Property" value={propertyName} />
            <DetailRow label="Check-in" value={`${fmtDate(booking.checkIn)} · from 3:00 PM`} />
            <DetailRow label="Check-out" value={`${fmtDate(booking.checkOut)} · by 11:00 AM`} />
            <DetailRow
              label="Guests"
              value={`${guestSummary(booking.guests)}${booking.pets > 0 ? ` · ${booking.pets} pet` : ""}`}
            />
            <DetailRow label="Nights" value={booking.nights} />
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-medium text-ink">Payment summary</h2>
          <dl className="mt-2 divide-y divide-stone-100">
            {booking.lineItems.map((item, i) => (
              <DetailRow
                key={`${item.label}-${i}`}
                label={item.label}
                value={`${item.amountCents < 0 ? "−" : ""}${formatCents(Math.abs(item.amountCents))}`}
              />
            ))}
            <div className="flex items-center justify-between py-3">
              <dt className="text-base font-semibold text-ink">Total paid</dt>
              <dd className="text-xl font-semibold text-ink">{formatCents(booking.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-stone-500">
            Payment status: {booking.paymentStatus === "paid_test" ? "Paid (test mode)" : booking.paymentStatus}
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-medium text-ink">Arrival info</h2>
          <ul className="mt-3 space-y-3 text-sm text-stone-600">
            <li className="flex items-start gap-3">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <strong className="font-medium text-ink">Address:</strong> {propertyAddress}
                <br />
                Mira Mesa, San Diego — private entrance, driveway parking.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <IconKey className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <strong className="font-medium text-ink">Check-in from 3:00 PM:</strong> self
                check-in with the smart lock. Your entry code is sent by email before arrival.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <strong className="font-medium text-ink">Check-out by 11:00 AM.</strong> Checkout
                instructions are in your confirmation email.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <IconWifi className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <strong className="font-medium text-ink">Wifi:</strong> network{" "}
                <span className="font-mono">RTN</span> · password{" "}
                <span className="font-mono">qwertyuiop</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <IconMoon className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <strong className="font-medium text-ink">Quiet hours</strong> are 10:00 PM – 8:00 AM.
                No parties or events; no smoking or vaping anywhere on the property.
              </span>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-medium text-ink">Cancellation terms</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {property?.cancellationPolicy ??
              "Firm: full refund 30+ days before check-in, 50% refund 14–30 days before, no refund within 14 days."}{" "}
            <Link href="/policies/cancellation" className="font-medium text-clay underline-offset-4 hover:underline">
              Full policy
            </Link>
          </p>
        </Card>

        <div className="rounded-2xl bg-cream px-6 py-5 text-center">
          <p className="text-sm text-stone-600">
            Need to change something? Your host <strong className="font-medium text-ink">Kipper</strong> is
            one message away — reply to your confirmation email and we'll sort it out.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="secondary">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
