import { IconPin, IconPool } from "@/components/icons";
export default function StayHighlights() {
  return <section aria-label="Stay highlights" className="border-t border-line py-6">
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex gap-4"><IconPin className="mt-0.5 h-6 w-6 shrink-0"/><p className="text-sm leading-6"><strong className="block font-medium">At home in San Diego</strong><span className="text-moss">A neighborhood base in Mira Mesa.</span></p></div>
      <div className="flex gap-4"><IconPool className="mt-0.5 h-6 w-6 shrink-0"/><p className="text-sm leading-6"><strong className="block font-medium">Pool, garden &amp; slow afternoons</strong><span className="text-moss">Room to unwind, outside and in.</span></p></div>
      <div className="flex gap-4 md:col-span-2"><svg className="mt-0.5 h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 5.5a5 5 0 0 0-8.5 1 5 5 0 0 0-8.5-1C-1 10 7 17 12 21c5-4 13-11 8.5-15.5Z"/></svg><p className="text-sm leading-6"><strong className="block font-medium">A warm welcome</strong><span className="text-moss">Read selected guest stories below.</span></p></div>
    </div>
    <details className="ml-10 mt-4 text-xs text-moss"><summary className="w-fit cursor-pointer py-2 underline underline-offset-4">ⓘ &nbsp; About these highlights</summary><p className="max-w-lg py-3 leading-6">Location and amenities come from the property details. No guest rating or AI review summary has been generated.</p></details>
  </section>;
}
