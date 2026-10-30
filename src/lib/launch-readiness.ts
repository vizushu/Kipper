import { isPublicPreview } from './booking-launch';
/** Read-only launch contract. Configuration alone cannot certify inventory or enable money movement. */
export function getLaunchReadiness(){
 return {
  mode:isPublicPreview()?'public_preview':process.env.BOOKING_TEST_MODE==='true'?'synthetic_test':'closed',
  canAcceptLiveBookings:false,
  inventory:{policy:'manual_review_only',instantBookingReady:false,physicalInventoryId:'casa-pacifica',icalIsAuthoritative:false},
  blockers:[
   {code:'AUTHORITATIVE_INVENTORY_REQUIRED',owner:'owner_and_engineering',detail:'Choose and verify exclusive direct inventory or an authoritative cross-channel reservation strategy. Local transactions and iCal polling cannot atomically reserve OTA inventory.'},
   {code:'LIVE_PAYMENT_MODE_NOT_IMPLEMENTED',owner:'engineering_and_owner',detail:'Current Stripe evidence, booking payment states and confirmation paths are deliberately test-only. Supplying a live key is not a launch switch.'},
   {code:'PROVIDER_AND_DEVICE_QA_REQUIRED',owner:'owner_and_engineering',detail:'Verify Stripe account, eligible Apple Pay with card fallback, webhooks and email delivery using approved accounts before any real transactions.'},
   {code:'PERSISTENT_OPERATIONS_REQUIRED',owner:'owner_and_operations',detail:'Approve persistent hosting, verified backup/restore, bounded worker scheduling and failure monitoring. Free preview storage is not production durability.'},
   {code:'FINAL_GUEST_TERMS_AND_RATES_REQUIRED',owner:'owner',detail:'Finalize nightly rates, check-in cutoff, bed facts, contracting/privacy details and channel inventory policy. Future five-bedroom checkout remains unapproved.'},
  ],
 } as const;
}
