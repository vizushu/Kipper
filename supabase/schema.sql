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
                         check (payment_status in ('unpaid','paid_test','paid','failed','refunded')),
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

alter table bookings add column if not exists stay_snapshot jsonb;
-- Legacy rows were test-only. Never infer live provenance from current credentials.
alter table bookings add column if not exists payment_mode text not null default 'test' check (payment_mode in ('test','live'));
alter table bookings drop constraint if exists bookings_payment_status_check;
alter table bookings add constraint bookings_payment_status_check check (payment_status in ('unpaid','paid_test','paid','failed','refunded'));

-- Pending holds are bounded. Existing legacy holds remain NULL for manual review;
-- never infer expiry for reservations created before this migration.
alter table bookings add column if not exists hold_expires_at timestamptz;

create or replace function expire_pending_bookings(p_now timestamptz default now())
returns integer language plpgsql as $$
declare v_property text; v_count integer := 0; v_changed integer;
begin
  for v_property in select distinct property_id from bookings where status='pending_payment' and hold_expires_at <= p_now order by property_id loop
    perform pg_advisory_xact_lock(hashtextextended(v_property, 0));
    update bookings set status='cancelled', cancelled_at=p_now,
      admin_notes=concat_ws(E'\n', admin_notes, 'Payment hold expired; late payment requires manual review.')
      where property_id=v_property and status='pending_payment' and hold_expires_at <= p_now;
    get diagnostics v_changed = row_count;
    v_count := v_count + v_changed;
  end loop;
  return v_count;
end; $$;

create or replace function attach_payment_intent(p_id text, p_payment_intent_id text)
returns setof bookings language plpgsql as $$
declare v_property text;
begin
  select property_id into v_property from bookings where id=p_id;
  if v_property is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_property, 0));
  return query update bookings set stripe_payment_intent_id=p_payment_intent_id
    where id=p_id and status='pending_payment'
      and (hold_expires_at is null or hold_expires_at > now())
      and (stripe_payment_intent_id is null or stripe_payment_intent_id=p_payment_intent_id)
    returning *;
end; $$;

-- Durable private workflows. Apply this whole schema before enabling workers/recovery.
create table if not exists delivery_outbox (
 id text primary key, booking_id text not null references bookings(id),
 kind text not null check(kind in ('guest_confirmation','host_notification','access_recovery')),
 dedupe_key text not null unique,
 status text not null default 'pending' check(status in ('pending','processing','sent','simulated','suppressed','dead')),
 payload_json jsonb not null, envelope_json jsonb, attempts integer not null default 0,
 created_at timestamptz not null, next_attempt_at timestamptz not null,
 first_attempt_at timestamptz, lease_token text, lease_until timestamptz, last_error text
);
create index if not exists delivery_outbox_due on delivery_outbox(status,next_attempt_at);
create table if not exists booking_recovery (
 token_hash text primary key, booking_id text not null references bookings(id), reference text not null,
 expires_at timestamptz not null, created_at timestamptz not null, consumed_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '15 minutes')
);
create index if not exists booking_recovery_booking on booking_recovery(booking_id);
create table if not exists recovery_rate_limits (
 bucket_hash text not null, window_start timestamptz not null, count bigint not null,
 primary key(bucket_hash,window_start)
);
alter table delivery_outbox enable row level security;
alter table booking_recovery enable row level security;
alter table recovery_rate_limits enable row level security;
revoke all on delivery_outbox,booking_recovery,recovery_rate_limits from public,anon,authenticated;
grant all on delivery_outbox,booking_recovery,recovery_rate_limits to service_role;

