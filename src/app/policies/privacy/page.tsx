import type { Metadata } from "next";
import { PolicyShell } from "../PolicyShell";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy for the Casa Pacifica direct-booking website.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy policy" updated="October 13, 2026">
      <p>
        Kipper Property Management operates this website to take direct bookings
        for Casa Pacifica. This policy explains what information we collect and how
        we use it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Booking details:</strong> your name, email, phone number
          (optional), stay dates, guest counts, and payment information needed to
          complete your reservation.
        </li>
        <li>
          <strong>Messages:</strong> anything you send us about your booking or stay.
        </li>
        <li>
          <strong>Technical data:</strong> basic, anonymized analytics about site
          usage so we can improve the booking experience.
        </li>
      </ul>
      <h2>Payments</h2>
      <p>
        Payments are processed securely by Stripe. Your card details go directly
        to Stripe — we never see, store, or have access to your full card number.
        See Stripe's privacy policy for how they handle payment data.
      </p>
      <h2>How we use your information</h2>
      <ul>
        <li>To process your booking and take payment.</li>
        <li>To send your confirmation, smart-lock entry code, and stay communications.</li>
        <li>To respond to questions and provide support during your stay.</li>
        <li>To meet legal and tax obligations (e.g., lodging tax records).</li>
      </ul>
      <p>We do not sell your personal information. We do not share it with
      advertisers.</p>
      <h2>Security cameras</h2>
      <p>
        An exterior security camera monitors the outside of the property. There
        are no cameras inside the home or in private areas.
      </p>
      <h2>Your rights</h2>
      <p>
        If you're a California resident, you may request to see, correct, or
        delete the personal information we hold about you. Message us after
        booking and we'll handle it promptly.
      </p>
      <h2>Data retention</h2>
      <p>
        Booking records are kept as long as needed for tax, legal, and
        operational purposes, then deleted or anonymized.
      </p>
    </PolicyShell>
  );
}
