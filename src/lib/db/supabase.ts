import type {CalendarSnapshot,CalendarStatus} from "./calendar-store";
import { rateLimitWindow,securityTimestamp,validateAdminSession,validateSecurityHash,type AdminSession,type RateLimitResult } from "./security-store";
import { validatePaymentException, type PaymentException, type PaymentExceptionInput } from "./payment-exceptions";
import { storedPaymentMode } from "../payment-mode";
import type { OutboxEnvelope, OutboxJob } from "./workflows";
/**
 * Supabase (Postgres) DataAdapter, via the Supabase PostgREST REST API.
 *
 * Enabled with DATA_ADAPTER=supabase. Requires:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
 *
 * If either is missing, every method throws a clear "not configured" error.
 * The service_role key is used because all access happens server-side
 * (API routes); Row Level Security is enabled with no public policies
 * (see supabase/schema.sql).
 *
 * DOUBLE-BOOKING SAFETY: createBookingIfAvailable() calls the Postgres
 * function `create_booking_if_available(jsonb)` (defined in
 * supabase/schema.sql), which runs the overlap re-check and the INSERT in a
 * single database transaction.
 *
 * NOTE: no extra dependencies — plain fetch against the REST API.
 */

import { BookingError, type Booking, type Quote } from "../types";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "../pricing";
import type {
  DataAdapter,
  ListBookingsFilter,
  NewBookingInput,
  SettingsPatch,
} from "./adapter";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (DATA_ADAPTER=supabase)."
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

function config(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseNotConfiguredError();
  return { url: url.replace(/\/$/, ""), key };
}

interface SnakeBooking {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: { adults: number; children: number; infants: number };
  pets: number;
  guest: { name: string; email: string; phone?: string };
  stay_snapshot?: Booking["staySnapshot"];
  hold_expires_at?: string | null;
  line_items: { label: string; detail?: string; amountCents: number }[];
  total_cents: number;
  currency: "USD";
  status: Booking["status"];
  payment_status: Booking["paymentStatus"];
  payment_mode?: Booking["paymentMode"];
  stripe_payment_intent_id: string | null;
  idempotency_key: string;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
}

function toBooking(r: SnakeBooking): Booking {
  return {
    id: r.id,
    reference: r.reference,
    propertyId: r.property_id,
    checkIn: r.check_in,
    checkOut: r.check_out,
    nights: r.nights,
    guests: r.guests,
    pets: r.pets,
    guest: r.guest,
    lineItems: r.line_items,
    staySnapshot: r.stay_snapshot ?? undefined,
    holdExpiresAt: r.hold_expires_at ?? undefined,
    totalCents: r.total_cents,
    currency: r.currency,
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMode: storedPaymentMode(r.payment_mode),
    stripePaymentIntentId: r.stripe_payment_intent_id ?? undefined,
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    adminNotes: r.admin_notes ?? undefined,
  };
}

interface SnakeOutbox {
  id:string; booking_id:string; kind:OutboxJob['kind']; dedupe_key:string; status:OutboxJob['status'];
  payload_json: {booking?:SnakeBooking|Booking;recovery?:NonNullable<OutboxJob['payload']['recovery']>};
  envelope_json:OutboxEnvelope|null; attempts:number; created_at:string; next_attempt_at:string;
  first_attempt_at:string|null; lease_token:string|null; lease_until:string|null; last_error:string|null;
}
function toOutbox(row: SnakeOutbox): OutboxJob {
  const frozen = row.payload_json.booking;
  const booking = frozen && ('property_id' in frozen ? toBooking(frozen) : frozen);
  return {id:row.id,bookingId:row.booking_id,kind:row.kind,dedupeKey:row.dedupe_key,status:row.status,
    payload:{...row.payload_json,...(booking?{booking}:{})} as OutboxJob['payload'],
    envelope:row.envelope_json??undefined,attempts:row.attempts,createdAt:row.created_at,nextAttemptAt:row.next_attempt_at,
    firstAttemptAt:row.first_attempt_at??undefined,leaseToken:row.lease_token??undefined,leaseUntil:row.lease_until??undefined,lastError:row.last_error??undefined};
}

