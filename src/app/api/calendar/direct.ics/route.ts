import {getAdapter} from '@/lib/db';
import {calendarExportAuthorized,serializeDirectCalendar} from '@/lib/calendar-export';
import {CALENDAR_PROPERTY_ID} from '@/lib/calendar-sync';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'};
export async function GET(req:Request){
 const params=new URL(req.url).searchParams;
 if(params.getAll('key').length!==1||!calendarExportAuthorized(params.get('key')))return new Response('Not found',{status:404,headers});
 try {
  const adapter=getAdapter();
  const ranges=await adapter.listCalendarExportRanges(CALENDAR_PROPERTY_ID,new Date().toISOString());
  return new Response(serializeDirectCalendar(ranges,process.env.CALENDAR_EXPORT_TOKEN!),{headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'inline; filename="availability.ics"'}});
 } catch {return new Response('Calendar temporarily unavailable',{status:503,headers});}
}
