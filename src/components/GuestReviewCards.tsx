import type { ReactNode } from 'react';

export type GuestReview = {
  id: string;
  name: string;
  date: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string | null;
  avatar: string;
};

function ReviewCard({review}:{review:GuestReview}) {
  return <article className="rounded-xl border border-line bg-panel p-5">
    <header className="flex items-center gap-3">
      <img src={review.avatar} alt="" width="44" height="44" loading="lazy" className="h-11 w-11 rounded-full object-cover"/>
      <div><h3 className="font-medium">{review.name}</h3><p className="text-xs text-moss">{review.date} · Airbnb</p></div>
    </header>
    <p className="mt-3 text-sm tracking-widest" aria-label={`${review.stars} out of 5 stars`}><span aria-hidden="true">{'★'.repeat(review.stars)}{'☆'.repeat(5-review.stars)}</span></p>
    {review.text?<blockquote className="mt-3 whitespace-pre-line text-sm leading-7">{review.text}</blockquote>:<p className="mt-3 text-sm text-moss">The supplied screenshot does not include this review’s text.</p>}
  </article>;
}

/** Owner-supplied historical excerpts, not this site's verified-booking database. */
export default function GuestReviewCards({reviews,note}:{reviews:GuestReview[];note?:ReactNode}) {
  if(!reviews.length)return null;
  return <div>
    <p className="mb-5 text-xs leading-5 text-moss">Selected Airbnb reviews supplied by the host. These are not reviews collected or independently verified by this website; they describe stays at the time shown.</p>
    {note}
    <div className="grid gap-4 sm:grid-cols-2">{reviews.slice(0,2).map(review=><ReviewCard key={review.id} review={review}/>)}</div>
    {reviews.length>2&&<details className="mt-4"><summary className="cursor-pointer rounded-lg border border-line px-4 py-3 text-center text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">Read all {reviews.length} supplied reviews</summary><div className="mt-4 grid items-start gap-4 sm:grid-cols-2">{reviews.slice(2).map(review=><ReviewCard key={review.id} review={review}/>)}</div></details>}
  </div>;
}
