/**
 * Static fallback property content for Casa Pacifica.
 *
 * Every fact here is verified (Airbnb listing export 2026-10-05 + property
 * brief). The API layer (src/data/api.ts) prefers live API data and falls
 * back to this when the backend is unreachable, so the UI never renders
 * empty. Keep this in sync with the verified brief — never invent beyond it.
 *
 * NEVER mention: sauna (not real), projector (removed), AC cooling issues.
 */
import type { Property, PropertySummary } from "@/lib/types";

export const CASA_PACIFICA_ID = "casa-pacifica";
export const CASA_PACIFICA_SLUG = "casa-pacifica-san-diego";

const PHOTOS: Property["photos"] = [
  {
    src: "/photos/casa-pacifica-01.jpg",
    alt: "Private fenced pool in the Casa Pacifica backyard at dusk, with patio seating",
    caption: "Private heated pool",
    room: "Pool",
  },
  {
    src: "/photos/casa-pacifica-02.jpg",
    alt: "Bright open living room with modern furnishings, large windows and sliding door to the backyard",
    caption: "Open living room",
    room: "Living room",
  },
  {
    src: "/photos/casa-pacifica-03.jpg",
    alt: "Full kitchen with stainless steel double oven, stovetop and island seating",
    caption: "Fully equipped kitchen",
    room: "Kitchen",
  },
  {
    src: "/photos/casa-pacifica-04.jpg",
    alt: "Dining area with table and chairs next to large windows",
    caption: "Indoor dining area",
    room: "Dining area",
  },
  {
    src: "/photos/casa-pacifica-05.jpg",
    alt: "Front of the house with paved driveway and marked guest parking",
    caption: "Private entrance & guest parking",
    room: "Exterior",
  },
  {
    src: "/photos/casa-pacifica-06.jpg",
    alt: "Bedroom one with comfortable bed, bedside tables and soft lighting",
    caption: "Bedroom one",
    room: "Bedroom 1",
  },
  {
    src: "/photos/casa-pacifica-07.jpg",
    alt: "Living room seating area with sofa, armchairs and coffee table",
    caption: "Lounge corner",
    room: "Living room",
  },
  {
    src: "/photos/casa-pacifica-08.jpg",
    alt: "Hallway with framed coastal photography leading to the bedrooms",
    caption: "Gallery hallway",
    room: "Hallway",
  },
  {
    src: "/photos/casa-pacifica-09.jpg",
    alt: "Bedroom two with bed, window and closet storage",
    caption: "Bedroom two",
    room: "Bedroom 2",
  },
  {
    src: "/photos/casa-pacifica-10.jpg",
    alt: "Kitchen counter with coffee station, kettle and small appliances",
    caption: "Coffee station",
    room: "Kitchen",
  },
  {
    src: "/photos/casa-pacifica-11.jpg",
    alt: "Kitchen detail with dishware, cookware and cooking basics",
    caption: "Kitchen details",
    room: "Kitchen",
  },
  {
    src: "/photos/casa-pacifica-12.jpg",
    alt: "Bedroom three with bunk bed and natural light",
    caption: "Bedroom three",
    room: "Bedroom 3",
  },
  {
    src: "/photos/casa-pacifica-13.jpg",
    alt: "Dining area set for a shared meal, adjoining the kitchen",
    caption: "Gather around the table",
    room: "Dining area",
  },
];