create or replace function ensure_receipt_outbox(p_booking_id text)
returns void language plpgsql as $$
declare b bookings%rowtype; k text;
begin
 select * into b from bookings where id=p_booking_id for update;
 if not found or b.status<>'confirmed' then return; end if;
 foreach k in array array['guest_confirmation','host_notification'] loop
  insert into delivery_outbox(id,booking_id,kind,dedupe_key,payload_json,created_at,next_attempt_at)
  values('mail_'||gen_random_uuid()::text,b.id,k,k||'/'||b.id||'/v1',jsonb_build_object('booking',to_jsonb(b)),now(),now())
  on conflict(dedupe_key) do nothing;
 end loop;
end; $$;

create or replace function suppress_delivery_outbox(p_now timestamptz)
returns void language plpgsql as $$
begin
 update delivery_outbox o set status='suppressed',payload_json='{}',envelope_json=null,lease_token=null,lease_until=null,last_error='booking_cancelled_or_recovery_expired'
 where status in ('pending','processing') and (
  (kind<>'access_recovery' and not exists(select 1 from bookings b where b.id=o.booking_id and b.status='confirmed')) or
  (kind='access_recovery' and ((payload_json#>>'{recovery,expiresAt}')::timestamptz<=p_now or not exists(
   select 1 from booking_recovery r join bookings b on b.id=r.booking_id where r.booking_id=o.booking_id
   and r.token_hash=substring(o.dedupe_key from 10) and r.consumed_at is null and r.expires_at>p_now))));
 update delivery_outbox set status='dead',payload_json='{}',envelope_json=null,lease_token=null,lease_until=null,last_error='retry_budget_exhausted'
 where status in ('pending','processing') and ((attempts>=5 and (lease_until is null or lease_until<=p_now)) or first_attempt_at<=p_now-interval '23 hours');
end; $$;

drop function if exists claim_delivery_outbox(timestamptz,integer);
create or replace function claim_delivery_outbox(p_now timestamptz,p_limit integer,p_job_id text default null)
returns setof delivery_outbox language plpgsql as $$
declare r delivery_outbox%rowtype; claimed delivery_outbox%rowtype;
begin
 perform suppress_delivery_outbox(p_now);
 for r in select * from delivery_outbox where ((status='pending' and next_attempt_at<=p_now) or (status='processing' and lease_until<=p_now)) and (p_job_id is null or id=p_job_id)
  order by created_at,id limit greatest(1,least(p_limit,10)) for update skip locked loop
  update delivery_outbox set status='processing',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,p_now),
   lease_token='lease_'||gen_random_uuid()::text,lease_until=p_now+interval '5 minutes' where id=r.id returning * into claimed;
  return next claimed;
 end loop;
end; $$;

create or replace function prepare_outbox_message(p_id text,p_lease_token text,p_envelope jsonb,p_now timestamptz)
returns jsonb language plpgsql as $$
declare prepared jsonb;
begin
 perform suppress_delivery_outbox(p_now);
 update delivery_outbox set envelope_json=coalesce(envelope_json,p_envelope)
 where id=p_id and status='processing' and lease_token=p_lease_token and lease_until>p_now returning envelope_json into prepared;
 return prepared;
end; $$;

create or replace function finish_delivery_outbox(p_id text,p_lease_token text,p_outcome text,p_now timestamptz)
returns boolean language plpgsql as $$
declare r delivery_outbox%rowtype; terminal boolean; next_status text; delay_seconds integer;
begin
 if p_outcome not in ('sent','simulated','failed') then raise exception 'Invalid delivery outcome'; end if;
 perform suppress_delivery_outbox(p_now);
 select * into r from delivery_outbox where id=p_id and status='processing' and lease_token=p_lease_token and lease_until>p_now for update;
 if not found then return false; end if;
 terminal:=p_outcome<>'failed' or r.attempts>=5;
 next_status:=case when p_outcome='failed' then case when terminal then 'dead' else 'pending' end else p_outcome end;
 delay_seconds:=(array[60,300,900,3600,3600])[greatest(1,least(r.attempts,5))];
 update delivery_outbox set status=next_status,next_attempt_at=p_now+make_interval(secs=>delay_seconds),lease_token=null,lease_until=null,
  last_error=case when p_outcome='failed' then 'delivery_failed' else null end,
  payload_json=case when terminal then '{}'::jsonb else payload_json end,
  envelope_json=case when terminal then null else envelope_json end where id=p_id;
 return true;
