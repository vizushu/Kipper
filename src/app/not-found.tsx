import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
        Not found
      </p>
      <h1 className="mt-3 font-display text-3xl font-medium text-ink">
        We couldn't find that page
      </h1>
      <p className="mt-3 text-stone-600">
        The link may be mistyped, or the booking reference doesn't exist. Double-check
        the reference from your confirmation email.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/">
          <Button variant="secondary">Home</Button>
        </Link>
        <Link href="/properties">
          <Button>Browse stays</Button>
        </Link>
      </div>
    </div>
  );
}
