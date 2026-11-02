import {z} from 'zod';
import {nightlyRateCents} from './pricing';
import {todayInLA} from './dates';
import {liveEmailDeliveryConfigured} from './email-delivery';
import {getProperty} from './property';
import type {DataAdapter} from './db/adapter';
import {calendarStatusReady} from './db/calendar-store';
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
    configurationPermitsLiveBookings: mode === 'live',
    canAcceptLiveBookings: false, // Config alone cannot certify runtime inventory or delivery.
    inventory: { policy: process.env.INVENTORY_POLICY==='shared_ical' ? 'shared_ical_owner_risk_accepted' : process.env.CALENDAR_SYNC_ENABLED === 'true' || process.env.CALENDAR_SYNC_REQUIRED === 'true' || process.env.CALENDAR_EXPORT_ENABLED === 'true' ? 'shared_calendar_review_only' : process.env.INVENTORY_POLICY === 'exclusive_direct' ? 'exclusive_direct' : 'manual_review_only',
      instantBookingReady: false, physicalInventoryId: 'casa-pacifica', icalIsAuthoritative: false },
    blockers: blockers.map(code => ({ code, owner: 'owner_and_engineering', detail: 'An explicit verified launch prerequisite is missing. Supplying credentials alone cannot open live booking.' })),
    outstandingValidation: ['Actual provider/account and device QA', 'Shared iCal lag/conflict response rehearsal; no cross-platform atomicity guarantee',
      'Persistent hosting, backup/restore and worker monitoring', 'Final guest terms, rates and check-in cutoff', 'Future five-bedroom capacity and facts remain unapproved'],
  };
}

const readinessSettingsSchema=z.object({cleaningFeeCents:z.number().int().min(0).max(100_000),taxRatePct:z.number().min(0).max(100),minStayNights:z.number().int().min(1).max(365),maxStayNights:z.number().int().min(1).max(365),promos:z.array(z.object({code:z.string().trim().min(1).max(32),type:z.literal('percent'),percent:z.number().min(1).max(100),description:z.string().max(200).optional()})).max(50)}).refine(s=>s.minStayNights<=s.maxStayNights);
/** Authenticated preflight only. Does not change approval flags or initiate external work. */
export async function getRuntimeLaunchReadiness(adapter:DataAdapter,now=new Date()) {
 const report=getLaunchReadiness();
 if(isPublicPreview())return {...report,runtimeChecked:false};
 try {
  const shared=process.env.INVENTORY_POLICY==='shared_ical';
  const [source,alerts,settings]=await Promise.all([
   shared?adapter.getCalendarStatus('casa-pacifica','airbnb-primary'):Promise.resolve(null),
   shared?adapter.getOperatorAlertReadiness(now.toISOString()):Promise.resolve(null),
   adapter.getSettings(),
  ]);
  const calendarReady=!shared||calendarStatusReady(source,now.toISOString(),true);
  const alertsReady=!shared||alerts?.ready===true;
  const emailReady=liveEmailDeliveryConfigured();
  const property=getProperty('casa-pacifica');
  const pricingReady=readinessSettingsSchema.safeParse(settings).success&&settings.cleaningFeeCents===property?.cleaningFeeCents&&settings.taxRatePct===property?.taxRatePct;
  const ready=report.configurationPermitsLiveBookings&&calendarReady&&alertsReady&&emailReady&&pricingReady;
  return {...report,configurationOnly:false,runtimeChecked:true,canAcceptLiveBookings:ready,
   inventory:{...report.inventory,instantBookingReady:ready},
   runtime:{calendarReady,alertsReady,emailReady,pricingReady,sourceLastSuccessAt:source?.lastSuccessAt??null,alertLastSuccessAt:alerts?.lastSuccessAt??null},
   pricing:{inclusiveNightlyAllowanceBps:property?.inclusiveNightlyAllowanceBps??0,effectiveNightlyCents:property?nightlyRateCents(property,todayInLA(),{}):null,baseNightlyCents:getProperty('casa-pacifica')?.baseNightlyCents,minNightlyCents:getProperty('casa-pacifica')?.minNightlyCents,maxNightlyCents:getProperty('casa-pacifica')?.maxNightlyCents,ownerApprovalRecorded:process.env.LIVE_PRICING_APPROVED==='true',cleaningFeeCents:settings.cleaningFeeCents,taxRatePct:settings.taxRatePct,minStayNights:settings.minStayNights,maxStayNights:settings.maxStayNights,promos:settings.promos,requiresDateRateReview:true},
   blockers:[...report.blockers,...(!pricingReady?[{code:'RUNTIME_PRICING_REVIEW_REQUIRED',owner:'owner_and_engineering',detail:'Stored pricing must match approved cleaning/tax and valid stay/promotion settings before quoting.'}]:[]),...(!emailReady?[{code:'RUNTIME_EMAIL_NOT_READY',owner:'owner_and_engineering',detail:'Approved email transport and valid sender/recipient configuration are required.'}]:[]),...(!calendarReady?[{code:'RUNTIME_CALENDAR_NOT_READY',owner:'owner_and_engineering',detail:'A current matching healthy calendar snapshot is required.'}]:[]),...(!alertsReady?[{code:'RUNTIME_ALERTS_NOT_READY',owner:'owner_and_engineering',detail:'A current verified dispatcher heartbeat with no overdue/dead alerts is required.'}]:[])],
   notice:'Point-in-time checks only. Every hold and payment rechecks inventory; iCal does not prevent simultaneous cross-platform bookings.'};
 }catch{return {...report,runtimeChecked:false,canAcceptLiveBookings:false,runtimeError:'Readiness data unavailable; do not open checkout.'};}
}
