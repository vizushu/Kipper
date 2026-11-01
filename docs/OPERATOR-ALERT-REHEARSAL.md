# Operator-alert rehearsal (code only; not activated)

Purpose: test the actual durable operator notification queue and transport without inventing a guest, booking, payment exception or calendar incident. This is not the owner-email probe. No actual queue insert, send, credential configuration or launch approval is part of this change.

## Separate approvals

`operatorAlertTransportConfigured()` requires authorized live email configuration plus `OPERATOR_ALERTS_APPROVED=true`. `operatorAlertsConfigured()` additionally requires `OPERATOR_ALERT_DELIVERY_QA_APPROVED=true`; non-rehearsal transport, normal dispatcher authentication, normal drain heartbeat and shared-iCal live intake continue to require that QA approval. Rehearsal success never changes either approval or records a dispatcher heartbeat.

Rehearsal requires:
- Preview and staging both off, while **`BOOKING_PAYMENT_MODE=closed` remains explicit**. Do not open checkout to rehearse.
- Existing SQLite production database (`SQLITE_PATH`), no symlink, no new database or copied production data.
- Verified live email transport (`EMAIL_DELIVERY_MODE=live`, `EMAIL_LIVE_APPROVED=true`, domain-scoped `RESEND_API_KEY`, valid approved `BOOKING_FROM_EMAIL`, `HOST_NOTIFY_EMAIL`, optional approved `BOOKING_REPLY_TO_EMAIL`). The configured operator mailbox must be the owner-approved destination.
- Existing independently generated `OPERATOR_ALERT_WORKER_SECRET`, distinct from admin, calendar, operations, probe, staging and provider credentials.
- `OPERATOR_REHEARSAL_APPROVED=true`, a new UUID `OPERATOR_REHEARSAL_ID`, UTC `OPERATOR_REHEARSAL_ISSUED_AT` and `OPERATOR_REHEARSAL_EXPIRES_AT` no more than one hour apart. Owner approval must cover this exact recipient and one logical test email before configuring these values.

## Existing private entry point

Authenticated POST `/api/operator-alerts/run` with the operator bearer credential and exactly `{"action":"operator-rehearsal"}`. No arbitrary address, body, queue ID or configuration is accepted. For safe readback, use the same authenticated endpoint with exactly `{"action":"operator-rehearsal-status"}`; it returns only authorization ID and state. Existing empty-body/`{}` normal dispatch behavior remains separate and QA-gated. No public UI or cron invokes rehearsal.

The authorization atomically creates one `operator_rehearsal` job in the existing `operator_alerts` queue and a small frozen authorization record. The envelope is fixed and explicitly says this is a rehearsal, not an actual incident; it uses only the approved configured From/operator/Reply-To. ID, expiry, envelope and credential fingerprints cannot change to bypass dedupe. The helper claims only that job and never drains, expires or resolves unrelated alerts. General dispatch and readiness calculations exclude rehearsal jobs.

The existing five-attempt/23-hour queue budget and stable provider idempotency key are retained; the shorter one-hour authorization further limits sends. Accepted/simulated jobs never resend. Only one rehearsal authorization per conservative rolling day is accepted, preventing a new ID from bypassing an uncertain attempt. An uncertain result must be reconciled with the provider; do not create a new ID or reset budgets. Status is readable under the same valid credential/configuration for seven days, but sends stop at the original expiry. Configuration rotation intentionally blocks the frozen authorization.

A returned `provider-accepted` state means only that the provider returned a successful HTTP response to the transport request and the queue acknowledgement was persisted. It does not mean delivered, read or replied to. This existing operator transport does not retain a Resend message ID; there is no signed operator delivery webhook evidence in this change. Verify the actual operator inbox and normal failure/alert procedure before separately approving `OPERATOR_ALERT_DELIVERY_QA_APPROVED`. A later real normal dispatcher run—not a rehearsal—must establish runtime heartbeat. No booking, inventory, charge, refund, incident resolution or readiness flag is changed by rehearsal.
