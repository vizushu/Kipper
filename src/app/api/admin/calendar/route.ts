import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {getAdapter} from '@/lib/db';
import {AIRBNB_SOURCE_ID,CALENDAR_PROPERTY_ID,syncAirbnbCalendar} from '@/lib/calendar-sync';
import {json,requireAdmin,apiError,parseBody} from '../../_helpers';
export async function GET(req:NextRequest){
 const denied=await requireAdmin(req);if(denied)return denied;
 try {return json({calendar:await getAdapter().getCalendarStatus(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID),warning:'Calendar feeds are delayed. Freshness does not guarantee cross-platform availability.'});}
 catch{return apiError('CALENDAR_UNAVAILABLE','Calendar status unavailable.',503);}
}
export async function POST(req:NextRequest){
 const denied=await requireAdmin(req);if(denied)return denied;
 const body=await parseBody(req,z.object({action:z.enum(['sync','review-conflict']),confirmEmptySnapshot:z.boolean().optional().default(false)}));if(!body.ok)return body.response;
 try {
  const adapter=getAdapter();
  if(body.data.action==='review-conflict')return json({resolved:await adapter.resolveCalendarConflict(CALENDAR_PROPERTY_ID,AIRBNB_SOURCE_ID,new Date().toISOString())});
  return json(await syncAirbnbCalendar(adapter,{allowEmpty:body.data.confirmEmptySnapshot}));
 }catch{return apiError('CALENDAR_UNAVAILABLE','Calendar operation unavailable; previous blocks are retained.',503);}
}