end; $$;

create or replace function consume_recovery_rate_limit(p_bucket_hash text,p_window_start timestamptz,p_limit integer)
returns boolean language plpgsql as $$
declare used bigint;
begin
 if p_limit<1 or p_limit>10000 then return false; end if;
 delete from recovery_rate_limits where window_start<p_window_start-interval '48 hours';
 insert into recovery_rate_limits(bucket_hash,window_start,count) values(p_bucket_hash,p_window_start,1)
 on conflict(bucket_hash,window_start) do update set count=least(recovery_rate_limits.count+1,1000000) returning count into used;
 return used<=p_limit;
end; $$;

create or replace function create_booking_recovery(p_input jsonb,p_notification jsonb)
returns void language plpgsql as $$
declare b bookings%rowtype; created timestamptz; expires timestamptz;
begin
 select * into b from bookings where id=p_input->>'bookingId' for update;
 if not found or b.reference is distinct from p_input->>'reference'
  or lower(trim(b.guest->>'email')) is distinct from lower(trim(p_notification->>'recipient')) then raise exception 'Recovery identity mismatch'; end if;
 created:=(p_input->>'createdAt')::timestamptz; expires:=(p_input->>'expiresAt')::timestamptz;
 if created is null or expires is null or expires<=created or expires>created+interval '15 minutes' then raise exception 'Invalid recovery expiry'; end if;
 update booking_recovery set consumed_at=created where booking_id=b.id and consumed_at is null;
 update delivery_outbox set status='suppressed',payload_json='{}',envelope_json=null,lease_token=null,lease_until=null
 where booking_id=b.id and kind='access_recovery' and status in ('pending','processing');
 insert into booking_recovery(token_hash,booking_id,reference,expires_at,created_at)
 values(p_input->>'tokenHash',b.id,b.reference,expires,created);
 insert into delivery_outbox(id,booking_id,kind,dedupe_key,payload_json,created_at,next_attempt_at)
 values('mail_'||gen_random_uuid()::text,b.id,'access_recovery','recovery/'||(p_input->>'tokenHash'),
 jsonb_build_object('recovery',jsonb_build_object('recipient',p_notification->>'recipient','token',p_notification->>'token','reference',b.reference,'expiresAt',expires,'paymentMode',b.payment_mode)),created,created);
end; $$;

create or replace function consume_booking_recovery(p_token_hash text,p_now timestamptz)
returns jsonb language plpgsql as $$
declare recovered_reference text;
begin
 update booking_recovery r set consumed_at=p_now where token_hash=p_token_hash and consumed_at is null and expires_at>p_now
 and exists(select 1 from bookings b where b.id=r.booking_id and b.reference=r.reference) returning reference into recovered_reference;
 if not found then return null; end if;
 perform suppress_delivery_outbox(p_now);
 return jsonb_build_object('reference',recovered_reference);
end; $$;

-- No anonymous/authenticated SDK access to workflow RPCs (including internal helpers).
revoke execute on function ensure_receipt_outbox(text),suppress_delivery_outbox(timestamptz),claim_delivery_outbox(timestamptz,integer,text),prepare_outbox_message(text,text,jsonb,timestamptz),finish_delivery_outbox(text,text,text,timestamptz),consume_recovery_rate_limit(text,timestamptz,integer),create_booking_recovery(jsonb,jsonb),consume_booking_recovery(text,timestamptz) from public,anon,authenticated;
grant execute on function ensure_receipt_outbox(text),suppress_delivery_outbox(timestamptz),claim_delivery_outbox(timestamptz,integer,text),prepare_outbox_message(text,text,jsonb,timestamptz),finish_delivery_outbox(text,text,text,timestamptz),consume_recovery_rate_limit(text,timestamptz,integer),create_booking_recovery(jsonb,jsonb),consume_booking_recovery(text,timestamptz) to service_role;

