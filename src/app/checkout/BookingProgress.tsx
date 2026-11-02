/** Presentation only: progress reflects real checkout state, never simulated payment. */
export default function BookingProgress({ current }: { current: 'dates' | 'review' | 'payment' | 'confirmation' }) {
  const active = { dates: 0, review: 1, payment: 2, confirmation: 3 }[current];
  return <ol aria-label="Booking progress" className="mb-8 flex list-none items-center justify-between gap-2 p-0 text-[10px] text-stone-500 sm:text-xs">
    {['Dates', 'Review', 'Payment', 'Confirmation'].map((label, index) => <li key={label} aria-current={index === active ? 'step' : undefined} className={`flex items-center gap-1.5 ${index === active ? 'font-semibold text-ink' : ''}`}>
      <span aria-hidden="true" className={`grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border text-[10px] ${index === active ? 'border-ink bg-ink text-paper' : 'border-stone-300'}`}>{index + 1}</span>{label}
    </li>)}
  </ol>;
}
