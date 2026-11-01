# Bounded operations worker — code only, inactive by default

No worker service, schedule, credential, deployment or provider change is created here. Enabling/scheduling requires separate owner approval. This endpoint does not open bookings, enable email, resolve incidents, refund payments or sync calendars.

## Contract

- POST `https://innkipper.com/api/operations/run`.
- Require `OPERATIONS_WORKER_APPROVED=true` and independent random base64url `OPERATIONS_WORKER_SECRET` (43–128 characters; at least 32 random bytes).
- `Authorization: Bearer <secret>`; constant-time digest comparison. No admin session or administrator privileges. Never place the key in a URL/log.
- Reject secret reuse with configured admin, calendar, operator, probe, guest-access, staging or webhook credentials.
- Preview and staging always return 404 before any database/body processing, irrespective of contradictory approval flags.
- SQLite only; Supabase is explicitly unsupported. Uses the same `SQLITE_PATH` (or `cwd/data/bookings.db`) as the main adapter, requires an existing initialized regular application database, rejects symlink files/ancestors, and never silently creates another database.
- No request body/actions/job IDs are accepted or interpreted. Responses contain only fixed status labels and aggregate counts, with private no-store caching. All failures are redacted.

## Work and concurrency

A single private `operations_worker_lease` row is acquired transactionally in the application SQLite database. It combines a rolling two-minute start budget and a five-minute crash-recovery lease. Release compares the random token hash; an old execution cannot release a successor's lease. Denied runs return 429 with Retry-After. The table has no guest data or raw credentials.

Each accepted run:
1. Expires overdue pending holds via the existing atomic adapter query (never confirmed bookings).
2. Attempts at most **one** receipt/recovery outbox job.
3. Attempts at most **one** operator alert job, even if the previous subjob failed.

Existing immutable envelopes, cancellation/recovery suppression, paid/live provenance, delivery approvals, job leases, dedupe keys, provider acceptance persistence, retry-attempt limits and retry windows remain authoritative. Closing new booking intake does not suppress authorized historical delivery. Disabled, failed, skipped and retried subjobs produce `review-required`, not a false successful drain. No calendar fetch/sync is added; operator health evaluation retains its existing behavior.

The cooperative server budget is 45 seconds: a delivery subjob starts only while at least 20 seconds remain. Existing provider calls have 10-second aborts and outbox response parsing has its existing bounded body/deadline. SQLite lock waits are bounded (lease connection two seconds, existing adapter defaults unchanged). This is **not a hard kill of in-progress server work**; the endpoint awaits each started operation before releasing its lease. A client deadline does not cancel the server. Crash leases plus existing per-job idempotency/leases are retained precisely for this uncertainty. No unawaited delivery is launched.

## Dependency-free runner

`node scripts/run-operations.mjs` reads only `OPERATIONS_WORKER_SECRET` for auth. Destination is hardcoded to `https://innkipper.com/api/operations/run`, redirects are errors, request is POST, no retries. Fetch/body deadline is 55 seconds, CLI emergency exit 60 seconds; response body cap is 4 KiB. Output is only `{ok,status}` and exit code 0 only when every subjob reports completed. It never echoes provider errors, response text, keys or guest data. Preview/staging environment flags prevent even attempting the request.

This runner is **separate** from `scripts/sync-calendar.mjs`. Do not replace/extend the existing calendar cron without owner approval. If a future approved orchestrator runs both sequentially, budget at least the sum of their independent deadlines plus startup overhead (calendar CLI 30 seconds + operations CLI 60 seconds), and report both statuses separately. Its existing 20-second fetch budget cannot cover both workers. No orchestration or schedule is installed by this patch.

The one-job-per-queue cap means backlog throughput is intentionally low; observe aggregate results and obtain approval for a reviewed throughput/runtime change rather than silently raising limits. Provider acceptance is not inbox delivery. Recovery and receipt dispatch still need their separately approved delivery configuration; this code does not establish provider readiness.
