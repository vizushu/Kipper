import type { Metadata } from "next";
import { PolicyShell } from "../PolicyShell";

export const metadata: Metadata = {
  title: "Terms of stay",
  description: "Terms of stay for direct bookings at Casa Pacifica.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of stay" updated="October 13, 2026">
      <p>
        These terms apply to every reservation made directly through this website
        for Casa Pacifica, operated by Kipper Property Management ("we", "us").
        By completing a booking, you ("the guest") agree to the following.
      </p>
      <h2>The property</h2>
      <p>
        You are booking the entire downstairs guest accommodation at 10840 New
        Salem Point, San Diego, CA 92126: 3 bedrooms, 2 bathrooms, sleeping up to
        8 guests, with private access to the backyard, heated pool, and listed
        amenities. The upstairs level is a separate private residence and is not
        part of your reservation.
      </p>
      <h2>Occupancy & guests</h2>
      <ul>
        <li>Maximum 8 guests overnight; up to 10 total on the property including daytime visitors.</li>
        <li>Only registered guests may stay overnight. Daytime visitors must be approved in advance.</li>
        <li>Children must be supervised around the pool at all times. Pool use is at your own risk — no lifeguard on duty.</li>
      </ul>
      <h2>House rules</h2>
      <ul>
        <li>Check-in from 3:00 PM (self check-in via smart lock); check-out by 11:00 AM.</li>
        <li>Quiet hours 10:00 PM – 8:00 AM.</li>
        <li>No parties, events, or large gatherings. No commercial photography or filming.</li>
        <li>No smoking, vaping, marijuana, hookah, or illegal drugs anywhere on the property. A minimum $500 smoke remediation fee may be charged if evidence of smoking is found.</li>
        <li>Pets: one pet maximum, $50 per stay. You are responsible for any pet damage.</li>
        <li>Please do not block the neighbor's driveway, and keep outdoor noise respectful, especially at night.</li>
      </ul>
      <h2>Payment</h2>
      <p>
        The full stay total is charged at booking. Prices are in USD and include
        applicable taxes. The cleaning fee and any pet fee are itemized before you
        pay — there are no marketplace service fees when you book direct.
      </p>
      <h2>Damage & liability</h2>
      <p>
        Please report accidental damage promptly — accidents happen, and quick
        communication helps everyone. You are responsible for damage beyond normal
        wear caused by you, your guests, or your pet during the stay. We are not
        liable for personal injury, loss, or theft except where required by law.
      </p>
      <h2>Entry</h2>
      <p>
        We respect your privacy and will not enter the downstairs guest areas
        during your stay except in an emergency, or with your prior agreement
        (for example, an urgent repair).
      </p>
      <h2>Cancellation</h2>
      <p>
        Cancellations follow our{" "}
        <a href="/policies/cancellation" className="underline underline-offset-4">cancellation policy</a>.
        Unauthorized visitors or rule violations may result in cancellation of the
        reservation without refund.
      </p>
    </PolicyShell>
  );
}
