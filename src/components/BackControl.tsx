import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { IconArrowLeft } from "@/components/icons";

/** One visual language for return navigation; callers retain the correct destination. */
const style = "inline-flex min-h-11 items-center gap-1.5 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export function BackButton({ className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button {...props} type="button" className={`${style} ${className}`}><IconArrowLeft className="h-4 w-4 shrink-0"/>Back</button>;
}
export function BackLink({ className = "", ...props }: Omit<ComponentProps<typeof Link>, "children">) {
  return <Link {...props} className={`${style} ${className}`}><IconArrowLeft className="h-4 w-4 shrink-0"/>Back</Link>;
}
