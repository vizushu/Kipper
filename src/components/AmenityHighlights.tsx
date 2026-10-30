import type { AmenityGroup } from "@/lib/types";
import { IconCheck } from "@/components/icons";

// Select only exact matches from the property's verified content, never new claims.
const preferred = ["Private pool", "Full kitchen", "Wifi", "Air conditioning", "Washer & dryer", "Dedicated workspace", "Outdoor dining area", "Free on-premises parking + free street parking"];
export function selectAmenityHighlights(groups: AmenityGroup[]): string[] {
  const all = [...new Set(groups.flatMap(group => group.items))];
  return [...preferred.filter(item => all.includes(item)), ...all.filter(item => !preferred.includes(item))].slice(0, 8);
}

export default function AmenityHighlights({ groups }: { groups: AmenityGroup[] }) {
  const highlights = selectAmenityHighlights(groups);
  if (!highlights.length) return <p className="text-sm text-stone-600">Amenities are awaiting confirmation.</p>;
  return <>
    <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {highlights.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><IconCheck className="mt-1 h-4 w-4 shrink-0 text-moss" /><span>{item}</span></li>)}
    </ul>
    <details className="group mt-6">
      <summary className="w-fit cursor-pointer rounded-xl border border-stone-300 px-5 py-3 text-sm font-medium text-ink hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay">
        <span className="group-open:hidden">Show all amenities</span><span className="hidden group-open:inline">Hide full amenities</span>
      </summary>
      <div className="mt-7 grid gap-7 sm:grid-cols-2">
        {groups.map(group => <div key={group.category}><h3 className="mb-3 text-sm font-semibold">{group.category}</h3><ul className="space-y-2 text-sm leading-6 text-stone-600">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}
      </div>
    </details>
  </>;
}
