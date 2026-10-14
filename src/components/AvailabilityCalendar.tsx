"use client";
/**
 * AvailabilityCalendar — month navigation, multi-month view, range select.
 *
 * - Fetches /api/availability for the visible window.
 * - Unavailable days (booked / blocked / past) are not selectable.
 * - Min-stay is validated against each night's minStayNights; violations
 *   are explained in plain language, never silently ignored.
 * - Price preview: per-day rates in cells + stay total under the calendar.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { formatCents, type AvailabilityDay } from "@/lib/types";
import { cn } from "@/components/cn";

export interface DateRange {
  checkIn: string;
  checkOut: string;
}

interface Props {
  propertyId: string;
  range: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
  monthsVisible?: number;
  onValidationError?: (message: string | null) => void;
}

/* ---------- date helpers (America/Los_Angeles dates as YYYY-MM-DD) ---------- */

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDaysISO(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function diffNights(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
function monthStart(offset: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AvailabilityCalendar({
  propertyId,
  range,
  onRangeChange,
  monthsVisible = 2,
  onValidationError,
}: Props) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [days, setDays] = useState<Record<string, AvailabilityDay>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const windowFrom = toISO(monthStart(monthOffset));
  const windowTo = toISO(new Date(monthStart(monthOffset + monthsVisible).getTime()));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(
      `/api/availability?propertyId=${encodeURIComponent(propertyId)}&from=${windowFrom}&to=${windowTo}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("availability");
        return r.json();
      })
      .then((data: { days: AvailabilityDay[] }) => {
        if (cancelled) return;
        const map: Record<string, AvailabilityDay> = {};
        for (const d of data.days) map[d.date] = d;
        setDays(map);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, windowFrom, windowTo, retryKey]);

  const reportValidation = useCallback(
    (msg: string | null) => {
      setValidationError(msg);
      onValidationError?.(msg);
    },
    [onValidationError],
  );

  /** Validate a candidate range; returns error message or null. */
  function validate(checkIn: string, checkOut: string): string | null {
    const nights = diffNights(checkIn, checkOut);
    if (nights <= 0) return "Check-out must be after check-in.";
    let minStay = 1;
    for (let i = 0; i < nights; i++) {
      const day = days[addDaysISO(checkIn, i)];
      if (!day || !day.available) {
        return "Some nights in that range are already booked — try different dates.";
      }
      minStay = Math.max(minStay, day.minStayNights);
    }
    if (nights < minStay) {
      return `This stay needs at least ${minStay} night${minStay === 1 ? "" : "s"} — your dates cover ${nights}.`;
    }
    return null;
  }

  function pick(date: string) {
    const day = days[date];
    if (!day?.available) return;
    if (!range || (range.checkIn && range.checkOut)) {
      // start a new range
      onRangeChange({ checkIn: date, checkOut: "" });
      reportValidation(null);
      setHover(null);
      return;
    }
    // completing a range
    const { checkIn } = range;
    if (date === checkIn) {
      onRangeChange(null);
      reportValidation(null);
      return;
    }
    const [from, to] = date < checkIn ? [date, checkIn] : [checkIn, date];
    const err = validate(from, to);
    if (err) {
      // keep the original check-in, explain the problem
      reportValidation(err);
      onRangeChange({ checkIn: from, checkOut: "" });
    } else {
      reportValidation(null);
      onRangeChange({ checkIn: from, checkOut: to });
    }
  }

  const stayTotal = useMemo(() => {
    if (!range?.checkIn || !range?.checkOut) return null;
    const nights = diffNights(range.checkIn, range.checkOut);
    let total = 0;
    for (let i = 0; i < nights; i++) {
      const day = days[addDaysISO(range.checkIn, i)];
      if (!day?.available) return null;
      total += day.nightlyRateCents;
    }
    return { nights, total };
  }, [range, days]);

  const months = useMemo(
    () => Array.from({ length: monthsVisible }, (_, i) => monthStart(monthOffset + i)),
    [monthOffset, monthsVisible],
  );

  function renderMonth(first: Date) {
    const year = first.getFullYear();
    const month = first.getMonth();
    const leadBlanks = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<string | null> = [
      ...Array<null>(leadBlanks).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        toISO(new Date(year, month, i + 1)),
      ),
    ];

    return (
      <div key={`${year}-${month}`} className="min-w-0">
        <p className="mb-2 text-center font-display text-lg font-medium text-ink">
          {monthLabel(first)}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <span key={w} className="py-1 text-center text-[11px] font-medium text-stone-400">
              {w}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={`b-${i}`} />;
            const day = days[date];
            const available = day?.available ?? false;
            const isCheckIn = range?.checkIn === date;
            const isCheckOut = range?.checkOut === date;
            const inRange =
              range?.checkIn &&
              range?.checkOut &&
              date > range.checkIn &&
              date < range.checkOut;
            const hoverInRange =
              range?.checkIn &&
              !range?.checkOut &&
              hover &&
              ((hover > range.checkIn && date > range.checkIn && date <= hover) ||
                (hover < range.checkIn && date < range.checkIn && date >= hover));

            return (
              <button
                key={date}
                type="button"
                disabled={!available}
                onClick={() => pick(date)}
                onMouseEnter={() => setHover(date)}
                aria-label={`${date}${available && day ? `, ${formatCents(day.nightlyRateCents)} per night` : ", unavailable"}`}
                className={cn(
                  "flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                  !available && "cursor-not-allowed text-stone-300 line-through",
                  available && !isCheckIn && !isCheckOut && !inRange && !hoverInRange &&
                    "text-ink hover:bg-cream",
                  (inRange || hoverInRange) && "bg-clay-soft text-clay-dark",
                  (isCheckIn || isCheckOut) && "bg-clay text-white",
                )}
              >
                <span className="font-medium leading-none">{parseISO(date).getDate()}</span>
                {available && day && (
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] leading-none",
                      isCheckIn || isCheckOut ? "text-white/80" : "text-stone-400",
                    )}
                  >
                    {formatCents(day.nightlyRateCents)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          aria-label="Previous month"
          className="rounded-full p-2 text-ink hover:bg-cream disabled:opacity-30"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-clay" /> Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-stone-200" /> Unavailable
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o + 1)}
          aria-label="Next month"
          className="rounded-full p-2 text-ink hover:bg-cream"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2" aria-label="Loading availability">
          {Array.from({ length: monthsVisible }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-cream" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-stone-200 bg-cream px-6 py-8 text-center">
          <p className="font-medium text-ink">Availability isn't loading right now</p>
          <p className="mt-1 text-sm text-stone-500">
            Please try again in a moment — your dates are safe.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-3 text-sm font-medium text-clay underline-offset-4 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">{months.map(renderMonth)}</div>
      )}

      {validationError && (
        <p role="alert" className="mt-3 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay-dark">
          {validationError}
        </p>
      )}

      {stayTotal && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-cream px-4 py-3">
          <span className="text-sm text-stone-600">
            {stayTotal.nights} night{stayTotal.nights === 1 ? "" : "s"} · avg{" "}
            {formatCents(Math.round(stayTotal.total / stayTotal.nights))}/night
          </span>
          <span className="text-lg font-semibold text-ink">{formatCents(stayTotal.total)}</span>
        </div>
      )}
      {!stayTotal && !validationError && (
        <p className="mt-3 text-center text-sm text-stone-500">
          Select your check-in and check-out dates.
        </p>
      )}
    </div>
  );
}