export const PROPERTY: Property = {
  id: CASA_PACIFICA_ID,
  slug: CASA_PACIFICA_SLUG,
  name: "Casa Pacifica",
  brandLine: "Casa Pacifica · Operated by Kipper Property Management",
  tagline: "A private pool retreat in San Diego",
  address: "10840 New Salem Point",
  city: "San Diego",
  state: "CA",
  zip: "92126",
  neighborhood: "Mira Mesa",
  latitude: 32.9126,
  longitude: -117.1382,
  maxGuests: 8,
  maxTotalOccupancy: 10,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  bedLayout: [
    { room: "Bedroom 1", bed: "1 king bed" },
    { room: "Bedroom 2", bed: "1 queen bed" },
    { room: "Bedroom 3", bed: "1 twin-over-full bunk bed" },
    { room: "Living room", bed: "1 queen sleeper sofa" },
  ],
  description:
    "Welcome to your San Diego getaway — the entire downstairs of Casa Pacifica, thoughtfully designed for families, friends, and business travel. " +
    "Relax by the private heated pool, enjoy meals together in the spacious indoor and outdoor dining areas, or unwind after a day exploring San Diego in a warm, modern space designed for comfort. " +
    "Conveniently located in the heart of Mira Mesa, you're just minutes from UCSD, La Jolla Shores, and many of San Diego's best beaches and attractions.",
  guestAccess:
    "Guests have private access to the entire downstairs living area, including all three bedrooms, two bathrooms, kitchen, dining room, living room, backyard, pool, BBQ, driveway, and all listed amenities. " +
    "The upstairs level is a separate residence with its own private entrance — it remains locked throughout your stay. Guests do not share indoor spaces, entrances, or amenities with upstairs occupants.",
  highlights: [
    {
      title: "In Mira Mesa, near La Jolla",
      body: "A short drive to La Jolla Shores, UCSD, and San Diego's top beaches and attractions.",
    },
    {
      title: "Private backyard with pool and fire pit",
      body: "A private heated pool, fire pit, BBQ grill, and outdoor dining in a fenced backyard.",
    },
    {
      title: "Comfortable and well-equipped",
      body: "Bright open living spaces, a fully equipped kitchen, and hotel-quality linens throughout.",
    },
  ],
  amenities: [
    {
      category: "Outdoor",
      items: [
        "Private heated pool",
        "Fenced private backyard",
        "BBQ grill with utensils",
        "Fire pit",
        "Outdoor dining area",
        "Outdoor furniture & sun loungers",
        "Covered cabana",
      ],
    },
    {
      category: "Kitchen & dining",
      items: [
        "Full kitchen (double stainless oven, stovetop, microwave, dishwasher)",
        "Coffee — drip, espresso, French press & pour-over",
        "Blender, hot water kettle, rice maker, toaster",
        "Cooking basics, pots & pans, baking sheet",
        "Dishes, silverware & wine glasses",
      ],
    },
    {
      category: "Bedrooms & laundry",
      items: [
        "Hotel-quality cotton linens",
        "Extra pillows & blankets",
        "Closet & walk-in clothing storage",
        "Room-darkening shades",
        "Crib",
        "Washer & dryer",
        "Iron & hangers",
      ],
    },
    {
      category: "Entertainment",
      items: [
        "Smart TV",
        "Sound system",
        "Game & billiards room",
        "Board games",
        "Books & reading material",
        "Dedicated workspace",
      ],
    },
    {
      category: "Practical",
      items: [
        "Fast wifi",
        "Air conditioning & heating",
        "Ceiling fans",
        "Level 2 EV charger",
        "Free parking on premises",
        "Free street parking",
        "Essentials: towels, soap, toilet paper",
        "Hair dryer, shampoo, conditioner, body soap",
        "First aid kit & fire extinguisher",
        "Smoke & carbon monoxide alarms",
      ],
    },
    {
      category: "Beach",
      items: [
        "Beach essentials (towels, chairs, umbrella)",
        "Surfboards available for guest use",
        "Outdoor rinse hose for pool & beach cleanup",
      ],
    },
  ],
  houseRules: [
    "Maximum 8 guests overnight; up to 10 total on the property including daytime visitors (visitors approved in advance).",
    "Check-in from 3:00 PM via smart lock (self check-in); checkout by 11:00 AM.",
    "Quiet hours are 10:00 PM – 8:00 AM out of respect for our neighbors.",
    "No parties or events; no commercial photography or filming.",
    "No smoking, vaping, marijuana, hookah, or illegal drugs anywhere on the property. A minimum $500 smoke remediation fee may be charged if evidence of smoking is found.",
    "Children must be supervised at the pool at all times. Guests use the pool at their own risk — no lifeguard on duty.",
    "The upstairs level is a private residence and is not part of the rental — please do not access it.",
    "Only registered guests may be on the property unless approved in advance.",
    "Please lock all doors and windows whenever leaving the property.",
    "Please do not block the neighbor's driveway.",
    "Report any accidental damage as soon as possible — accidents happen, and prompt communication helps.",
  ],
  checkInTime: "3:00 PM",
  checkOutTime: "11:00 AM",
  checkInMethod: "Self check-in with smart lock",
  quietHours: "10:00 PM – 8:00 AM",
  cancellationPolicy:
    "Firm: full refund for cancellations 30+ days before check-in, 50% refund 14–30 days before, no refund within 14 days. Free cancellation within 48 hours of booking when booked more than 14 days ahead.",
  petPolicy: { allowed: true, feePerStayCents: 5000, maxPets: 1 },
  photos: PHOTOS,
  faqs: [
    {
      q: "What time are check-in and check-out?",
      a: "Check-in is from 3:00 PM and check-out is by 11:00 AM. Check-in is fully self-service with a smart lock — your entry code is sent before arrival.",
    },
    {
      q: "Where exactly is Casa Pacifica?",
      a: "10840 New Salem Point, San Diego, CA 92126, in the Mira Mesa neighborhood — minutes from UCSD, La Jolla Shores, and many of San Diego's best beaches and attractions.",
    },
    {
      q: "Is the pool heated?",
      a: "Yes — pool heating is included with every stay, so the private pool is comfortable year-round.",
    },
    {
      q: "Is the upstairs part of the rental?",
      a: "No. The upstairs is a separate residence with its own private entrance. Guests have the entire downstairs to themselves and never share indoor spaces, entrances, or amenities with upstairs occupants.",
    },
    {
      q: "How many guests can stay?",
      a: "A maximum of 8 guests overnight (3 bedrooms, 4 beds), with up to 10 total on the property including daytime visitors.",
    },
    {
      q: "Are pets allowed?",
      a: "Yes — one pet per stay is welcome for a flat $50 fee.",
    },
    {
      q: "Is there parking?",
      a: "Yes — free parking in the driveway for guests plus free street parking nearby.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Firm: full refund 30+ days before check-in, 50% refund 14–30 days before, and no refund within 14 days of check-in. You can also cancel free within 48 hours of booking if you booked more than 14 days ahead.",
    },
    {
      q: "Is there a washer and dryer?",
      a: "Yes — a washer and dryer are available in the garage. The garage is used for storage, but the washer and dryer are fully usable.",
    },
    {
      q: "Is there an EV charger?",
      a: "Yes — a Level 2 EV charger is available for guests.",
    },
    {
      q: "Are parties or events allowed?",
      a: "No — parties, events, and large gatherings are not permitted, and quiet hours are 10:00 PM – 8:00 AM.",
    },
    {
      q: "Who do I contact if something comes up during my stay?",
      a: "Kipper — your host — is reachable directly by message once you book. We aim to respond within the hour.",
    },
  ],
  safetyDevices: [
    "Exterior security camera",
    "Carbon monoxide alarm",
    "Smoke alarm",
    "Fire extinguisher",
    "First aid kit",
  ],
  baseNightlyCents: 34900,
  minNightlyCents: 34900,
  maxNightlyCents: 103000,
  cleaningFeeCents: 15000, // SAMPLE default — Renier has not confirmed
  taxRatePct: 10.5, // SAMPLE default — San Diego TOT placeholder
  minStayNights: 1,
  maxStayNights: 28,
};

export const PROPERTY_SUMMARY: PropertySummary = {
  id: PROPERTY.id,
  slug: PROPERTY.slug,
  name: PROPERTY.name,
  city: PROPERTY.city,
  neighborhood: PROPERTY.neighborhood,
  maxGuests: PROPERTY.maxGuests,
  bedrooms: PROPERTY.bedrooms,
  bathrooms: PROPERTY.bathrooms,
  coverPhoto: PROPERTY.photos[1], // living room — never the pool photo with the retired projector screen
  startingNightlyCents: PROPERTY.baseNightlyCents,
  amenityTags: ["Private heated pool", "Fire pit", "EV charger", "Game room", "Washer & dryer"],
};

export const FALLBACK_PROPERTIES: PropertySummary[] = [PROPERTY_SUMMARY];
