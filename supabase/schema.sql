-- ============================================================================
-- Casa Pacifica direct-booking site — Supabase (Postgres) schema
-- ============================================================================
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)
--
-- RLS NOTES
-- - All access goes through the server-side service_role key (see
--   src/lib/db/supabase.ts); the anon key is never used by the app.
-- - RLS is enabled on every table with NO public policies (deny by default).
--   service_role bypasses RLS, so the API keeps working while anonymous /
--   authenticated client access is fully denied. Add narrowly-scoped
--   policies only if you later expose these tables to a client SDK.
-- - Dates are `date` (calendar days, America/Los_Angeles by convention);
--   timestamps are `timestamptz`.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Properties: canonical listing content lives in src/lib/property.ts and is
-- seeded here as JSONB. Pricing columns mirror the Property contract so the
-- API can read them without parsing JSON.
-- --------------------------------------------------------------------------
create table if not exists properties (
  id            text primary key,
  slug          text not null unique,
  data          jsonb not null,          -- full Property object
  base_nightly_cents int not null default 34900,
  min_nightly_cents  int not null default 34900,
  max_nightly_cents  int not null default 103000,
  updated_at    timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Bookings
-- --------------------------------------------------------------------------
create table if not exists bookings (
  id                     text primary key,
  reference              text not null unique,          -- guest-facing, e.g. CP-7K2Q9A
  property_id            text not null references properties(id),
  check_in               date not null,
  check_out              date not null,
  nights                 int  not null,
  guests                 jsonb not null,                -- {adults,children,infants}
  pets                   int  not null default 0,
  guest                  jsonb not null,                -- {name,email,phone?}
  line_items             jsonb not null,                -- LineItem[]
  total_cents            int  not null,
  currency               text not null default 'USD',
  status                 text not null default 'pending_payment'
                         check (status in ('pending_payment','confirmed','cancelled')),
  payment_status         text not null default 'unpaid'
                         check (payment_status in ('unpaid','paid_test','failed','refunded')),
  stripe_payment_intent_id text,
  idempotency_key        text not null unique,
  created_at             timestamptz not null default now(),
  confirmed_at           timestamptz,
  cancelled_at           timestamptz,
  admin_notes            text,
  constraint chk_dates check (check_out > check_in)
);
create index if not exists idx_bookings_property_dates
  on bookings (property_id, check_in, check_out);
create index if not exists idx_bookings_pi on bookings (stripe_payment_intent_id);

-- --------------------------------------------------------------------------
-- Manual blocked ranges (incl. iCal imports — see src/lib/ical.ts caveat)
-- --------------------------------------------------------------------------
create table if not exists blocks (
  id          text primary key,
  property_id text not null references properties(id) on delete cascade,
  from_date   date not null,      -- inclusive
  to_date     date not null,      -- exclusive
  reason      text not null default '',
  constraint chk_block_dates check (to_date > from_date)
);
create index if not exists idx_blocks_property on blocks (property_id, from_date, to_date);

-- --------------------------------------------------------------------------
-- Per-date nightly rate overrides (admin)
-- --------------------------------------------------------------------------
create table if not exists rate_overrides (
  id          text primary key,
  property_id text not null references properties(id) on delete cascade,
  date        date not null,
  rate_cents  int  not null check (rate_cents >= 0),
  unique (property_id, date)
);

-- --------------------------------------------------------------------------
-- Pricing settings (cleaning fee, tax rate, min/max stay, promos)
-- --------------------------------------------------------------------------
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- --------------------------------------------------------------------------
-- Quotes (15-minute expiry; payload is the full Quote JSON)
-- --------------------------------------------------------------------------
create table if not exists quotes (
  id         text primary key,
  payload    jsonb not null,
  expires_at timestamptz not null
);
create index if not exists idx_quotes_expires on quotes (expires_at);

-- --------------------------------------------------------------------------
-- Idempotency keys (audit trail; the UNIQUE constraint that actually
-- prevents duplicates lives on bookings.idempotency_key)
-- --------------------------------------------------------------------------
create table if not exists idempotency_keys (
  key        text primary key,
  booking_id text not null references bookings(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- RLS: deny everything to client roles (service_role bypasses RLS)
-- --------------------------------------------------------------------------
alter table properties        enable row level security;
alter table bookings          enable row level security;
alter table blocks            enable row level security;
alter table rate_overrides    enable row level security;
alter table settings          enable row level security;
alter table quotes            enable row level security;
alter table idempotency_keys  enable row level security;
-- No policies are created on purpose: deny-by-default for anon/authenticated.

-- --------------------------------------------------------------------------
-- Atomic booking creation.
-- Runs the availability re-check and the INSERT in ONE transaction so two
-- concurrent requests for the same dates cannot both succeed.
-- Raises:
--   STAY_OVERLAPS_BOOKING  — a confirmed/pending_payment booking overlaps
--   STAY_OVERLAPS_BLOCK    — a manual block overlaps
--   DUPLICATE_IDEMPOTENCY_KEY — idempotency_key already used
-- The Supabase adapter (src/lib/db/supabase.ts) maps these to BookingError
-- codes UNAVAILABLE / DUPLICATE.
-- --------------------------------------------------------------------------
create or replace function gen_booking_reference() returns text
language plpgsql as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := 'CP-';
begin
  for i in 1..6 loop
    out := out || substr(chars, 1 + floor(random() * 32)::int, 1);
  end loop;
  return out;
end;
$$;

create or replace function create_booking_if_available(p_booking jsonb)
returns setof bookings
language plpgsql
as $$
declare
  v_id   text := 'bk_' || substr(md5(gen_random_uuid()::text), 1, 12);
  v_ref  text;
  v_row  bookings%rowtype;
  attempt int := 0;
begin
  -- 1) Availability re-check (inside this transaction).
  if exists (
    select 1 from bookings
    where property_id = p_booking->>'property_id'
      and status in ('confirmed', 'pending_payment')
      and check_in < (p_booking->>'check_out')::date
      and check_out > (p_booking->>'check_in')::date
  ) then
    raise exception 'STAY_OVERLAPS_BOOKING: those dates are already booked';
  end if;

  if exists (
    select 1 from blocks
    where property_id = p_booking->>'property_id'
      and from_date < (p_booking->>'check_out')::date
      and to_date > (p_booking->>'check_in')::date
  ) then
    raise exception 'STAY_OVERLAPS_BLOCK: those dates are blocked';
  end if;

  -- 2) Insert (idempotency_key UNIQUE prevents duplicate bookings).
  <<insert_loop>>
  loop
    attempt := attempt + 1;
    v_ref := gen_booking_reference();
    begin
      insert into bookings (
        id, reference, property_id, check_in, check_out, nights,
        guests, pets, guest, line_items, total_cents, currency,
        status, payment_status, idempotency_key
      ) values (
        v_id, v_ref,
        p_booking->>'property_id',
        (p_booking->>'check_in')::date,
        (p_booking->>'check_out')::date,
        (p_booking->>'nights')::int,
        p_booking->'guests',
        coalesce((p_booking->>'pets')::int, 0),
        p_booking->'guest',
        p_booking->'line_items',
        (p_booking->>'total_cents')::int,
        coalesce(p_booking->>'currency', 'USD'),
        'pending_payment', 'unpaid',
        p_booking->>'idempotency_key'
      )
      returning * into v_row;
      exit insert_loop;
    exception
      when unique_violation then
        -- Could be a reference collision (retry) or the idempotency key (fail).
        if exists (select 1 from bookings where idempotency_key = p_booking->>'idempotency_key') then
          raise exception 'DUPLICATE_IDEMPOTENCY_KEY: a booking with this idempotency key already exists';
        end if;
        if attempt >= 5 then
          raise exception 'BOOKING_REFERENCE_COLLISION: could not generate a unique reference';
        end if;
        -- else: reference collision — retry with a new reference
    end;
  end loop;

  insert into idempotency_keys (key, booking_id)
  values (p_booking->>'idempotency_key', v_id);

  return next v_row;
  return;
end;
$$;

-- --------------------------------------------------------------------------
-- Seed: property content + pricing settings (settings mirror
-- DEFAULT_PRICING_SETTINGS in src/lib/pricing.ts; adjust after insert).
-- NOTE: the property `data` JSONB below is a placeholder — seed it from
-- src/lib/property.ts (or leave the table empty; the app reads property
-- content from code, not from this table, until the admin UI needs it).
-- --------------------------------------------------------------------------
insert into settings (key, value) values
  ('cleaningFeeCents', '15000'),          -- ⚠️ SAMPLE — Renier has not confirmed
  ('taxRatePct',       '10.5'),           -- ⚠️ SAMPLE — Renier has not confirmed
  ('minStayNights',    '1'),
  ('maxStayNights',    '28'),
  ('promos',           '[{"code":"DIRECT10","type":"percent","percent":10,"description":"10% off the nightly subtotal — honors Renier''s promised 10%-off for direct rebookings"}]')
on conflict (key) do nothing;