create or replace function confirm_booking_payment(p_id text, p_payment_intent_id text, p_confirmed_at timestamptz)
returns jsonb language plpgsql as $$
declare v_property text; v_row bookings%rowtype;
begin
  select property_id into v_property from bookings where id=p_id;
  if v_property is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_property, 0));
  select * into v_row from bookings where id=p_id for update;
  if v_row.stripe_payment_intent_id is distinct from p_payment_intent_id or v_row.status='cancelled' then return null; end if;
  if v_row.status='confirmed' then return jsonb_build_object('booking',to_jsonb(v_row),'transitioned',false); end if;
  if v_row.hold_expires_at is not null and v_row.hold_expires_at <= now() then
    update bookings set status='cancelled', cancelled_at=now(), admin_notes=concat_ws(E'\n',admin_notes,'Payment hold expired; late payment requires manual review.') where id=p_id;
    return null;
  end if;
  if exists(select 1 from blocks where property_id=v_property and from_date<v_row.check_out and to_date>v_row.check_in) then return null; end if;
  if exists(select 1 from bookings where id<>p_id and property_id=v_property and status in ('confirmed','pending_payment') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now()) and check_in<v_row.check_out and check_out>v_row.check_in) then return null; end if;
  update bookings set status='confirmed',payment_status=case when payment_mode='live' then 'paid' else 'paid_test' end,confirmed_at=p_confirmed_at where id=p_id and status='pending_payment' returning * into v_row;
  perform ensure_receipt_outbox(v_row.id); -- Same transaction as successful confirmation.
  return jsonb_build_object('booking',to_jsonb(v_row),'transitioned',true);
end; $$;

create or replace function cancel_booking(p_id text)
returns setof bookings language plpgsql as $$
declare v_property text;
begin
  select property_id into v_property from bookings where id=p_id;
  if v_property is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_property, 0));
  return query update bookings set status='cancelled',cancelled_at=coalesce(cancelled_at,now()) where id=p_id returning *;
end; $$;

-- Blocks/OTA-import rows must serialize with holds and confirmation too.
create or replace function lock_block_inventory()
returns trigger language plpgsql as $$
begin
  if TG_OP='UPDATE' and OLD.property_id is distinct from NEW.property_id then
    raise exception 'Block inventory identity is immutable; delete and recreate under review';
  end if;
  if TG_OP='DELETE' then
    perform pg_advisory_xact_lock(hashtextextended(OLD.property_id,0)); return OLD;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(NEW.property_id,0)); return NEW;
end; $$;
drop trigger if exists blocks_inventory_lock on blocks;
create trigger blocks_inventory_lock before insert or update or delete on blocks for each row execute function lock_block_inventory();

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
  -- Serialize reservation creation for the same physical property.
  perform pg_advisory_xact_lock(hashtextextended(p_booking->>'property_id', 0));
  update bookings set status='cancelled',cancelled_at=now(),admin_notes=concat_ws(E'\n',admin_notes,'Payment hold expired; late payment requires manual review.')
    where property_id=p_booking->>'property_id' and status='pending_payment' and hold_expires_at <= now();
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
        status, payment_status, idempotency_key, stay_snapshot, hold_expires_at, payment_mode
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
        p_booking->>'idempotency_key', p_booking->'stay_snapshot', now() + interval '15 minutes', coalesce(p_booking->>'payment_mode','test')
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
  ('cleaningFeeCents', '18000'),          -- Approved current 3BR cleaning
  ('taxRatePct',       '12.75'),          -- Verified San Diego Zone 2 TOT
  ('minStayNights',    '1'),
  ('maxStayNights',    '28'),
  ('promos',           '[{"code":"DIRECT10","type":"percent","percent":10,"description":"10% off the nightly subtotal — honors Renier''s promised 10%-off for direct rebookings"}]')
