import {getAdapter} from '@/lib/db';
import {isBookingEnabled} from '@/lib/booking-launch';
import {verifyBookingAccessToken} from '@/lib/booking-access';
import {apiError,json} from '../../../_helpers';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!isBookingEnabled())return apiError('BOOKING_NOT_OPEN','Payments are not open.',503);
 const authorization=req.headers.get('authorization')??'';
 if(!authorization.startsWith('Bearer ')||authorization.length>2100)return apiError('NOT_FOUND','Not found',404);
 try{const adapter=getAdapter();const booking=await adapter.getBooking((await ctx.params).id);
  if(!booking||!verifyBookingAccessToken(booking.reference,authorization.slice(7)))return apiError('NOT_FOUND','Not found',404);
  const eligible=await adapter.getPaymentEligibleBooking(booking.id);
  return eligible?json({eligible:true,expiresAt:eligible.holdExpiresAt}):apiError('AVAILABILITY_CHANGED','Availability changed or the hold expired. Do not submit payment; contact Casa Pacifica if an attempt was already sent.',409);
 }catch{return apiError('PAYMENT_CHECK_UNAVAILABLE','Payment eligibility could not be checked.',503);}
}
