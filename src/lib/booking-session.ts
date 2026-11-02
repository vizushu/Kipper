/** One scoped browser booking session. The capability never belongs in a URL. */
export const BOOKING_SESSION_COOKIE='cp_booking_access';
export function bookingSessionCookie(token:string){return {name:BOOKING_SESSION_COOKIE,value:token,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/booking/',maxAge:24*60*60};}
