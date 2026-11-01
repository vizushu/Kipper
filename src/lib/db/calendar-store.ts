import {createHash} from 'node:crypto';
import {validatedAirbnbCalendarUrl} from '../calendar-feed';
import { listProperties } from '../property';
import { isValidDateStr } from '../dates';
export interface CalendarEvent { uidHash:string; from:string; to:string }
export interface CalendarStatus {
 configurationMatches?:boolean;
 propertyId:string;sourceId:string;status:'pending'|'healthy'|'failed'|'conflict';
 lastSuccessAt:string|null;lastAttemptAt:string;blockCount:number;conflictCount:number;lastReviewedAt:string|null;reviewCount:number;
}
export interface CalendarSnapshot {propertyId:string;sourceId:string;leaseId:string;events:CalendarEvent[];nowISO:string;allowEmpty?:boolean}
export interface CalendarStore {
 beginCalendarSync(propertyId:string,sourceId:string,nowISO?:string):Promise<{leaseId:string}|null>;
 completeCalendarSync(input:CalendarSnapshot):Promise<{applied:boolean;blockCount:number;conflictCount:number}>;
 failCalendarSync(propertyId:string,sourceId:string,leaseId:string,nowISO:string):Promise<void>;
 getCalendarStatus(propertyId:string,sourceId:string):Promise<CalendarStatus|null>;
 listCalendarBlockIds(propertyId:string):Promise<string[]>;
 listCalendarExportRanges(propertyId:string,nowISO:string):Promise<{id:string;from:string;to:string}[]>;
 resolveCalendarConflict(propertyId:string,sourceId:string,nowISO:string):Promise<boolean>;
}
/** Server-only fingerprint: never serialize this value or the underlying private feed URL. */
export function configuredCalendarFingerprint():string|null {
 try {const value=process.env.AIRBNB_ICAL_URL;if(!value)return null;const url=validatedAirbnbCalendarUrl(value);url.searchParams.sort();return createHash('sha256').update(url.href).digest('hex');}catch{return null;}
}
export const CALENDAR_MAX_AGE_MS=15*60_000;
export const CALENDAR_LEASE_MS=2*60_000;
export function calendarPropertyId(id:string):string {
 const property=listProperties().find(p=>p.id===id||p.slug===id||(p.id==='casa-pacifica'&&id==='casa-pacifica-san-diego')||p.configurations?.some(c=>c.id===id));
 if(!property)throw new Error('Calendar inventory is not supported.');return property.id;
}
export function calendarSourceId(source:string):string {if(!/^[a-z][a-z0-9_-]{0,63}$/.test(source))throw new Error('Invalid calendar source.');return source;}
export function calendarTime(value:string):number {const n=Date.parse(value);if(!Number.isFinite(n)||new Date(n).toISOString()!==value)throw new Error('Invalid calendar timestamp.');return n;}
export function validateCalendarEvents(events:CalendarEvent[]):void {
 if(!Array.isArray(events)||events.length>5000)throw new Error('Calendar snapshot needs review.');const ids=new Set<string>();
 for(const e of events){if(!/^[a-f0-9]{64}$/.test(e.uidHash)||ids.has(e.uidHash)||!isValidDateStr(e.from)||!isValidDateStr(e.to)||e.from>=e.to)throw new Error('Calendar snapshot needs review.');ids.add(e.uidHash);}
}

export function calendarStatusReady(status:CalendarStatus|null,nowISO:string,required=false):boolean {
 const now=calendarTime(nowISO);if(!status)return !required;
 const success=status.lastSuccessAt?Date.parse(status.lastSuccessAt):NaN;
 return status.configurationMatches!==false&&(!required||status.configurationMatches===true)&&status.status==='healthy'&&status.conflictCount===0&&Number.isFinite(success)&&success<=now&&now-success<CALENDAR_MAX_AGE_MS;
}
