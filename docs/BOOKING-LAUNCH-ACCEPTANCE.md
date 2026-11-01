# Minimum direct-booking acceptance

This checklist supersedes historic checklist statements that live mode is unimplemented or that exclusive-direct is the only supported policy. It is not launch authorization.

## Required owner decisions and verified setup
- Confirm sellable date-specific accommodation rates or a bounded initial rate rule, minimum/maximum stays, promotions and pet eligibility/fees. Existing $349 baseline, weekend/season multipliers, DIRECT10 and pet-fee code are sample/internal configuration, not approved market pricing. Set `LIVE_PRICING_APPROVED=true` only after reviewing actual stored settings and date overrides. No automatic AI pricing or card surcharge is enabled.
- Confirm current guest terms, exact local check-in cutoff and contracting/merchant details. Current approved cleaning is $180 and Zone 2 TOT is12.75%; current three-bedroom capacity remains eight total. Future expansion stays unavailable.
- Complete Stripe account/domain/payment-method setup, separately authorized test credentials and signed webhook. Verify card success/failure/3DS, expired hold, interrupted flow, duplicate webhook and paid conflict; Apple Pay requires an eligible actual device/account/domain. Do not use live credentials merely to bypass test QA.
- Verify email sender domain and monitored operator recipient, Reply-To, receipt/recovery inbox delivery and retries. Provider HTTP acceptance alone is not inbox delivery. Existing paid messages must continue when new booking acceptance closes, except explicit delivery shutdown or preview.
- Configure separately authorized bounded receipt/recovery maintenance and operator-alert dispatch. The calendar cron remains sync-only; it does not send these messages. Observe natural scheduled runs and fresh heartbeat. Rehearse one synthetic conflict, delivery failure and operator reconciliation without altering real Airbnb inventory.
- Verify persistent single-instance storage, a restricted backup destination outside the app/public tree, an authorized independent/offsite copy and restore-to-new-file rehearsal. Do not overwrite or restore the production database during a test. Render disk persistence alone is not a complete recovery plan.

## Final release sequence
1. Publish reviewed code and observe green CI and exact deployed SHA, retaining preview closure.
2. Run synthetic provider tests in an isolated approved test context; keep test records out of live inventory/export. No real guest messages/charges without explicit authorization.
3. Check authenticated runtime readiness: matching fresh calendar snapshot, dispatcher heartbeat and no dead/overdue alerts. Configuration-only flags are never proof of readiness.
4. Verify server quote for selected dates includes mandatory fees and tax, immutable accepted terms, local hold, verified provider confirmation, receipt and safe booking recovery.
5. Review accepted residual iCal delay risk: no atomic cross-platform lock; operator must respond to conflict alerts and reconcile without automatic cancellation/refund.
6. Obtain explicit final live-release approval. Remove preview only in the approved release, then verify actual booking flow and monitoring before distributing a payable guest link.

## Not required for initial direct launch
Smart-home integrations, video/3D floor plan, AI pricing engine, AI/SMS concierge, Venmo, multi-property/PMS features and future five-bedroom checkout are deferred. No request-to-book or OwnerRez workflow is introduced.
