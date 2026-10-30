import type { AmenityGroup } from "@/lib/types";
import { IconCheck, IconWifi, IconPool } from "@/components/icons";
function AmenityIcon({ item }: { item: string }) {
  if (item === "Wifi") return <IconWifi className="h-6 w-6 shrink-0"/>;
  if (item === "Private pool") return <IconPool className="h-6 w-6 shrink-0"/>;
  const paths: Record<string,string> = {
    "Full kitchen": "M5 3v7m-3-7v5a3 3 0 0 0 6 0V3M5 11v11M17 3c-4 4-4 8 0 9h3V3Zm3 9v10",
    "EV charger (Level 2)": "M4 21V4h10v17M2 21h14M7 7h4m3 4h3v6a2 2 0 0 0 4 0V8l-3-3M8 11l-2 4h4l-2 4",
    "Pool table": "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M10 10h4v4h-4Z",
    "Free on-premises parking + free street parking": "M4 3h16v18H4ZM9 18V7h4a3 3 0 0 1 0 6H9"
  };
  return paths[item] ? <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={paths[item]}/></svg> : <IconCheck className="h-6 w-6 shrink-0"/>;
}
const labels: Record<string,string> = { Wifi: "Wi-Fi", "EV charger (Level 2)": "EV charging", "Private pool": "Swimming pool", "Free on-premises parking + free street parking": "Free parking" };

// Select only exact matches from the property's verified content, never new claims.
const preferred = ["Full kitchen", "Wifi", "EV charger (Level 2)", "Private pool", "Pool table", "Free on-premises parking + free street parking"];
export function selectAmenityHighlights(groups: AmenityGroup[]): string[] {
  const all = [...new Set(groups.flatMap(group => group.items))];
  return [...preferred.filter(item => all.includes(item)), ...all.filter(item => !preferred.includes(item))].slice(0, 6);
}

export default function AmenityHighlights({ groups }: { groups: AmenityGroup[] }) {
  const highlights = selectAmenityHighlights(groups);
  if (!highlights.length) return <p className="text-sm text-stone-600">Amenities are awaiting confirmation.</p>;
  return <>
    <ul className="grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-3">
      {highlights.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><AmenityIcon item={item}/><span>{labels[item] ?? item}</span></li>)}
    </ul>
    <details className="group mt-6">
      <summary className="w-fit cursor-pointer rounded-md border border-moss/60 px-4 py-3 text-sm font-medium text-ink hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay">
        <span className="group-open:hidden">Show all amenities</span><span className="hidden group-open:inline">Hide full amenities</span>
      </summary>
      <div className="mt-7 grid gap-7 sm:grid-cols-2">
        {groups.map(group => <div key={group.category}><h3 className="mb-3 text-sm font-semibold">{group.category}</h3><ul className="space-y-2 text-sm leading-6 text-stone-600">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}
      </div>
    </details>
  </>;
}
