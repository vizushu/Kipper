import type {DataAdapter} from './db/adapter';
import {isPublicPreview} from './booking-launch';
import {processOutbox} from './outbox';
/** Bounded maintenance step. Caller must authenticate; no scheduler is provisioned here. */
export async function runMaintenance(adapter:DataAdapter){
 if(isPublicPreview())return {disabled:true,expiredHolds:0};
 const expiredHolds=await adapter.expirePendingBookings();
 const delivery=await processOutbox(adapter,{limit:10});
 return {disabled:false,expiredHolds,delivery};
}
export async function maintenanceSummary(adapter:DataAdapter){
 if(isPublicPreview())return {disabled:true};
 const jobs=await adapter.listOutbox();
 const counts={pending:0,processing:0,sent:0,simulated:0,suppressed:0,dead:0};
 for(const job of jobs)counts[job.status]++;
 const paymentCases=await adapter.listPaymentExceptions();
 const openPaymentReviews=paymentCases.filter(item=>item.attentionRequired).length;
 return {disabled:false,counts,openPaymentReviews,needsReview:counts.dead>0||openPaymentReviews>0};
}
