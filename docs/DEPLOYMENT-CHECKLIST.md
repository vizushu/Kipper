# Deployment preparation (not deployed)

## Minimal single-property topology
Prefer the existing SQLite adapter on ONE long-running Node service plus a persistent disk. No new database account is needed. Do not deploy SQLite on ephemeral/serverless storage, multiple instances, shared network filesystems, or autoscaling. A single instance has maintenance/restart downtime; persistent disk availability and backups are required. Hosting workspace creation is authorized, but paid compute/disk and public deployment still need owner approval.

- Tested runtime: Node24.22.1. Pin the24.x major and validate the host build image/native better-sqlite3 binding before release.
- Build: `npm ci && npm run build`.
- Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`.
- Adapter: `DATA_ADAPTER=sqlite`.
- Disk mount recommendation: `/var/data/kipper`; `SQLITE_PATH=/var/data/kipper/bookings.db`. The application now actually honors SQLITE_PATH; data directory is created on first use. SQLite WAL and SHM files must remain on the same persistent filesystem.
- Set `NEXT_PUBLIC_SITE_URL` to the HTTPS host before building. PWA requires HTTPS except localhost. Never reuse an unrelated existing service.
- Health check: GET `/` verifies HTTP rendering only, NOT DB/Stripe/calendar correctness. Separately verify test booking endpoints and data persistence across restart.
- Follow `.env.example` exactly; email variable names corrected to BOOKING_FROM_EMAIL/HOST_NOTIFY_EMAIL. Secrets belong in the host secret manager, never source control.
- `BOOKING_TEST_MODE` is false/absent by default; explicit true allows TEST preview only. All Stripe live keys remain rejected. `BOOKING_ACCESS_SECRET` minimum32bytes. No public live booking until remaining gates are approved and tested.
- Real email delivery disabled by default; test preview uses local email artifacts even if a provider key exists. Never treat a local email artifact as a delivered receipt.

## Backups and restore
Before applying migrations to any existing database, take a SQLite online backup using the SQLite backup API (or stop all writers and back up the complete database safely). Do not copy only the main file while WAL writes are active. Store encrypted off-instance backups with restricted access and retention policy; test restoration into a separate staging service. Verify bookings, settings, snapshots, and holds after restore. This repository has not provisioned a backup service or executed a production restore. Do not launch until backup ownership and recovery procedure are verified.

## Existing persisted settings
New seeds do not silently overwrite prior admin settings. The quote endpoint refuses to quote if stored cleaning/TOT differ from approved canonical18000/12.75. Review existing15000/10.5 placeholders explicitly in staging; update them through authenticated administration and recheck. Never recalculate old bookings or overwrite accepted snapshots.

## Optional existing Supabase adapter
Only choose if a Supabase project/account is deliberately approved. It requires SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY, full schema migration, canonical properties row, RLS and RPC privilege checks. Code includes per-property advisory locking, hold expiry and compare-and-set payment confirmation plus block-write locking. Actual PostgreSQL execution/concurrent-connection tests have NOT run here because no PostgreSQL server/project is available. Do not claim this production validated or add a new database platform just for staging.

## Verification outstanding
- Supported-browser screenshots at360/393/1440, real interaction/navigation/back-forward, keyboard and install/offline/reconnect tests. Chromium socket calls were denied; cloud browser could not reach isolated local listener. HTTP and VM tests are not visual QA.
- Stripe account creation by owner; test API/webhook end-to-end, wallet device/domain eligibility. Venmo requires separate supported merchant flow, not manual payment auto-confirmation.
- Real OTA calendar/resource mapping, ingestion/conflict workflow; do not mistake delayed iCal for atomic channel synchronization.
- Postgres runtime tests if selected, backup/restore drill, restart durability, capability recovery/renewal and infrastructure token-query redaction.
- Latest font implementation uses deliberate system/Georgia fallback, not remote Google-font fetching, for reproducible clean builds.

## Free public preview (separate from production)
A stateless/free ephemeral service is acceptable ONLY for this disabled preview, after publication approval. Set SITE_PREVIEW_MODE=true at build AND runtime, BOOKING_TEST_MODE=false, EMAIL_DELIVERY_MODE=disabled. Do not configure Stripe, booking-access, admin, email, or database credentials, and never upload an existing booking database. No persistent disk is needed because reservations, payments, contact submissions, guest lookup and admin access are denied before parsing or data access. Root metadata/robots block indexing; visible banner labels preview. Contact/checkout forms are hidden. This is a reviewable PWA/property experience, not a live reservation system. Free-service sleep/restart is acceptable for preview, not validated for production. Build/start/Node commands are the same; HTTPS public URL must be configured before build. No service has been deployed by this task.
