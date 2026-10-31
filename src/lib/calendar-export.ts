import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {isValidDateStr} from './dates';
import {calendarOperationsApproved} from './calendar-access';
export interface CalendarExportRange {id:string;from:string;to:string}
export function calendarExportAuthorized(candidate:string|null):boolean {
  const token=process.env.CALENDAR_EXPORT_TOKEN;
  if(!calendarOperationsApproved()||process.env.CALENDAR_EXPORT_ENABLED!=='true'||!token||!/^[-_A-Za-z0-9]{43,128}$/.test(token)||!candidate||candidate.length>256)return false;
  return timingSafeEqual(createHash('sha256').update(candidate).digest(),createHash('sha256').update(token).digest());
}
/** Busy dates only. IDs are opaque HMACs; no address, guest, price or notes. */
export function serializeDirectCalendar(ranges:CalendarExportRange[],token:string,now=new Date()):string {
  if(!/^[-_A-Za-z0-9]{43,128}$/.test(token)||!Number.isFinite(now.getTime())||ranges.length>5000)throw new Error('Calendar export unavailable.');
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Casa Pacifica//Private availability//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  const seen=new Set<string>();
  for(const range of [...ranges].sort((a,b)=>a.from.localeCompare(b.from)||a.id.localeCompare(b.id))){
    if(!range.id||!isValidDateStr(range.from)||!isValidDateStr(range.to)||range.to<=range.from)throw new Error('Calendar export unavailable.');
    if(seen.has(range.id))continue;seen.add(range.id);
    const id=createHmac('sha256',token).update(range.id).digest('hex').slice(0,32);
    lines.push('BEGIN:VEVENT',`UID:cp-${id}@casa-pacifica.direct`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${range.from.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${range.to.replace(/-/g,'')}`,'SUMMARY:Unavailable','STATUS:CONFIRMED','TRANSP:OPAQUE','END:VEVENT');
  }
  lines.push('END:VCALENDAR');return lines.join('\r\n')+'\r\n';
}
