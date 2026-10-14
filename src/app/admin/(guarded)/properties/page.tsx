/**
 * /admin/properties — read-only property summary.
 * Editing is honestly labeled as coming later.
 */
import Image from "next/image";
import { Badge, Card } from "@/components/ui";
import { IconBath, IconBed, IconPin, IconUsers } from "@/components/icons";
import { PROPERTY } from "@/data/property";
import { formatCents } from "@/lib/types";

export const metadata = { title: "Properties · Admin", robots: { index: false } };

export default function AdminPropertiesPage() {
  const p = PROPERTY;
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Properties</h1>
      <p className="mt-1 text-sm text-stone-500">
        Read-only for now — property editing is coming in a later phase.
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="grid md:grid-cols-[280px_1fr]">
          <div className="relative h-56 md:h-full">
            <Image
              src={p.photos[1].src}
              alt={p.photos[1].alt}
              fill
              sizes="300px"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-medium text-ink">{p.name}</h2>
              <Badge tone="moss">Listed</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <IconPin className="h-3.5 w-3.5" />
              {p.address}, {p.city}, {p.state} {p.zip} · {p.neighborhood}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-stone-500">Sleeps</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <IconUsers className="h-4 w-4 text-stone-400" /> {p.maxGuests}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Bedrooms / beds</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <IconBed className="h-4 w-4 text-stone-400" /> {p.bedrooms} / {p.beds}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Bathrooms</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <IconBath className="h-4 w-4 text-stone-400" /> {p.bathrooms}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Base nightly</dt>
                <dd className="font-medium text-ink">{formatCents(p.baseNightlyCents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Rate band</dt>
                <dd className="font-medium text-ink">
                  {formatCents(p.minNightlyCents)} – {formatCents(p.maxNightlyCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Min / max stay</dt>
                <dd className="font-medium text-ink">
                  {p.minStayNights}n / {p.maxStayNights}n
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Pet policy</dt>
                <dd className="font-medium text-ink">
                  {p.petPolicy.maxPets} pet · {formatCents(p.petPolicy.feePerStayCents)}/stay
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Photos</dt>
                <dd className="font-medium text-ink">{p.photos.length}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-stone-500">
              Property ID <span className="font-mono">{p.id}</span> · slug{" "}
              <span className="font-mono">{p.slug}</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