interface SnakePaymentException {
  id:string; payment_intent_id:string; payment_mode:'test'|'live'; booking_id:string|null;
  amount_cents:number; amount_received_cents:number; currency:string; reason:PaymentException['reason'];
  status:'open'|'reviewed'; first_seen_at:string; last_seen_at:string; event_count:number;
  attention_required:boolean; reviewed_at:string|null; review_note:string|null;
}
function toPaymentException(row:SnakePaymentException):PaymentException {
  return {id:row.id,paymentIntentId:row.payment_intent_id,paymentMode:row.payment_mode,bookingId:row.booking_id??undefined,
    amountCents:row.amount_cents,amountReceivedCents:row.amount_received_cents,currency:row.currency,reason:row.reason,
    status:row.status,firstSeenAt:row.first_seen_at,lastSeenAt:row.last_seen_at,eventCount:row.event_count,
    attentionRequired:row.attention_required,reviewedAt:row.reviewed_at??undefined,reviewNote:row.review_note??undefined};
}

export class SupabaseAdapter implements DataAdapter {
  private base: string;
  private key: string;

  constructor() {
    const { url, key } = config();
    this.base = `${url}/rest/v1`;
    this.key = key;
  }

  private async req<T>(
    method: string,
    path: string,
    body?: unknown,
    prefer?: string
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.message ?? j.error ?? text;
      } catch {
        /* keep raw text */
      }
      throw new Error(`Supabase REST ${method} ${path} → ${res.status}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  async consumeRateLimit(keyHash:string,limit:number,windowSeconds:number,nowISO=new Date().toISOString()):Promise<RateLimitResult> {
    rateLimitWindow(keyHash,limit,windowSeconds,nowISO);
    return this.req('POST','/rpc/consume_security_rate_limit',{p_key_hash:keyHash,p_limit:limit,p_window_seconds:windowSeconds,p_now:nowISO});
  }
  async createAdminSession(session:AdminSession):Promise<void> {
    validateAdminSession(session);
    await this.req('POST','/rpc/create_admin_session',{p_session:{tokenHash:session.tokenHash,secretVersion:session.secretVersion,createdAt:session.createdAt,expiresAt:session.expiresAt,revokedAt:session.revokedAt}});
  }
  async getAdminSession(tokenHash:string):Promise<AdminSession|null> {
    validateSecurityHash(tokenHash);
    return this.req('POST','/rpc/get_admin_session',{p_token_hash:tokenHash,p_now:new Date().toISOString()});
  }
  async revokeAdminSession(tokenHash:string,nowISO:string):Promise<boolean> {
    validateSecurityHash(tokenHash);securityTimestamp(nowISO);
    return this.req('POST','/rpc/revoke_admin_session',{p_token_hash:tokenHash,p_now:nowISO});
  }

  async recordPaymentException(input:PaymentExceptionInput):Promise<{exception:PaymentException;created:boolean}> {
    validatePaymentException(input);
    // Explicit projection: never forward an accidental provider payload or guest fields.
    const evidence = {paymentIntentId:input.paymentIntentId,providerEventId:input.providerEventId,
      bookingId:input.bookingId,paymentMode:input.paymentMode,amountCents:input.amountCents,
      amountReceivedCents:input.amountReceivedCents,currency:input.currency.toLowerCase(),reason:input.reason};
    const result = await this.req<{exception:SnakePaymentException;created:boolean}>('POST','/rpc/record_payment_exception',{p_input:evidence});
    return {exception:toPaymentException(result.exception),created:result.created};
  }
  async listPaymentExceptions():Promise<PaymentException[]> {
    return (await this.req<SnakePaymentException[]>('GET','/payment_exceptions?order=first_seen_at.desc,id.asc')).map(toPaymentException);
  }
  async reviewPaymentException(id:string,note:string,idempotencyKey:string):Promise<PaymentException|null> {
    if(note.trim().length<10||note.length>1000||idempotencyKey.length<8||idempotencyKey.length>128)throw new Error('Review needs an explanatory note and idempotency key.');
    const result = await this.req<SnakePaymentException|null>('POST','/rpc/review_payment_exception',{p_id:id,p_note:note.trim(),p_idempotency_key:idempotencyKey});
    return result ? toPaymentException(result) : null;
  }

  async ensureReceiptOutbox(bookingId: string): Promise<void> {
    await this.req('POST', '/rpc/ensure_receipt_outbox', {p_booking_id:bookingId});
  }
  async claimOutbox(now: string, limit: number, jobId?: string): Promise<OutboxJob[]> {
    const rows = await this.req<SnakeOutbox[]>('POST', '/rpc/claim_delivery_outbox', {p_now:now,p_limit:limit,p_job_id:jobId??null});
    return rows.map(toOutbox);
  }
  async prepareOutboxMessage(id: string, leaseToken: string, envelope: OutboxEnvelope, now: string): Promise<OutboxEnvelope|null> {
    return this.req('POST', '/rpc/prepare_outbox_message', {p_id:id,p_lease_token:leaseToken,p_envelope:envelope,p_now:now});
  }
  async finishOutbox(id: string, leaseToken: string, outcome: 'sent'|'simulated'|'failed', now: string): Promise<boolean> {
    return this.req('POST', '/rpc/finish_delivery_outbox', {p_id:id,p_lease_token:leaseToken,p_outcome:outcome,p_now:now});
  }
  async listOutbox(): Promise<OutboxJob[]> {
    return (await this.req<SnakeOutbox[]>('GET','/delivery_outbox?order=created_at.asc,id.asc')).map(toOutbox);
  }
  async consumeRecoveryRateLimit(bucketHash: string, windowStartISO: string, limit: number): Promise<boolean> {
    return this.req('POST','/rpc/consume_recovery_rate_limit',{p_bucket_hash:bucketHash,p_window_start:windowStartISO,p_limit:limit});
  }
  async createBookingRecovery(input: {tokenHash:string;bookingId:string;reference:string;expiresAt:string;createdAt:string}, notification:{recipient:string;token:string}): Promise<void> {
    await this.req('POST','/rpc/create_booking_recovery',{p_input:input,p_notification:notification});
  }
  async consumeBookingRecovery(tokenHash: string, nowISO: string): Promise<{reference:string}|null> {
    return this.req('POST','/rpc/consume_booking_recovery',{p_token_hash:tokenHash,p_now:nowISO});
  }

  async beginCalendarSync(_p:string,_s:string,_now?:string):Promise<{leaseId:string}|null>{throw new Error('Calendar persistence is not implemented for this adapter.');}
  async completeCalendarSync(_input:CalendarSnapshot):Promise<{applied:boolean;blockCount:number;conflictCount:number}>{throw new Error('Calendar persistence is not implemented for this adapter.');}
  async failCalendarSync(_p:string,_s:string,_lease:string,_now:string):Promise<void>{throw new Error('Calendar persistence is not implemented for this adapter.');}
  async getCalendarStatus(_p:string,_s:string):Promise<CalendarStatus|null>{if(process.env.CALENDAR_SYNC_REQUIRED!=='true'&&process.env.CALENDAR_SYNC_ENABLED!=='true')return null;throw new Error('Calendar persistence is not implemented for this adapter.');}
  async listCalendarExportRanges(_p:string,_now:string):Promise<{id:string;from:string;to:string}[]>{throw new Error('Calendar persistence is not implemented for this adapter.');}
  async listCalendarBlockIds(_p:string):Promise<string[]>{throw new Error('Calendar persistence is not implemented for this adapter.');}
  async resolveCalendarConflict(_p:string,_s:string,_now:string):Promise<boolean>{throw new Error('Calendar persistence is not implemented for this adapter.');}

  // ---- bookings -----------------------------------------------------------
  async createBookingIfAvailable(input: NewBookingInput): Promise<Booking> {
    if(process.env.CALENDAR_SYNC_REQUIRED==='true'||process.env.CALENDAR_SYNC_ENABLED==='true')throw new BookingError('UNAVAILABLE','Calendar inventory requires a supported adapter.');
    // Atomic check-and-insert runs inside a Postgres transaction in the
    // create_booking_if_available() function (supabase/schema.sql).
    // The function RAISES on conflict; map those to BookingError codes.
    let rows: SnakeBooking[];
    try {
      const res = await this.req<SnakeBooking[] | SnakeBooking>("POST", "/rpc/create_booking_if_available", {
        p_booking: {
          property_id: input.propertyId,
          payment_mode: storedPaymentMode(input.paymentMode),
          check_in: input.checkIn,
          check_out: input.checkOut,
          nights: input.nights,
          guests: input.guests,
          pets: input.pets,
          guest: input.guest,
          line_items: input.lineItems,
          stay_snapshot: input.staySnapshot ?? null,
          total_cents: input.totalCents,
          currency: input.currency,
          idempotency_key: input.idempotencyKey,
        },
      });
      rows = Array.isArray(res) ? res : [res];
    } catch (err) {
      throw mapSqlConflict(err instanceof Error ? err.message : String(err));
    }
    const row = rows[0];
    if (!row) throw new Error("create_booking_if_available returned no row.");
    return toBooking(row);
  }

  async expirePendingBookings(now = new Date().toISOString()): Promise<number> {
    return this.req<number>('POST', '/rpc/expire_pending_bookings', {p_now: now});
  }
  async attachPaymentIntent(id: string, paymentIntentId: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>('POST', '/rpc/attach_payment_intent', {p_id:id, p_payment_intent_id:paymentIntentId});
    return rows[0] ? toBooking(rows[0]) : null;
  }
  async failPendingBookingPayment(id: string, paymentIntentId: string): Promise<boolean> {
    const rows = await this.req<SnakeBooking[]>('PATCH', `/bookings?id=eq.${encodeURIComponent(id)}&stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&status=eq.pending_payment`, {payment_status:'failed'}, 'return=representation');
    return rows.length > 0;
  }
  async confirmBookingPayment(id: string, paymentIntentId: string, confirmedAt: string): Promise<{booking: Booking; transitioned: boolean} | null> {
    if(process.env.CALENDAR_SYNC_REQUIRED==='true'||process.env.CALENDAR_SYNC_ENABLED==='true')return null;
    const result = await this.req<{booking: SnakeBooking; transitioned: boolean} | null>('POST', '/rpc/confirm_booking_payment', {p_id:id, p_payment_intent_id:paymentIntentId, p_confirmed_at:confirmedAt});
    return result?.booking ? {booking:toBooking(result.booking), transitioned:result.transitioned} : null;
  }

  async getBooking(id: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>("GET", `/bookings?id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>(
      "GET",
      `/bookings?reference=eq.${encodeURIComponent(reference.trim().toUpperCase())}&limit=1`
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async getBookingByIdempotencyKey(key: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>(
      "GET",
      `/bookings?idempotency_key=eq.${encodeURIComponent(key)}&limit=1`
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async getBookingByPaymentIntentId(paymentIntentId: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>(
      "GET",
      `/bookings?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&limit=1`
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async updateBooking(
    id: string,
    patch: {
      status?: Booking["status"];
      paymentStatus?: Booking["paymentStatus"];
      stripePaymentIntentId?: string;
      confirmedAt?: string;
      cancelledAt?: string;
      adminNotes?: string;
    }
  ): Promise<Booking | null> {
    if (Object.keys(patch).some(k => k !== "adminNotes")) throw new Error("Use atomic booking lifecycle methods for state changes.");
    const body: Record<string, unknown> = {};
    if (patch.status !== undefined) body.status = patch.status;
    if (patch.paymentStatus !== undefined) body.payment_status = patch.paymentStatus;
    if (patch.stripePaymentIntentId !== undefined) body.stripe_payment_intent_id = patch.stripePaymentIntentId;
    if (patch.confirmedAt !== undefined) body.confirmed_at = patch.confirmedAt;
    if (patch.cancelledAt !== undefined) body.cancelled_at = patch.cancelledAt;
    if (patch.adminNotes !== undefined) body.admin_notes = patch.adminNotes;
    if (Object.keys(body).length === 0) return this.getBooking(id);
    const rows = await this.req<SnakeBooking[]>(
      "PATCH",
      `/bookings?id=eq.${encodeURIComponent(id)}`,
      body,
      "return=representation"
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async cancelBooking(id: string): Promise<Booking | null> {
    const rows = await this.req<SnakeBooking[]>('POST', '/rpc/cancel_booking', {p_id:id});
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async listBookings(filter: ListBookingsFilter = {}): Promise<Booking[]> {
    await this.expirePendingBookings();
    const q = new URLSearchParams({ order: "created_at.desc" });
    if (filter.propertyId) q.set("property_id", `eq.${filter.propertyId}`);
    if (filter.status) q.set("status", `eq.${filter.status}`);
    const rows = await this.req<SnakeBooking[]>("GET", `/bookings?${q}`);
    return rows.map(toBooking);
  }

  async findOverlappingBookings(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<Booking[]> {
    await this.expirePendingBookings();
    const q = new URLSearchParams({
      property_id: `eq.${propertyId}`,
      status: "in.(confirmed,pending_payment)",
      check_in: `lt.${checkOut}`,
      check_out: `gt.${checkIn}`,
      order: "check_in.asc",
    });
    const rows = await this.req<SnakeBooking[]>("GET", `/bookings?${q}`);
    return rows.map(toBooking);
  }

  // ---- blocks -------------------------------------------------------------
  async listBlocks(propertyId: string) {
    const rows = await this.req<
      { id: string; property_id: string; from_date: string; to_date: string; reason: string }[]
    >(
      "GET",
      `/blocks?property_id=eq.${encodeURIComponent(propertyId)}&order=from_date.asc`
    );
    return rows.map((r) => ({
      id: r.id,
      propertyId: r.property_id,
      from: r.from_date,
      to: r.to_date,
      reason: r.reason,
    }));
  }

  async createBlock(input: { propertyId: string; from: string; to: string; reason: string }) {
    const rows = await this.req<{ id: string; property_id: string; from_date: string; to_date: string; reason: string }[]>(
      "POST",
      "/blocks",
      {
        property_id: input.propertyId,
        from_date: input.from,
        to_date: input.to,
        reason: input.reason,
      },
      "return=representation"
    );
    const r = rows[0];
    return { id: r.id, propertyId: r.property_id, from: r.from_date, to: r.to_date, reason: r.reason };
  }

  async deleteBlock(id: string): Promise<boolean> {
    const rows = await this.req<unknown[]>(
      "DELETE",
      `/blocks?id=eq.${encodeURIComponent(id)}`,
      undefined,
      "return=representation"
    );
    return rows.length > 0;
  }

  // ---- rate overrides -------------------------------------------------------
  async getRateOverrides(propertyId: string, from: string, to: string) {
    const q = new URLSearchParams({
      property_id: `eq.${propertyId}`,
      date: `gte.${from}`,
      order: "date.asc",
    });
    const rows = await this.req<{ id: string; property_id: string; date: string; rate_cents: number }[]>(
      "GET",
      `/rate_overrides?${q}`
    );
    return rows
      .filter((r) => r.date < to)
      .map((r) => ({ id: r.id, propertyId: r.property_id, date: r.date, rateCents: r.rate_cents }));
  }

  async upsertRateOverride(propertyId: string, date: string, rateCents: number) {
    const rows = await this.req<{ id: string; property_id: string; date: string; rate_cents: number }[]>(
      "POST",
      "/rate_overrides",
      { property_id: propertyId, date, rate_cents: rateCents },
      "return=representation,resolution=merge-duplicates"
    );
    const r = rows[0];
    return { id: r.id, propertyId: r.property_id, date: r.date, rateCents: r.rate_cents };
  }

  // ---- settings ---------------------------------------------------------------
  async getSettings(): Promise<PricingSettings> {
    const rows = await this.req<{ key: string; value: unknown }[]>("GET", "/settings?select=key,value");
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      cleaningFeeCents: (map.get("cleaningFeeCents") as number) ?? DEFAULT_PRICING_SETTINGS.cleaningFeeCents,
      taxRatePct: (map.get("taxRatePct") as number) ?? DEFAULT_PRICING_SETTINGS.taxRatePct,
      minStayNights: (map.get("minStayNights") as number) ?? DEFAULT_PRICING_SETTINGS.minStayNights,
      maxStayNights: (map.get("maxStayNights") as number) ?? DEFAULT_PRICING_SETTINGS.maxStayNights,
      promos: (map.get("promos") as PricingSettings["promos"]) ?? DEFAULT_PRICING_SETTINGS.promos,
    };
  }

  async updateSettings(patch: SettingsPatch): Promise<PricingSettings> {
    const allowed = ["cleaningFeeCents", "taxRatePct", "minStayNights", "maxStayNights", "promos"];
    const rows = Object.entries(patch)
      .filter(([k, v]) => v !== undefined && allowed.includes(k))
      .map(([k, v]) => ({ key: k, value: v }));
    if (rows.length) {
      await this.req("POST", "/settings", rows, "resolution=merge-duplicates");
    }
    return this.getSettings();
  }

  // ---- quotes -------------------------------------------------------------------
  async saveQuote(quote: Quote): Promise<void> {
    await this.req(
      "POST",
      "/quotes",
      { id: quote.id, payload: quote, expires_at: quote.expiresAt },
      "resolution=merge-duplicates"
    );
  }

  async getQuote(id: string): Promise<Quote | null> {
    const rows = await this.req<{ id: string; payload: Quote; expires_at: string }[]>(
      "GET",
      `/quotes?id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.req("DELETE", `/quotes?id=eq.${encodeURIComponent(id)}`);
      return null;
    }
    return row.payload;
  }

  async deleteExpiredQuotes(): Promise<number> {
    const rows = await this.req<unknown[]>(
      "DELETE",
      `/quotes?expires_at=lte.${encodeURIComponent(new Date().toISOString())}`,
      undefined,
      "return=representation"
    );
    return rows.length;
  }
}

/** Re-exported so callers can map the SQL function's conflict errors. */
export function mapSqlConflict(message: string): BookingError {
  if (/already booked/i.test(message)) {
    return new BookingError("UNAVAILABLE", "Those dates just became unavailable — please pick different dates.");
  }
  if (/blocked/i.test(message)) {
    return new BookingError("UNAVAILABLE", "Those dates are blocked.");
  }
  if (/duplicate|idempotency/i.test(message)) {
    return new BookingError("DUPLICATE", "A booking with this idempotency key already exists.");
  }
  return new BookingError("UNAVAILABLE", message);
}
