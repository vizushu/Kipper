import type { Metadata } from "next";
import { PolicyShell } from "../PolicyShell";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description: "Cancellation policy for direct bookings at Casa Pacifica.",
  robots: { index: false, follow: false },
};

export default function CancellationPolicyPage() {
  return (
    <PolicyShell draft={false} title="Cancellation policy" updated="October 30, 2026">
      <p>Accommodation refunds are based on cancellation before check-in, in America/Los_Angeles time:</p>
      <ul><li>At least 30 days: 100% accommodation refund.</li><li>15 to fewer than 30 days: 50% accommodation refund.</li><li>Under 15 days: no accommodation refund.</li></ul>
      <p>Cleaning is waived for new direct bookings, so no cleaning fee is charged or refunded. Existing reservations keep their original accepted terms, including any refundable cleaning fee. Tax adjustments are handled separately after verification.</p>
      <p>Online booking is not open yet. The preview uses the 3:00 PM local check-in time as the cancellation cutoff; final checkout will show the accepted policy version.</p>
    </PolicyShell>
  );
}
