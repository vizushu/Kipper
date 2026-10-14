/**
 * PropertyCard — property summary card used on home + /properties.
 */
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { IconBath, IconBed, IconPin, IconUsers } from "@/components/icons";
import { formatCents } from "@/lib/types";
import type { PropertySummary } from "@/lib/types";

export default function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <Image
          src={property.coverPhoto.src}
          alt={property.coverPhoto.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-medium text-ink group-hover:underline underline-offset-4">
              {property.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
              <IconPin className="h-3.5 w-3.5" />
              {property.neighborhood}, {property.city}
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-[11px] uppercase tracking-wide text-stone-500">from</span>
            <br />
            <span className="text-lg font-semibold text-ink">
              {formatCents(property.startingNightlyCents)}
            </span>
            <span className="text-sm text-stone-500">/night</span>
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <IconUsers className="h-4 w-4 text-stone-400" /> Sleeps {property.maxGuests}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconBed className="h-4 w-4 text-stone-400" /> {property.bedrooms} BR
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconBath className="h-4 w-4 text-stone-400" /> {property.bathrooms} BA
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {property.amenityTags.slice(0, 4).map((tag) => (
            <Badge key={tag} tone="cream">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
