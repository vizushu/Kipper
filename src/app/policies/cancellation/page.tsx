import type { Metadata } from "next";
import { PolicyShell } from "../PolicyShell";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description: "Cancellation policy for direct bookings at Casa Pacifica.",
  robots: { index: false, follow: false },
};

export default function CancellationPolicyPage() {
  return (
    <PolicyShell title="Cancellation policy" updated="October 13, 2026">
      <p>
        We keep our cancellation policy simple and fair. It applies to all
        reservations made directly through this website for Casa Pacifica.
      </p>
      <h2>Standard stays (under 28 nights)</h2>
      <ul>
        <li>
          <strong>Free cancellation within 48 hours of booking</strong> — as long as
          you booked more than 14 days before check-in.
        </li>
        <li>
          <strong>Full refund</strong> for cancellations made 30 or more days before
          check-in.
        </li>
        <li>
          <strong>50% refund</strong> for cancellations made 14–30 days before check-in.
        </li>
        <li>
          <strong>No refund</strong> for cancellations made within 14 days of check-in.
        </li>
      </ul>
      <h2>Long stays (28 nights or more)</h2>
      <p>
        Long stays follow a firmer schedule: the first 30 nights are non-refundable
        once the stay begins; remaining nights are refunded if you cancel with at
        least 30 days' notice before each unused night. Contact us before booking a
        long stay and we'll walk through the exact terms.
      </p>
      <h2>How refunds work</h2>
      <p>
        Refunds go back to your original payment method within 5–10 business days,
        depending on your bank. Cleaning fees are refunded whenever the stay itself
        is refunded; they are not refunded for no-shows.
      </p>
      <h2>Extenuating circumstances</h2>
      <p>
        Life happens. If a genuine emergency affects your trip, message Kipper
        directly — we handle these case by case and will always try to be fair.
      </p>
    </PolicyShell>
  );
}
