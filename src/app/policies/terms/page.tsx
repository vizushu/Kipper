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
        These draft stay terms describe Casa Pacifica. No reservations or payments are accepted in this preview. Final contracting and merchant details will be disclosed before booking opens; Kipper is a concierge-AI startup, not identified here as the property manager or host.
      </p>
      <h2>The property</h2>
      <p>
        You are booking the current guest accommodation in Mira Mesa, San Diego: 3 bedrooms, 2 bathrooms, sleeping up to
        8 guests, with private access to the backyard, pool, and listed
        amenities. Only the accommodation specified for your stay dates is included.
      </p>
      <h2>Occupancy & guests</h2>
      <ul>
        <li>Maximum 8 people total on the property, including overnight guests and daytime visitors.</li>
        <li>Only registered guests may stay overnight. Daytime visitors must be approved in advance.</li>
        <li>Children must be supervised around the pool at all times. Pool use is at your own risk — no lifeguard on duty.</li>
      </ul>
      <h2>House rules</h2>
      <ul>
        <li>Check-in from 3:00 PM (self check-in via smart lock); check-out by 11:00 AM.</li>
        <li>Quiet hours 10:00 PM – 8:00 AM.</li>
        <li>No parties, events, or large gatherings. No commercial photography or filming.</li>
        <li>No smoking, vaping, marijuana, hookah, or illegal drugs anywhere on the property.</li>
        <li>Pets: one pet maximum, $50 per stay. You are responsible for any pet damage.</li>
        <li>Please do not block the neighbor's driveway, and keep outdoor noise respectful, especially at night.</li>
      </ul>
      <h2>Payment</h2>
      <p>
        Online booking is currently a test-only preview. No real payments are enabled. Prices are in USD and include
        applicable taxes. The cleaning fee and any pet fee are itemized before you
        pay — there are no marketplace service fees when you book direct.
      </p>
      <h2>Damage & liability</h2>
      <p>
        Please report accidental damage promptly — accidents happen, and quick
        communication helps everyone. You are responsible for damage beyond normal
        wear caused by you, your guests, or your pet during the stay. Final liability terms and the responsible contracting party remain under review.
      </p>
      <h2>Entry</h2>
      <p>
        The homeowner or verified host must confirm the entry policy before booking opens. Kipper is not represented as having property-entry authority.
      </p>
      <h2>Cancellation</h2>
      <p>
        Cancellations follow our{" "}
        <a href="/policies/cancellation" className="underline underline-offset-4">cancellation policy</a>.
        Please contact Casa Pacifica with questions about your stay terms.
      </p>
    </PolicyShell>
  );
}
