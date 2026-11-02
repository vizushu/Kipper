import { CANCELLATION_POLICY } from "./cancellation";
/**
 * Casa Pacifica property content — the canonical listing.
 *
 * This is hardcoded seed data taken from Renier's verified Airbnb listing
 * copy (Oct 5 migration export) and the property brief. No database is
 * needed for property content; availability, bookings, blocks, rate
 * overrides, and settings live in the DataAdapter (src/lib/db/).
 *
 * Do NOT invent: availability, reservations, payments, or reviews.
 * Fields Renier has not confirmed are flagged inline and in docs/API.md.
 */

import type { Property, PropertySummary } from "./types";

const CASA_PACIFICA: Property = {
  license: "STR-13982L",
  taxPolicyVersion: "san-diego-zone2-2025-05-01",
  // Legal host/homeowner identity must be verified before displaying a host card.
  configurations: [
    { id: "casa-pacifica-3br", label: "3-bedroom accommodation", effectiveFrom: "2020-01-01", effectiveTo: "2027-03-01", bedrooms: 3, maxGuests: 8, maxTotalOccupancy: 10, checkoutApproved: true },
    { id: "casa-pacifica-5br", label: "5-bedroom accommodation", effectiveFrom: "2027-03-01", bedrooms: 5, checkoutApproved: false },
  ],
  id: "casa-pacifica",
  slug: "casa-pacifica",
  name: "Casa Pacifica",
  brandLine: "Casa Pacifica · San Diego",
  tagline: "A private pool retreat in the heart of San Diego",
  address: "10840 New Salem Point",
  city: "San Diego",
  state: "CA",
  zip: "92126",
  neighborhood: "Mira Mesa",
  // ⚠️ APPROXIMATE coordinates — Renier to confirm the exact pin.
  latitude: 32.912,
  longitude: -117.139,
  maxGuests: 8, // overnight
  maxTotalOccupancy: 10, // incl. approved daytime visitors
  bedrooms: 3,
  bathrooms: 2,
  bedLayout: [], // Bed count and mapping await owner confirmation.
  description:
    "Welcome to your San Diego getaway — a thoughtfully designed downstairs accommodation perfect for families, friends, and business travel. Relax by the private pool, enjoy meals together in the spacious indoor and outdoor dining areas, or unwind after a day exploring San Diego. Conveniently located in the heart of Mira Mesa, minutes from UCSD, La Jolla Shores, and San Diego's best beaches and attractions.",
  guestAccess:
    "Guests enjoy private access to the entire downstairs: three bedrooms, two bathrooms, kitchen, dining, living room, laundry, backyard, pool, BBQ, and designated parking. The upstairs is a separate private residence with its own entrance — locked throughout your stay; no shared indoor spaces.",
  highlights: [
    {
      title: "In Mira Mesa, near La Jolla",
      body: "A short drive to La Jolla Shores, UCSD, and San Diego's top beaches and attractions.",
    },
    {
      title: "Private backyard with pool",
      body: "Private pool, fire pit, BBQ grill, outdoor dining, and a fully fenced backyard.",
    },
    {
      title: "Comfortable and well-equipped",
      body: "Bright open living spaces, fully equipped kitchen, premium linens, and a dedicated workspace.",
    },
  ],
  amenities: [
    {
      category: "Pool & outdoors",
      items: [
        "Private pool",
        "Fully fenced backyard",
        "Cabana",
        "Fire pit",
        "BBQ grill + utensils",
        "Outdoor dining area",
        "Outdoor furniture",
        "Sun loungers",
        "Beach essentials",
      ],
    },
    {
      category: "Kitchen",
      items: [
        "Full kitchen",
        "Dishwasher",
        "Double oven",
        "Stove",
        "Microwave",
        "Drip coffee maker + espresso machine + French press",
        "Blender",
        "Rice maker",
        "Dishes and silverware",
        "Cooking basics",
      ],
    },
    {
      category: "Comfort",
      items: [
        "Air conditioning",
        "Heating",
        "Washer & dryer",
        "Wifi",
        "Dedicated workspace",
        "2 TVs",
        "Sound system",
        "Board games",
        "Pool table",
        "Books",
      ],
    },
    {
      category: "Bed & bath",
      items: [
        "Premium linens",
        "Extra pillows and blankets",
        "Hair dryer",
        "Shampoo, conditioner & body soap",
        "Crib available on request",
      ],
    },
    {
      category: "Practical",
      items: [
        "Free on-premises parking + free street parking",
        "EV charger (Level 2)",
        "Private entrance",
        "Smoke + CO alarms",
        "Fire extinguisher",
        "First aid kit",
        "Ceiling fans",
      ],
    },
  ],
  houseRules: [
    "Maximum 8 overnight guests, including children and infants; maximum 10 people on the property including approved daytime visitors",
    "Check-in from 3:00 PM; checkout by 11:00 AM",
    "Quiet hours 10:00 PM – 8:00 AM",
    "No parties or events",
    "No smoking or vaping",
    "No drugs",
    "Children must be supervised at the pool at all times — no lifeguard on duty",
    "No glass near the pool",
    "The upstairs level is a private residence — please do not access it",
    "Lock doors and windows when leaving",
    "Only registered guests on the property unless approved in advance",
  ],
  checkInTime: "3:00 PM",
  checkOutTime: "11:00 AM",
  checkInMethod: "Confirm arrival arrangements with Casa Pacifica before travel",
  quietHours: "10:00 PM – 8:00 AM",
  // ⚠️ Cancellation wording mirrors the Airbnb "Firm" policy; exact direct-booking
  // terms are Renier-to-confirm.
  cancellationPolicyVersion: CANCELLATION_POLICY.version,
  cancellationPolicy:
    CANCELLATION_POLICY.text,
  petPolicy: {
    allowed: false,
    onlineApprovalPending: true,
    feePerStayCents: 0,
    maxPets: 1,
  },
  photos: [
    // NOTE: photo 01 shows the backyard projector screen. The projector has been
    // REMOVED from guest use and must never be advertised. Exclude 01 from the
    // guest gallery until a projector-free outdoor shot is supplied. Hero = 02
    // (living room), supported by verified bedroom/kitchen images; parking last.
    { src: "/photos/casa-pacifica-02.jpg", alt: "Casa Pacifica — bright open living room", room: "Living room" },
    { src: "/photos/casa-pacifica-06.jpg", alt: "Casa Pacifica — bedroom", room: "Bedroom 1" },
    { src: "/photos/casa-pacifica-03.jpg", alt: "Casa Pacifica — fully equipped kitchen", room: "Kitchen" },
    { src: "/photos/casa-pacifica-04.jpg", alt: "Casa Pacifica — indoor dining area", room: "Dining area" },
    { src: "/photos/casa-pacifica-12.jpg", alt: "Casa Pacifica — bedroom", room: "Bedroom 3" },
    { src: "/photos/casa-pacifica-09.jpg", alt: "Casa Pacifica — bedroom", room: "Bedroom 2" },
    { src: "/photos/casa-pacifica-07.jpg", alt: "Casa Pacifica — living area with pool table", room: "Living room" },
    { src: "/photos/casa-pacifica-13.jpg", alt: "Casa Pacifica — dining area detail", room: "Dining area" },
    { src: "/photos/casa-pacifica-10.jpg", alt: "Casa Pacifica — kitchen detail", room: "Kitchen" },
    { src: "/photos/casa-pacifica-11.jpg", alt: "Casa Pacifica — dining area cabinetry", room: "Dining area" },
    { src: "/photos/casa-pacifica-08.jpg", alt: "Casa Pacifica — interior hallway", room: "Hallway" },
    { src: "/photos/casa-pacifica-05.jpg", alt: "Casa Pacifica — designated guest parking on the brick-paved area; keep the neighboring driveway clear", room: "Guest parking" },
  ],
  faqs: [
    {
      q: "Is the pool heated?",
      a: "Pool heating availability and pricing must be confirmed with the Casa Pacifica booking contact before booking.",
    },
    {
      q: "Is the upstairs part of the rental?",
      a: "No — the upstairs is a separate private residence with its own entrance. It stays locked throughout your stay and there are no shared indoor spaces.",
    },
    {
      q: "Where do we park?",
      a: "Free on-premises parking plus free street parking. There's also a Level 2 EV charger on site.",
    },
    {
      q: "Can we bring a pet?",
      a: "Please contact us before booking with a pet. Pet eligibility and any fee need confirmation; online pet bookings are not available yet.",
    },
    {
      q: "What are the check-in and checkout times?",
      a: "Check in from 3:00 PM and check out by 11:00 AM. Confirm arrival arrangements with Casa Pacifica before travel.",
    },
    {
      q: "Is there WiFi?",
      a: "Yes — fast wifi throughout the house. Network details are in your confirmation email.",
    },
    {
      q: "How far is the beach?",
      a: "Minutes to La Jolla Shores and San Diego's top beaches; UCSD is nearby too.",
    },
  ],
  safetyDevices: [
    "Smoke alarm",
    "Carbon monoxide alarm",
    "Fire extinguisher",
    "First aid kit",
    "Exterior security camera",
  ],
  // Pricing configuration (defaults; admin-editable via /api/admin/*)
  pricingMode: "flat",
  inclusiveNightlyAllowanceBps: 300, // Owner-approved inclusive room price; not a card surcharge.
  baseNightlyCents: 44900,
  minNightlyCents: 44900,
  maxNightlyCents: 44900,
  cleaningFeeCents: 0, // Waived for new direct bookings; old accepted quotes remain unchanged.
  cleaningFeeReferenceCents: 18000, // Actual prior standard fee, display-only.
  taxRatePct: 12.75, // Verified San Diego Zone 2, effective 2025-05-01
  minStayNights: 1,
  maxStayNights: 28,
};

const PROPERTIES: Property[] = [CASA_PACIFICA];

/** Look up by id or slug. */
export function getProperty(slugOrId: string): Property | undefined {
  return PROPERTIES.find((p) => p.slug === slugOrId || p.id === slugOrId || (p.id === "casa-pacifica" && slugOrId === "casa-pacifica-san-diego"));
}

export function listProperties(): Property[] {
  return [...PROPERTIES];
}

export function toPropertySummary(p: Property): PropertySummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    neighborhood: p.neighborhood,
    maxGuests: p.maxGuests,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    // Deliberately not photo 01 (shows the removed projector screen).
    coverPhoto: p.photos[0],
    amenityTags: [
      "Private pool",
      "Sleeps 8",
      "3 bedrooms",
      "Mira Mesa",
      "EV charger",
    ],
  };
}
