"use client";
import { useId } from 'react';
/** Decorative humor only: disabled, unnamed and never part of the booking payload. */
export default function FaxJokeField() {
  const id = useId();
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink">Fax number</label>
    <input id={id} type="text" disabled placeholder="Just kidding!" aria-describedby={`${id}-hint`} className="min-h-11 w-full cursor-not-allowed rounded-lg border border-line bg-stone-100 px-3 text-sm text-moss placeholder:text-stone-400"/>
    <p id={`${id}-hint`} className="mt-1.5 text-xs text-moss">Just a joke—no fax number needed or collected.</p>
  </div>;
}
