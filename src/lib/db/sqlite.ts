import { SqliteWorkflows } from "./sqlite-workflows";
import type { OutboxEnvelope } from "./workflows";
/**
 * SQLite DataAdapter (better-sqlite3). Default adapter.
 *
 * Database file: ./data/bookings.db relative to the process working
 * directory (the project root when running `next dev` / `next start` /
 * `vitest`). The ./data directory is created on first use.
 *
 * DOUBLE-BOOKING SAFETY: createBookingIfAvailable() runs the overlap
 * re-check (confirmed/pending_payment bookings + manual blocks) and the
 * INSERT inside a single better-sqlite3 transaction, so the check and the
 * write are atomic — two concurrent requests for the same dates cannot
 * both succeed. WAL mode is enabled for safe concurrent reads.
 *
 * Seeds on first run: pricing settings only (cleaning fee, tax rate, min/max
 * stay, promos). Availability starts FULLY OPEN — we never invent bookings
 * or blocks.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  BookingError,
  type BlockedRange,
  type Booking,
  type BookingStatus,
  type PaymentStatus,
  type Quote,
  type RateOverride,
} from "../types";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "../pricing";
import { newId, newReference } from "../ids";
import type {
  DataAdapter,
  ListBookingsFilter,
  NewBookingInput,
  SettingsPatch,
} from "./adapter";

type SqliteDb = InstanceType<typeof Database>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  property_id TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  nights INTEGER NOT NULL,
  guests_json TEXT NOT NULL,
  pets INTEGER NOT NULL DEFAULT 0,
  guest_json TEXT NOT NULL,
  line_items_json TEXT NOT NULL,
  stay_snapshot_json TEXT,
  hold_expires_at TEXT,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  cancelled_at TEXT,
  admin_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates
  ON bookings (property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings (reference);
CREATE INDEX IF NOT EXISTS idx_bookings_idem ON bookings (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_pi ON bookings (stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_blocks_property ON blocks (property_id, from_date, to_date);

CREATE TABLE IF NOT EXISTS rate_overrides (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  date TEXT NOT NULL,
  rate_cents INTEGER NOT NULL,
  UNIQUE (property_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotes_expires ON quotes (expires_at);
`;

function resolveDbPath(dbPath?: string): string {
  const file = dbPath ?? process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "bookings.db");
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return file;
}

interface BookingRow {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests_json: string;
  pets: number;
  guest_json: string;
  line_items_json: string;
  stay_snapshot_json: string | null;
  hold_expires_at: string | null;
  total_cents: number;
  currency: "USD";
  status: BookingStatus;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  idempotency_key: string;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
}

function rowToBooking(r: BookingRow): Booking {
  return {
    holdExpiresAt: r.hold_expires_at ?? undefined,
    id: r.id,
    reference: r.reference,
    propertyId: r.property_id,
    checkIn: r.check_in,
    checkOut: r.check_out,
    nights: r.nights,
    guests: JSON.parse(r.guests_json),
    pets: r.pets,
    guest: JSON.parse(r.guest_json),
    lineItems: JSON.parse(r.line_items_json),
    staySnapshot: r.stay_snapshot_json ? JSON.parse(r.stay_snapshot_json) : undefined,
    totalCents: r.total_cents,
    currency: r.currency,
    status: r.status,
    paymentStatus: r.payment_status,
    stripePaymentIntentId: r.stripe_payment_intent_id ?? undefined,
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    adminNotes: r.admin_notes ?? undefined,
  };
}

const SETTING_KEYS = [
  "cleaningFeeCents",
  "taxRatePct",
  "minStayNights",
  "maxStayNights",
  "promos",
] as const;

export class SqliteAdapter implements DataAdapter {
  private db: SqliteDb;
  private workflows: SqliteWorkflows;

  constructor(dbPath?: string) {
    this.db = new Database(resolveDbPath(dbPath));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA);
    const columns = this.db.prepare("PRAGMA table_info(bookings)").all() as {name: string}[];
    if (!columns.some(c => c.name === "stay_snapshot_json")) this.db.exec("ALTER TABLE bookings ADD COLUMN stay_snapshot_json TEXT");
    if (!columns.some(c => c.name === "hold_expires_at")) this.db.exec("ALTER TABLE bookings ADD COLUMN hold_expires_at TEXT");
    this.workflows = new SqliteWorkflows(this.db, (id) => {const row=this.db.prepare("SELECT * FROM bookings WHERE id=?").get(id) as BookingRow|undefined;return row?rowToBooking(row):null;});
    this.seedSettingsIfEmpty();
  }

  // ---- settings ----------------------------------------------------------
  private seedSettingsIfEmpty(): void {
    const count = (this.db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number }).n;
    if (count > 0) return;
    const seed: Record<string, unknown> = {
      cleaningFeeCents: DEFAULT_PRICING_SETTINGS.cleaningFeeCents,
      taxRatePct: DEFAULT_PRICING_SETTINGS.taxRatePct,
      minStayNights: DEFAULT_PRICING_SETTINGS.minStayNights,
      maxStayNights: DEFAULT_PRICING_SETTINGS.maxStayNights,
      promos: DEFAULT_PRICING_SETTINGS.promos,
    };
    const ins = this.db.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?)");
    const tx = this.db.transaction(() => {
      for (const k of SETTING_KEYS) ins.run(k, JSON.stringify(seed[k]));
    });
    tx();
  }

  async getSettings(): Promise<PricingSettings> {
    const rows = this.db.prepare("SELECT key, value_json FROM settings").all() as {
      key: string;
      value_json: string;
    }[];
    const map = new Map(rows.map((r) => [r.key, JSON.parse(r.value_json)]));
    return {
      cleaningFeeCents: map.get("cleaningFeeCents") ?? DEFAULT_PRICING_SETTINGS.cleaningFeeCents,
      taxRatePct: map.get("taxRatePct") ?? DEFAULT_PRICING_SETTINGS.taxRatePct,
      minStayNights: map.get("minStayNights") ?? DEFAULT_PRICING_SETTINGS.minStayNights,
      maxStayNights: map.get("maxStayNights") ?? DEFAULT_PRICING_SETTINGS.maxStayNights,
      promos: map.get("promos") ?? DEFAULT_PRICING_SETTINGS.promos,
    };
  }

  async updateSettings(patch: SettingsPatch): Promise<PricingSettings> {
    const upsert = this.db.prepare(
      "INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json"
    );
    const tx = this.db.transaction(() => {
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined && (SETTING_KEYS as readonly string[]).includes(k)) {
          upsert.run(k, JSON.stringify(v));
        }
      }
    });
    tx();
    return this.getSettings();
  }

  // ---- bookings -----------------------------------------------------------
  async createBookingIfAvailable(input: NewBookingInput): Promise<Booking> {
    const nowIso = new Date().toISOString();
    const holdExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const id = newId("bk");

    const tx = this.db.transaction((reference: string) => {
      this.expirePendingNow(nowIso);
      // 1) Re-check availability INSIDE the transaction.
      const overlap = this.db
        .prepare(
          `SELECT id FROM bookings
           WHERE property_id = ?
             AND status IN ('confirmed', 'pending_payment')
             AND check_in < ? AND check_out > ?
           LIMIT 1`
        )
        .get(input.propertyId, input.checkOut, input.checkIn) as { id: string } | undefined;
      if (overlap) {
        throw new BookingError(
          "UNAVAILABLE",
          "Those dates just became unavailable — another booking was completed first. Please pick different dates."
        );
      }
      const blocked = this.db
        .prepare(
          `SELECT id, reason FROM blocks
           WHERE property_id = ?
             AND from_date < ? AND to_date > ?
           LIMIT 1`
        )
        .get(input.propertyId, input.checkOut, input.checkIn) as
        | { id: string; reason: string }
        | undefined;
      if (blocked) {
        throw new BookingError(
          "UNAVAILABLE",
          `Those dates are blocked${blocked.reason ? `: ${blocked.reason}` : "."}`
        );
      }
      // 2) Insert. UNIQUE(idempotency_key) makes a retried request fail here
      // instead of creating a duplicate booking.
      try {
        this.db
          .prepare(
            `INSERT INTO bookings (
               id, reference, property_id, check_in, check_out, nights,
               guests_json, pets, guest_json, line_items_json, total_cents,
               currency, status, payment_status, idempotency_key, created_at, stay_snapshot_json, hold_expires_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'unpaid', ?, ?, ?, ?)`
          )
          .run(
            id,
            reference,
            input.propertyId,
            input.checkIn,
            input.checkOut,
            input.nights,
            JSON.stringify(input.guests),
            input.pets,
            JSON.stringify(input.guest),
            JSON.stringify(input.lineItems),
            input.totalCents,
            input.currency,
            input.idempotencyKey,
            nowIso,
            input.staySnapshot ? JSON.stringify(input.staySnapshot) : null,
            holdExpiresAt
          );
      } catch (err) {
        if (err instanceof Error && /UNIQUE constraint failed: bookings\.idempotency_key/.test(err.message)) {
          throw new BookingError(
            "DUPLICATE",
            "A booking with this idempotency key already exists."
          );
        }
        throw err;
      }
      return reference;
    });

    // Reference collisions are astronomically unlikely; retry a few times.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        tx.immediate(newReference());
        const created = await this.getBooking(id);
        if (!created) throw new Error("Booking insert did not persist.");
        return created;
      } catch (err) {
        if (err instanceof Error && /UNIQUE constraint failed: bookings\.reference/.test(err.message)) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Failed to create booking.");
  }

  private expirePendingNow(now: string): number {
    return this.db.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ?, admin_notes = coalesce(admin_notes || '\n', '') || 'Payment hold expired; late payment requires manual review.' WHERE status = 'pending_payment' AND hold_expires_at IS NOT NULL AND hold_expires_at <= ?`).run(now, now).changes;
  }

  async expirePendingBookings(now = new Date().toISOString()): Promise<number> {
    return this.db.transaction(() => this.expirePendingNow(now)).immediate();
  }

  async attachPaymentIntent(id: string, paymentIntentId: string): Promise<Booking | null> {
    return this.db.transaction(() => {
      this.expirePendingNow(new Date().toISOString());
      this.db.prepare(`UPDATE bookings SET stripe_payment_intent_id = ? WHERE id = ? AND status = 'pending_payment' AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = ?)`).run(paymentIntentId, id, paymentIntentId);
      const row = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
      return row && row.status === 'pending_payment' && row.stripe_payment_intent_id === paymentIntentId ? rowToBooking(row) : null;
    }).immediate();
  }

  async failPendingBookingPayment(id: string, paymentIntentId: string): Promise<boolean> {
    const result = this.db.prepare(`UPDATE bookings SET payment_status = 'failed' WHERE id = ? AND stripe_payment_intent_id = ? AND status = 'pending_payment'`).run(id, paymentIntentId);
    return result.changes > 0;
  }

  async confirmBookingPayment(id: string, paymentIntentId: string, confirmedAt: string): Promise<{booking: Booking; transitioned: boolean} | null> {
    return this.db.transaction(() => {
      this.expirePendingNow(new Date().toISOString());
      const row = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
      if (!row || row.stripe_payment_intent_id !== paymentIntentId || row.status === 'cancelled') return null;
      if (row.status === 'confirmed') return {booking: rowToBooking(row), transitioned: false};
      // A newly imported/manual block may invalidate a previously free hold.
      const block = this.db.prepare('SELECT id FROM blocks WHERE property_id = ? AND from_date < ? AND to_date > ? LIMIT 1').get(row.property_id, row.check_out, row.check_in);
      const overlap = this.db.prepare(`SELECT id FROM bookings WHERE id != ? AND property_id = ? AND status IN ('confirmed', 'pending_payment') AND check_in < ? AND check_out > ? LIMIT 1`).get(id, row.property_id, row.check_out, row.check_in);
      if (block || overlap) return null;
      this.db.prepare(`UPDATE bookings SET status = 'confirmed', payment_status = 'paid_test', confirmed_at = ? WHERE id = ? AND status = 'pending_payment' AND stripe_payment_intent_id = ?`).run(confirmedAt, id, paymentIntentId);
      const confirmed = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow;
      this.workflows.queueReceipts(rowToBooking(confirmed), confirmedAt);
      return {booking: rowToBooking(confirmed), transitioned: true};
    }).immediate();
  }

  ensureReceiptOutbox = (id:string) => this.workflows.ensureReceiptOutbox(id);
  claimOutbox = (now:string,limit:number,jobId?:string) => this.workflows.claimOutbox(now,limit,jobId);
  prepareOutboxMessage = (id:string,lease:string,envelope:OutboxEnvelope,now:string) => this.workflows.prepareOutboxMessage(id,lease,envelope,now);
  finishOutbox = (id:string,lease:string,outcome:'sent'|'simulated'|'failed',now:string) => this.workflows.finishOutbox(id,lease,outcome,now);
  listOutbox = () => this.workflows.listOutbox();
  consumeRecoveryRateLimit = (bucket:string,window:string,limit:number) => this.workflows.consumeRecoveryRateLimit(bucket,window,limit);
  createBookingRecovery: SqliteWorkflows['createBookingRecovery'] = (input,notification) => this.workflows.createBookingRecovery(input,notification);
  consumeBookingRecovery = (hash:string,now:string) => this.workflows.consumeBookingRecovery(hash,now);

  async getBooking(id: string): Promise<Booking | null> {
    const row = this.db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
    return row ? rowToBooking(row) : null;
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    const row = this.db
      .prepare("SELECT * FROM bookings WHERE reference = ?")
      .get(reference.trim().toUpperCase()) as BookingRow | undefined;
    return row ? rowToBooking(row) : null;
  }

  async getBookingByIdempotencyKey(key: string): Promise<Booking | null> {
    const row = this.db
      .prepare("SELECT * FROM bookings WHERE idempotency_key = ?")
      .get(key) as BookingRow | undefined;
    return row ? rowToBooking(row) : null;
  }

  async getBookingByPaymentIntentId(paymentIntentId: string): Promise<Booking | null> {
    const row = this.db
      .prepare("SELECT * FROM bookings WHERE stripe_payment_intent_id = ?")
      .get(paymentIntentId) as BookingRow | undefined;
    return row ? rowToBooking(row) : null;
  }

  async updateBooking(
    id: string,
    patch: {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
      stripePaymentIntentId?: string;
      confirmedAt?: string;
      cancelledAt?: string;
      adminNotes?: string;
    }
  ): Promise<Booking | null> {
    if (Object.keys(patch).some(k => k !== "adminNotes")) throw new Error("Use atomic booking lifecycle methods for state changes.");
    const sets: string[] = [];
    const vals: unknown[] = [];
    const map: Record<string, string> = {
      status: "status",
      paymentStatus: "payment_status",
      stripePaymentIntentId: "stripe_payment_intent_id",
      confirmedAt: "confirmed_at",
      cancelledAt: "cancelled_at",
      adminNotes: "admin_notes",
    };
    for (const [k, col] of Object.entries(map)) {
      const v = (patch as Record<string, unknown>)[k];
      if (v !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return this.getBooking(id);
    this.db.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    return this.getBooking(id);
  }

  async cancelBooking(id: string): Promise<Booking | null> {
    this.db.prepare("UPDATE bookings SET status='cancelled', cancelled_at=coalesce(cancelled_at,?) WHERE id=?").run(new Date().toISOString(),id);
    return this.getBooking(id);
  }

  async listBookings(filter: ListBookingsFilter = {}): Promise<Booking[]> {
    await this.expirePendingBookings();
    const conds: string[] = [];
    const vals: unknown[] = [];
    if (filter.propertyId) {
      conds.push("property_id = ?");
      vals.push(filter.propertyId);
    }
    if (filter.status) {
      conds.push("status = ?");
      vals.push(filter.status);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT * FROM bookings ${where} ORDER BY created_at DESC`)
      .all(...vals) as BookingRow[];
    return rows.map(rowToBooking);
  }

  async findOverlappingBookings(propertyId: string, checkIn: string, checkOut: string): Promise<Booking[]> {
    await this.expirePendingBookings();
    const rows = this.db
      .prepare(
        `SELECT * FROM bookings
         WHERE property_id = ?
           AND status IN ('confirmed', 'pending_payment')
           AND check_in < ? AND check_out > ?
         ORDER BY check_in`
      )
      .all(propertyId, checkOut, checkIn) as BookingRow[];
    return rows.map(rowToBooking);
  }

  // ---- blocks --------------------------------------------------------------
  async listBlocks(propertyId: string): Promise<BlockedRange[]> {
    const rows = this.db
      .prepare("SELECT * FROM blocks WHERE property_id = ? ORDER BY from_date")
      .all(propertyId) as { id: string; property_id: string; from_date: string; to_date: string; reason: string }[];
    return rows.map((r) => ({
      id: r.id,
      propertyId: r.property_id,
      from: r.from_date,
      to: r.to_date,
      reason: r.reason,
    }));
  }

  async createBlock(input: { propertyId: string; from: string; to: string; reason: string }): Promise<BlockedRange> {
    const id = newId("blk");
    this.db
      .prepare("INSERT INTO blocks (id, property_id, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?)")
      .run(id, input.propertyId, input.from, input.to, input.reason);
    return { id, propertyId: input.propertyId, from: input.from, to: input.to, reason: input.reason };
  }

  async deleteBlock(id: string): Promise<boolean> {
    const res = this.db.prepare("DELETE FROM blocks WHERE id = ?").run(id);
    return res.changes > 0;
  }

  // ---- rate overrides --------------------------------------------------------
  async getRateOverrides(propertyId: string, from: string, to: string): Promise<RateOverride[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM rate_overrides WHERE property_id = ? AND date >= ? AND date < ? ORDER BY date"
      )
      .all(propertyId, from, to) as { id: string; property_id: string; date: string; rate_cents: number }[];
    return rows.map((r) => ({ id: r.id, propertyId: r.property_id, date: r.date, rateCents: r.rate_cents }));
  }

  async upsertRateOverride(propertyId: string, date: string, rateCents: number): Promise<RateOverride> {
    const id = newId("rate");
    this.db
      .prepare(
        `INSERT INTO rate_overrides (id, property_id, date, rate_cents)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(property_id, date) DO UPDATE SET rate_cents = excluded.rate_cents`
      )
      .run(id, propertyId, date, rateCents);
    const row = this.db
      .prepare("SELECT * FROM rate_overrides WHERE property_id = ? AND date = ?")
      .get(propertyId, date) as { id: string; property_id: string; date: string; rate_cents: number };
    return { id: row.id, propertyId: row.property_id, date: row.date, rateCents: row.rate_cents };
  }

  // ---- quotes ------------------------------------------------------------------
  async saveQuote(quote: Quote): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO quotes (id, payload_json, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, expires_at = excluded.expires_at`
      )
      .run(quote.id, JSON.stringify(quote), quote.expiresAt);
  }

  async getQuote(id: string): Promise<Quote | null> {
    const row = this.db.prepare("SELECT * FROM quotes WHERE id = ?").get(id) as
      | { id: string; payload_json: string; expires_at: string }
      | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.db.prepare("DELETE FROM quotes WHERE id = ?").run(id);
      return null;
    }
    return JSON.parse(row.payload_json) as Quote;
  }

  async deleteExpiredQuotes(): Promise<number> {
    const res = this.db
      .prepare("DELETE FROM quotes WHERE expires_at <= ?")
      .run(new Date().toISOString());
    return Number(res.changes);
  }

  close(): void {
    this.db.close();
  }
}
