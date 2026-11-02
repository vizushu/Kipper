/**
 * /admin — reservations table: upcoming + past, status + payment status + totals.
 */
import { Badge, EmptyState } from "@/components/ui";
import { formatCents, type Booking } from "@/lib/types";
import { getAdminBookings } from "./admin-api";
import CancellationReview from "./CancellationReview";

export const metadata = { title: "Reservations · Admin", robots: { index: false } };

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_TONE: Record<Booking["status"], "moss" | "clay" | "stone"> = {
  confirmed: "moss",
  cancelled: "clay",
  pending_payment: "stone",
};

export default async function AdminReservationsPage() {
  const bookings = await getAdminBookings();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => b.checkOut >= today && b.status !== "cancelled")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = bookings
    .filter((b) => b.checkOut < today || b.status === "cancelled")
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Reservations</h1>
      <p className="mt-1 text-sm text-stone-500">
        {bookings.length} total booking{bookings.length === 1 ? "" : "s"}
      </p>

      <Section title={`Upcoming (${upcoming.length})`} bookings={upcoming} empty="No upcoming reservations." />
      <Section title={`Past & cancelled (${past.length})`} bookings={past} empty="No past reservations yet." />
    </div>
  );
}

function Section({
  title,
  bookings,
  empty,
}: {
  title: string;
  bookings: Booking[];
  empty: string;
}) {
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      {bookings.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="Nothing here" body={empty} />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Guests</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Read-only review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-cream/60">
                  <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{b.guest.name}</span>
                    <br />
                    <span className="text-xs text-stone-500">{b.guest.email}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                    {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}
                    <br />
                    <span className="text-xs text-stone-400">{b.nights}n</span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {b.guests.adults + b.guests.children}
                    {b.guests.infants > 0 && ` +${b.guests.infants}i`}
                    {b.pets > 0 && ` · ${b.pets} pet`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[b.status]}>{b.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{b.paymentStatus.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">
                    {formatCents(b.totalCents)}
                  </td>
                  <td className="px-4 py-3"><CancellationReview bookingId={b.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