on conflict (key) do nothing;

-- Minimal canonical inventory identity. Public listing content remains in code.
insert into properties (id, slug, data) values ('casa-pacifica','casa-pacifica','{}'::jsonb) on conflict (id) do nothing;

-- Lifecycle RPCs are server-only. No public booking mutations via Supabase SDK.
revoke execute on function create_booking_if_available(jsonb), expire_pending_bookings(timestamptz), attach_payment_intent(text,text), confirm_booking_payment(text,text,timestamptz), cancel_booking(text) from public, anon, authenticated;
grant execute on function create_booking_if_available(jsonb), expire_pending_bookings(timestamptz), attach_payment_intent(text,text), confirm_booking_payment(text,text,timestamptz), cancel_booking(text) to service_role;

-- --------------------------------------------------------------------------
-- Verified-money exception review. Private metadata only; never refunds or
-- mutates bookings. Modes are isolated and provider callbacks are idempotent.
-- --------------------------------------------------------------------------
create table if not exists payment_exceptions (
  id text primary key,
  payment_intent_id text not null,
  payment_mode text not null check (payment_mode in ('test','live')),
  booking_id text,
  amount_cents bigint not null check (amount_cents between 0 and 9007199254740991),
  amount_received_cents bigint not null check (amount_received_cents between 1 and 9007199254740991),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  reason text not null check (reason in ('cancelled_booking','expired_or_conflicting_hold','unmatched_payment','binding_mismatch','launch_gate_closed')),
  status text not null default 'open' check (status in ('open','reviewed')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  event_count integer not null default 1 check (event_count > 0),
  attention_required boolean not null default true,
  reviewed_at timestamptz,
  review_note text,
  unique(payment_mode,payment_intent_id)
);
create table if not exists payment_exception_events (
  payment_mode text not null check (payment_mode in ('test','live')),
  event_id text not null,
  exception_id text not null references payment_exceptions(id),
  primary key(payment_mode,event_id)
);
create table if not exists payment_exception_reviews (
  idempotency_key text primary key,
  exception_id text not null unique references payment_exceptions(id),
  note text not null,
  created_at timestamptz not null
);
alter table payment_exceptions enable row level security;
alter table payment_exception_events enable row level security;
alter table payment_exception_reviews enable row level security;
revoke all on payment_exceptions,payment_exception_events,payment_exception_reviews from public,anon,authenticated;
grant select,insert,update,delete on payment_exceptions,payment_exception_events,payment_exception_reviews to service_role;

create or replace function record_payment_exception(p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_mode text := p_input->>'paymentMode';
  v_pi text := p_input->>'paymentIntentId';
  v_event text := p_input->>'providerEventId';
  v_currency text := lower(p_input->>'currency');
  v_amount numeric;
  v_received numeric;
  v_seen text;
  v_row payment_exceptions%rowtype;
  v_created boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if jsonb_typeof(p_input) is distinct from 'object'
    or v_mode is null or v_mode not in ('test','live')
    or v_pi is null or v_pi !~ '^pi_[A-Za-z0-9_]{1,180}$'
    or v_event is null or char_length(v_event) not between 1 and 250
    or v_currency is null or v_currency !~ '^[a-z]{3}$'
    or p_input->>'reason' is null or p_input->>'reason' not in ('cancelled_booking','expired_or_conflicting_hold','unmatched_payment','binding_mismatch','launch_gate_closed')
    or jsonb_typeof(p_input->'amountCents') is distinct from 'number'
    or jsonb_typeof(p_input->'amountReceivedCents') is distinct from 'number'
  then raise exception 'Invalid verified payment exception evidence.'; end if;
  v_amount := (p_input->>'amountCents')::numeric;
  v_received := (p_input->>'amountReceivedCents')::numeric;
  if v_amount < 0 or v_amount > 9007199254740991 or trunc(v_amount) <> v_amount
    or v_received <= 0 or v_received > 9007199254740991 or trunc(v_received) <> v_received
  then raise exception 'Invalid verified payment exception evidence.'; end if;

  -- Always event lock before payment lock. A duplicate event cannot attach to
  -- a different case while two unrelated events for one payment serialize.
  perform pg_advisory_xact_lock(hashtextextended('payment-exception-event:'||v_mode||':'||v_event,0));
  select exception_id into v_seen from payment_exception_events where payment_mode=v_mode and event_id=v_event;
  if found then
    select * into v_row from payment_exceptions where id=v_seen;
    if v_row.payment_intent_id <> v_pi then raise exception 'Provider event is already associated with another payment.'; end if;
    return jsonb_build_object('exception',to_jsonb(v_row),'created',false);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('payment-exception-intent:'||v_mode||':'||v_pi,0));
  select * into v_row from payment_exceptions where payment_mode=v_mode and payment_intent_id=v_pi for update;
  v_now := clock_timestamp(); -- Timestamp after contention, not before waiting for the lock.
  if not found then
    insert into payment_exceptions(id,payment_intent_id,payment_mode,booking_id,amount_cents,amount_received_cents,currency,reason,first_seen_at,last_seen_at)
      values('payreview_'||gen_random_uuid()::text,v_pi,v_mode,p_input->>'bookingId',v_amount::bigint,v_received::bigint,v_currency,p_input->>'reason',v_now,v_now)
      returning * into v_row;
    v_created := true;
  else
    if v_row.amount_cents <> v_amount or v_row.amount_received_cents <> v_received or v_row.currency <> v_currency then
      raise exception 'Payment evidence changed; reconciliation required.';
    end if;
    update payment_exceptions set last_seen_at=greatest(last_seen_at,v_now),event_count=event_count+1 where id=v_row.id returning * into v_row;
    -- Reviewed cases remain reviewed; a later duplicate is not a refund instruction.
  end if;
  insert into payment_exception_events(payment_mode,event_id,exception_id) values(v_mode,v_event,v_row.id);
  return jsonb_build_object('exception',to_jsonb(v_row),'created',v_created);
end; $$;

create or replace function review_payment_exception(p_id text,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_row payment_exceptions%rowtype;
  v_prior payment_exception_reviews%rowtype;
  v_note text := btrim(p_note);
  v_now timestamptz := clock_timestamp();
begin
  if p_note is null or char_length(v_note)<10 or char_length(p_note)>1000
    or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 128
  then raise exception 'Review needs an explanatory note and idempotency key.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('payment-exception-review:'||p_idempotency_key,0));
  select * into v_row from payment_exceptions where id=p_id for update;
  if not found then return null; end if;
  select * into v_prior from payment_exception_reviews where idempotency_key=p_idempotency_key;
  if found then
    if v_prior.exception_id<>p_id or v_prior.note<>v_note then raise exception 'Review key belongs to another action.'; end if;
    return to_jsonb(v_row);
  end if;
  if v_row.status<>'open' then raise exception 'This review case is already closed; no duplicate action was recorded.'; end if;
  v_now := clock_timestamp();
  insert into payment_exception_reviews(idempotency_key,exception_id,note,created_at) values(p_idempotency_key,p_id,v_note,v_now);
  update payment_exceptions set status='reviewed',attention_required=false,reviewed_at=v_now,review_note=v_note
    where id=p_id and status='open' returning * into v_row;
  return to_jsonb(v_row);
end; $$;
revoke execute on function record_payment_exception(jsonb),review_payment_exception(text,text,text) from public,anon,authenticated;
grant execute on function record_payment_exception(jsonb),review_payment_exception(text,text,text) to service_role;
