import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
/** Long, thin return arrow matching the requested ⟵ silhouette, independent of other icons. */
function BackArrow() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="miter" className="shrink-0" style={{ width: "1.5em", height: ".75em" }}><path d="M30 8H2m7-4L2 8l7 4"/></svg>;
}

/** One visual language for return navigation; callers retain the correct destination. */
const style = "inline-flex min-h-11 items-center gap-1.5 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export function BackButton({ className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button {...props} type="button" className={`${style} ${className}`}><BackArrow/>Back</button>;
}
export function BackLink({ className = "", ...props }: Omit<ComponentProps<typeof Link>, "children">) {
  return <Link {...props} className={`${style} ${className}`}><BackArrow/>Back</Link>;
}
