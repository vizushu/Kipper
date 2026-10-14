/**
 * iCal import → blocked ranges.
 *
 * ⚠️ BIG CAVEAT — READ THIS: iCal is a DELAYED, POLLED sync, not real-time.
 * Airbnb/Guesty iCal feeds can lag minutes to hours behind actual bookings,
 * and feeds can go stale silently. iCal import exists ONLY as a secondary
 * convenience (e.g. seeding an initial block list from an Airbnb export).
 * The app's own database is the source of truth for availability, and every
 * booking re-checks availability atomically at creation time
 * (see src/lib/db/adapter.ts). Never rely on iCal freshness to prevent
 * double bookings.
 *
 * Supported: VEVENT with DTSTART/DTEND as all-day dates (VALUE=DATE) or
 * UTC datetimes (…Z). Floating local datetimes are interpreted as
 * America/Los_Angeles dates. Multi-day events become half-open [from, to)
 * blocked ranges matching the booking convention (checkout day free).
 * Events without DTEND are treated as single-day blocks.
 */

import fs from "node:fs";
import { addDays, isValidDateStr } from "./dates";
import { newId } from "./ids";
import type { BlockedRange } from "./types";

export interface ICalImportOptions {
  propertyId: string;
  /** Reason stamped on each generated block (default "Imported from iCal"). */
  reason?: string;
}

function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Extract the date (YYYY-MM-DD) of a DTSTART/DTEND property value. */
function icalDateValue(propLine: string): string | null {
  // propLine looks like "DTSTART;VALUE=DATE:20261224" or "DTSTART:20261224T150000Z"
  const m = propLine.match(/:(.+)$/);
  if (!m) return null;
  const value = m[1].trim();
  const d = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!d) return null;
  const dateStr = `${d[1]}-${d[2]}-${d[3]}`;
  if (!isValidDateStr(dateStr)) return null;
  if (/T/.test(value)) {
    if (/Z$/.test(value)) {
      // UTC datetime → convert to LA calendar date.
      const dt = new Date(
        Date.UTC(
          Number(d[1]),
          Number(d[2]) - 1,
          Number(d[3]),
          Number(value.slice(9, 11) || 0),
          Number(value.slice(11, 13) || 0)
        )
      );
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dt);
    }
    // Floating local time → treat the calendar date as-is.
  }
  return dateStr;
}

/**
 * Parse iCal text into BlockedRange objects (not persisted — the caller
 * decides what to do with them). Throws on unparseable input.
 */
export function parseICal(text: string, opts: ICalImportOptions): BlockedRange[] {
  const reason = opts.reason ?? "Imported from iCal (delayed sync — verify before relying on it)";
  const lines = unfold(text);
  const ranges: BlockedRange[] = [];
  let inEvent = false;
  let start: string | null = null;
  let end: string | null = null;
  let summary = "";

  const flush = () => {
    if (inEvent && start) {
      const from = start;
      // iCal DTEND for an all-day event is already exclusive; for a missing
      // DTEND, block the single day.
      const to = end && end > from ? end : addDays(from, 1);
      ranges.push({
        id: newId("ical"),
        propertyId: opts.propertyId,
        from,
        to,
        reason: summary ? `${reason} — ${summary}` : reason,
      });
    }
    inEvent = false;
    start = end = null;
    summary = "";
  };

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      start = end = null;
      summary = "";
    } else if (line === "END:VEVENT") {
      flush();
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) start = icalDateValue(line);
      else if (line.startsWith("DTEND")) end = icalDateValue(line);
      else if (line.startsWith("SUMMARY:")) summary = line.slice(8).slice(0, 80);
    }
  }
  return ranges;
}

/** Fetch an iCal feed URL and parse it. The URL is fetched server-side. */
export async function importICalFromUrl(url: string, opts: ICalImportOptions): Promise<BlockedRange[]> {
  const res = await fetch(url, { headers: { "User-Agent": "casa-pacifica-direct-booking/1.0" } });
  if (!res.ok) throw new Error(`iCal fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/.test(text)) throw new Error("URL did not return iCal data (missing BEGIN:VCALENDAR).");
  return parseICal(text, opts);
}

/** Parse an iCal file from disk (e.g. an Airbnb calendar export). */
export async function importICalFile(filePath: string, opts: ICalImportOptions): Promise<BlockedRange[]> {
  const text = await fs.promises.readFile(filePath, "utf8");
  return parseICal(text, opts);
}
