"use client";
/**
 * Design-system primitives: Button, Badge, SectionHeading, Field/Input,
 * Card, SampleBadge, EmptyState.
 *
 * Warm neutrals, subtle stone borders, rounded-2xl, restrained shadows
 * (theme: shadow-card / shadow-lift). No gradients, no glassmorphism.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/components/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-clay text-white hover:bg-clay-dark focus-visible:ring-clay disabled:bg-stone-300",
  secondary:
    "bg-white text-ink border border-stone-300 hover:border-stone-400 hover:bg-cream focus-visible:ring-stone-400",
  ghost: "text-ink hover:bg-cream focus-visible:ring-stone-400",
  dark: "bg-ink text-paper hover:bg-espresso focus-visible:ring-ink disabled:bg-stone-300",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-4 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed",
        buttonStyles[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    />
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: "cream" | "clay" | "moss" | "stone";
  className?: string;
}

const badgeTones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  cream: "bg-cream text-espresso border-stone-200",
  clay: "bg-clay-soft text-clay-dark border-clay/20",
  moss: "bg-moss/10 text-moss border-moss/20",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
};

export function Badge({ children, tone = "cream", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Visibly labels anything not yet confirmed as real. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800",
        className,
      )}
    >
      Sample
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-display text-2xl font-medium leading-snug text-ink sm:text-3xl">
        {title}
      </h2>
      {lede && <p className="mt-3 text-base leading-relaxed text-stone-600">{lede}</p>}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, id, className, ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "mt-1.5 block w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink",
          "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-1 focus:ring-offset-paper",
          error ? "border-red-400" : "border-stone-300",
        )}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-sm text-stone-500">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200 bg-white shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-cream/60 px-6 py-10 text-center">
      <p className="font-display text-xl font-medium text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Key-value detail row used in confirmation / checkout summaries. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
