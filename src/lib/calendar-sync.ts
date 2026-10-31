import type {DataAdapter} from './db/adapter';
import {calendarStatusReady} from './db/calendar-store';
import {fetchAirbnbCalendar,parseAirbnbCalendar} from './calendar-feed';
import {calendarSyncEnabled} from './calendar-access';
import {BookingError} from './types';
export const AIRBNB_SOURCE_ID='airbnb-primary';
export const CALENDAR_PROPERTY_ID='casa-pacifica';
/** Network is explicitly approved independently of booking mode; never called by guest routes. */
export async function syncAirbnbCalendar(adapter:DataAdapter,options:{allowEmpty?:boolean;fetcher?:(url:string)=>Promise<string>;now?:()=>Date}={}) {
  if(!calendarSyncEnabled())return {status:'disabled' as const};
  const url=process.env.AIRBNB_ICAL_URL;
  if(!url)return {status:'not-configured' as const};
  const now=options.now??(()=>new Date());
  const lease=await adapter.beginCalendarSync(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID,now().toISOString());
  if(!lease)return {status:'busy' as const};
  try {
    const text=await (options.fetcher??fetchAirbnbCalendar)(url);
    const parsed=parseAirbnbCalendar(text,CALENDAR_PROPERTY_ID);
    const result=await adapter.completeCalendarSync({propertyId:CALENDAR_PROPERTY_ID,sourceId:AIRBNB_SOURCE_ID,leaseId:lease.leaseId,events:parsed.events,nowISO:now().toISOString(),allowEmpty:options.allowEmpty===true});
    return {status:result.applied?'updated' as const:'review-required' as const,blockCount:result.blockCount,conflictCount:result.conflictCount};
  } catch {
    await adapter.failCalendarSync(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID,lease.leaseId,now().toISOString());
    return {status:'failed' as const}; // Never return URL, raw events or transport errors.
  }
}
export async function assertCalendarReady(adapter:DataAdapter,propertyId:string,now=new Date()) {
  const status=await adapter.getCalendarStatus(propertyId,AIRBNB_SOURCE_ID);
  if(!calendarStatusReady(status,now.toISOString(),process.env.CALENDAR_SYNC_REQUIRED==='true'))throw new BookingError('UNAVAILABLE','Availability needs host review. Please contact Casa Pacifica about your dates.');
}
