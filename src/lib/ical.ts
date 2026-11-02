/** Conservative OFFLINE iCalendar block preview, not authoritative OTA synchronization.
 * Only all-day VEVENTs are accepted. Unsupported/incomplete feeds fail as a whole,
 * never silently omit occupancy. No event summary, UID or feed URL is guest-visible.
 * RFC5545 date-only DTEND is exclusive; missing DTEND means one day.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { addDays, isValidDateStr } from './dates';
import { getProperty } from './property';
import type { BlockedRange } from './types';
export interface ICalImportOptions { propertyId: string; reason?: string }
const MAX_BYTES=1024*1024;
const MAX_EVENTS=5000;
const GENERIC_REASON='Imported calendar block — manual verification required';
function invalid():never { throw new Error('Calendar needs manual review: unsupported, malformed or incomplete data. No blocks were imported.'); }
function date(value:string):string {
 if(!/^\d{8}$/.test(value))invalid();
 const result=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
 if(!isValidDateStr(result))invalid();return result;
}
export function parseICal(text:string,opts:ICalImportOptions):BlockedRange[]{
 if(Buffer.byteLength(text,'utf8')>MAX_BYTES||text.includes('\0'))invalid();
 const property=getProperty(opts.propertyId);if(!property)invalid();
 const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
 const unfolded:string[]=[];
 for(const line of lines){if(/^[ \t]/.test(line)){if(!unfolded.length)invalid();unfolded[unfolded.length-1]+=line.slice(1);}else unfolded.push(line);}
 const content=unfolded.filter(l=>l!=='');
 if(content[0]!=='BEGIN:VCALENDAR'||content.at(-1)!=='END:VCALENDAR')invalid();
 let inEvent=false,start:string|undefined,end:string|undefined,uid:string|undefined;
 const seen=new Set<string>();const ranges:BlockedRange[]=[];
 for(const line of content.slice(1,-1)){
  if(line==='BEGIN:VEVENT'){if(inEvent)invalid();inEvent=true;start=end=uid=undefined;continue;}
  if(line==='END:VEVENT'){
   if(!inEvent||!start||!uid||seen.has(uid))invalid();
   const to=end??addDays(start,1);if(to<=start)invalid();seen.add(uid);
   if(ranges.length>=MAX_EVENTS)invalid();
   const id='ical_'+createHash('sha256').update(JSON.stringify([property.id,uid,start,to])).digest('hex').slice(0,32);
   ranges.push({id,propertyId:property.id,from:start,to,reason:GENERIC_REASON});inEvent=false;continue;
  }
  if(line.startsWith('BEGIN:')||line.startsWith('END:'))invalid();
  const colon=line.indexOf(':');if(colon<1)invalid();const key=line.slice(0,colon),value=line.slice(colon+1);
  if(!inEvent){if(!['VERSION','PRODID','CALSCALE','METHOD'].includes(key)&&!key.startsWith('X-'))invalid();if(key==='METHOD'&&value!=='PUBLISH')invalid();continue;}
  if(key==='DTSTART;VALUE=DATE'){if(start)invalid();start=date(value);}
  else if(key==='DTEND;VALUE=DATE'){if(end)invalid();end=date(value);}
  else if(key==='UID'){if(uid||!value||value.length>1024)invalid();uid=value;}
  else if(key==='STATUS'){if(value!=='CONFIRMED'&&value!=='TENTATIVE')invalid();}
  else if(key==='TRANSP'){if(value!=='OPAQUE')invalid();}
  else if(['SUMMARY','DESCRIPTION','LOCATION','URL','DTSTAMP','CREATED','LAST-MODIFIED','SEQUENCE'].includes(key)||key.startsWith('X-')){/* Discard private descriptive metadata. */}
  else invalid(); // Timed/TZID/recurrence/exclusions/alarms require an approved richer adapter.
 }
 if(inEvent)invalid();return ranges;
}
/** Remote feeds require an approved, SSRF-safe bounded transport and provenance model.
 * Deliberately disabled: do not turn arbitrary URLs into server-side fetch requests.
 */
export async function importICalFromUrl(_url:string,_opts:ICalImportOptions):Promise<BlockedRange[]>{
 throw new Error('Remote calendar fetching is disabled. Use a reviewed local export; iCal is not authoritative inventory synchronization.');
}
export async function importICalFile(filePath:string,opts:ICalImportOptions):Promise<BlockedRange[]>{
 const stat=await fs.promises.stat(filePath);if(!stat.isFile()||stat.size>MAX_BYTES)invalid();
 return parseICal(await fs.promises.readFile(filePath,'utf8'),opts);
}
