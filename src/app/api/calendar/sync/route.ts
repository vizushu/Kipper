import {createHash} from 'node:crypto';
import {z} from 'zod';
import {getAdapter} from '@/lib/db';
import {calendarWorkerAuthorized} from '@/lib/calendar-access';
import {AIRBNB_SOURCE_ID,CALENDAR_PROPERTY_ID,syncAirbnbCalendar} from '@/lib/calendar-sync';
import {apiError,json,parseBody} from '../../_helpers';
const hidden=()=>apiError('NOT_FOUND','Not found',404);
export async function GET(req:Request){
 if(!calendarWorkerAuthorized(req))return hidden();
 try{return json({calendar:await getAdapter().getCalendarStatus(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID),delayedFeed:true});}
 catch{return apiError('CALENDAR_UNAVAILABLE','Calendar status unavailable.',503);}
}
export async function POST(req:Request){
 if(!calendarWorkerAuthorized(req))return hidden();
 const body=await parseBody(req,z.object({action:z.enum(['sync','review-conflict']).default('sync'),confirmEmptySnapshot:z.boolean().optional().default(false)}));if(!body.ok)return body.response;
 try{
  const adapter=getAdapter();
  if(!(await adapter.consumeRateLimit(createHash('sha256').update('calendar-operator:v1').digest('hex'),12,900,new Date().toISOString())).allowed)return apiError('RATE_LIMITED','Calendar operation limit reached; retry later.',429);
  if(body.data.action==='review-conflict')return json({resolved:await adapter.resolveCalendarConflict(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID,new Date().toISOString())});
  return json(await syncAirbnbCalendar(adapter,{allowEmpty:body.data.confirmEmptySnapshot}));
 }catch{return apiError('CALENDAR_UNAVAILABLE','Calendar operation unavailable; previous blocks are retained.',503);}
}
