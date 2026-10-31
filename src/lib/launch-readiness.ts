import { isPublicPreview } from './booking-launch';
import { getBookingPaymentMode, livePaymentBlockers, requestedPaymentMode } from './payment-mode';
/** Read-only configuration contract. Flags record owner approvals; they do not themselves prove QA or inventory. */
export function getLaunchReadiness() {
  const mode = getBookingPaymentMode();
  const blockers = livePaymentBlockers();
  if (requestedPaymentMode() !== 'live') blockers.unshift('EXPLICIT_LIVE_MODE_REQUIRED');
  if (isPublicPreview()) blockers.unshift('PUBLIC_PREVIEW_OVERRIDE');
  return {
    mode: isPublicPreview() ? 'public_preview' : mode === 'test' ? 'synthetic_test' : mode === 'live' ? 'live_approved_configuration' : 'closed',
    configurationOnly: true,
    canAcceptLiveBookings: mode === 'live',
    inventory: { policy: process.env.CALENDAR_SYNC_ENABLED === 'true' || process.env.CALENDAR_SYNC_REQUIRED === 'true' || process.env.CALENDAR_EXPORT_ENABLED === 'true' ? 'shared_calendar_review_only' : process.env.INVENTORY_POLICY === 'exclusive_direct' ? 'exclusive_direct' : 'manual_review_only',
      instantBookingReady: mode === 'live', physicalInventoryId: 'casa-pacifica', icalIsAuthoritative: false },
    blockers: blockers.map(code => ({ code, owner: 'owner_and_engineering', detail: 'An explicit verified launch prerequisite is missing. Supplying credentials alone cannot open live booking.' })),
    outstandingValidation: ['Actual provider/account and device QA', 'Shared-channel launch policy or verified authoritative inventory integration; delayed iCal is insufficient',
      'Persistent hosting, backup/restore and worker monitoring', 'Final guest terms, rates and check-in cutoff', 'Future five-bedroom capacity and facts remain unapproved'],
  };
}
