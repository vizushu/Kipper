import { getBookingPaymentMode } from "@/lib/payment-mode";
import type { Metadata } from "next";
import { PolicyShell } from "../PolicyShell";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy for the Casa Pacifica direct-booking website.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  const live = getBookingPaymentMode() === "live";
  return (
    <PolicyShell draft={!live} title="Privacy policy" updated="November 2, 2026">
      <p>
        {live ? "Renier De La Cruz operates Casa Pacifica and is responsible for the booking information described here. Contact vizushu@gmail.com with privacy requests. This policy describes the direct-booking website; Kipper AI and SMS support remain unconnected." : "New booking and payment submissions are closed. Renier De La Cruz operates Casa Pacifica; contact vizushu@gmail.com for privacy questions. The following describes booking information handling when bookings are enabled and records from any existing reservations."}
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
          <strong>Technical data:</strong> request and operational records used to run and protect the website. Interactive maps may contact Mapbox, which processes browser and network information under its own privacy policy.
        </li>
      </ul>
      <h2>Payments</h2>
      <p>
        {live ? "Stripe processes payments for Casa Pacifica. Card details are entered through Stripe’s payment interface; the booking system stores payment identifiers and status, not full card numbers or security codes." : "New payments are closed. When payment is enabled, Stripe processes card details; the booking system stores payment identifiers and status, not full card numbers or security codes."}
      </p>
      <h2>How we use your information</h2>
      <ul>
        <li>To process your booking and take payment.</li>
        <li>To send your confirmation and stay communications.</li>
        <li>To respond to questions and provide support during your stay.</li>
        <li>To meet legal and tax obligations (e.g., lodging tax records).</li>
      </ul>
      <p>We do not sell your personal information. We do not share it with
      advertisers.</p>
      <h2>Service providers</h2>
      <p>Render hosts the website and booking records. Resend delivers confirmation and support emails. Stripe processes payments. Renier De La Cruz can access booking details to operate your stay. Calendar connections exchange blocked dates with Airbnb; the direct-booking calendar feed does not include guest names, contact details or payment information.</p>
      <h2>Security cameras</h2>
      <p>
        An exterior security camera monitors the outside of the property. There
        are no cameras inside the home or in private areas.
      </p>
      <h2>Your rights</h2>
      <p>
        If you're a California resident, you may request to see, correct, or
        delete the personal information we hold about you. Contact vizushu@gmail.com; you do not need a reservation to make a privacy request. Applicable record-keeping obligations may limit deletion.
      </p>
      <h2>Data retention</h2>
      <p>
        Booking records are kept as long as needed for tax, legal, and
        operational purposes, then deleted or anonymized.
      </p>
    </PolicyShell>
  );
}
