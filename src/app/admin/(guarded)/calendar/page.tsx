"use client";
/**
 * /admin/calendar — month view with booked/blocked days + block-dates form.
 *
 * Data: /api/admin/bookings (booked ranges), /api/admin/blocks (blocked
 * ranges). Blocked ranges can be removed from the list below the calendar.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/icons";
import { CASA_PACIFICA_ID } from "@/data/public-config";
import type { BlockedRange, Booking } from "@/lib/types";
import { cn } from "@/components/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date < to;
}

export default function AdminCalendarPage() {
  const [offset, setOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BlockedRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ from: "", to: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, blRes] = await Promise.all([
        fetch("/api/admin/bookings"),
        fetch(`/api/admin/blocks?propertyId=${CASA_PACIFICA_ID}`),
      ]);
      if (!bRes.ok || !blRes.ok) throw new Error("load");
      const b = (await bRes.json()) as { bookings: Booking[] };
      const bl = (await blRes.json()) as { blocks: BlockedRange[] };
      setBookings(b.bookings ?? []);
      setBlocks(bl.blocks ?? []);
    } catch {
      setError("Couldn't load calendar data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.from || !form.to || form.to <= form.from) {
      setFormError("Pick a valid date range (check-out after check-in).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: CASA_PACIFICA_ID,
          from: form.from,
          to: form.to,
          reason: form.reason.trim() || "Blocked by host",
        }),
      });
      if (!res.ok) throw new Error("save");
      setForm({ from: "", to: "", reason: "" });
      await load();
    } catch {
      setFormError("Couldn't save that block. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    try {
      const res = await fetch(`/api/admin/blocks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete");
      await load();
    } catch {
      setError("Couldn't remove that block.");
    }
  }

  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [offset]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const lead = new Date(year, m, 1).getDay();
    const count = new Date(year, m + 1, 0).getDate();
    return [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: count }, (_, i) => toISO(new Date(year, m, i + 1))),
    ];
  }, [month]);

  function dayState(date: string): "booked" | "blocked" | null {
    if (bookings.some((b) => b.status !== "cancelled" && inRange(date, b.checkIn, b.checkOut)))
      return "booked";
    if (blocks.some((b) => inRange(date, b.from, b.to))) return "blocked";
    return null;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Calendar</h1>
      <p className="mt-1 text-sm text-stone-500">Casa Pacifica · booked and blocked dates</p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous month"
              className="rounded-full p-2 hover:bg-cream"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-display text-lg font-medium">
              {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next month"
              className="rounded-full p-2 hover:bg-cream"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-cream" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-center text-[11px] font-medium text-stone-400">
                  {w}
                </span>
              ))}
              {cells.map((date, i) =>
                date === null ? (
                  <span key={`b-${i}`} />
                ) : (
                  <span
                    key={date}
                    title={
                      dayState(date) === "booked"
                        ? "Booked"
                        : dayState(date) === "blocked"
                          ? "Blocked"
                          : "Available"
                    }
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-sm",
                      dayState(date) === "booked" && "bg-ink font-medium text-paper",
                      dayState(date) === "blocked" && "bg-clay-soft font-medium text-clay-dark line-through",
                      !dayState(date) && "text-stone-500",
                    )}
                  >
                    {parseISO(date).getDate()}
                  </span>
                ),
              )}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-ink" /> Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-clay-soft" /> Blocked
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={addBlock} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-medium text-ink">Block dates</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-stone-500">From</span>
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500">To</span>
                <input
                  type="date"
                  value={form.to}
                  min={form.from}
                  onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-stone-500">Reason</span>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Owner stay, maintenance"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
              />
            </label>
            {formError && (
              <p role="alert" className="mt-2 text-sm text-red-600">{formError}</p>
            )}
            <Button type="submit" disabled={saving} className="mt-4 w-full">
              {saving ? "Saving…" : "Block dates"}
            </Button>
          </form>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-medium text-ink">
              Active blocks ({blocks.length})
            </h2>
            {blocks.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No blocked dates" body="Blocked ranges you add will show up here." />
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2.5 text-sm"
                  >
                    <span>
                      <span className="font-medium text-ink">
                        {b.from} → {b.to}
                      </span>
                      <br />
                      <span className="text-xs text-stone-500">{b.reason}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      aria-label={`Remove block ${b.from} to ${b.to}`}
                      className="rounded-full p-1.5 text-stone-500 hover:bg-white hover:text-red-600"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <Badge tone="stone">Bookings come from the reservations table</Badge>
      </div>
    </div>
  );
}
