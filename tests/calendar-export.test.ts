import {afterEach,it,expect,vi} from 'vitest';
import {serializeDirectCalendar,calendarExportAuthorized} from '../src/lib/calendar-export';
const key='synthetic_capability_not_real_'.repeat(2);
afterEach(()=>vi.unstubAllEnvs());
it('exports all-day checkout-exclusive generic events without guest data or internal IDs',()=>{
 const result=serializeDirectCalendar([{id:'private-booking-record',from:'2027-03-13',to:'2027-03-15'}],key,new Date('2026-10-31T00:00:00Z'));
 expect(result).toContain('DTSTART;VALUE=DATE:20270313\r\nDTEND;VALUE=DATE:20270315');expect(result).toContain('SUMMARY:Unavailable');expect(result).toMatch(/UID:cp-[a-f0-9]{32}@casa-pacifica\.direct/);expect(result).not.toContain('private-booking-record');expect(result).not.toContain(key);expect(result).not.toMatch(/DESCRIPTION|LOCATION|ATTENDEE|TZID/);
 expect(result.split('\r\n').every(line=>Buffer.byteLength(line)<=75)).toBe(true);
});
it('generates stable opaque IDs, deduplicates and rotates capability without retaining old access',()=>{
 const ranges=[{id:'bk_synthetic',from:'2027-11-06',to:'2027-11-08'}];
 const a=serializeDirectCalendar([...ranges,...ranges],key);expect(a.match(/BEGIN:VEVENT/g)).toHaveLength(1);expect(a.match(/UID:.*/)?.[0]).toBe(serializeDirectCalendar(ranges,key).match(/UID:.*/)?.[0]);
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);expect(calendarExportAuthorized(key)).toBe(true);expect(calendarExportAuthorized('wrong')).toBe(false);
 vi.stubEnv('CALENDAR_EXPORT_TOKEN','another_synthetic_token_'.repeat(3));expect(calendarExportAuthorized(key)).toBe(false);
});
it('never exposes a calendar without separate approval or with weak credentials',()=>{
 vi.stubEnv('CALENDAR_EXPORT_ENABLED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN',key);vi.stubEnv('SITE_PREVIEW_MODE','true');expect(calendarExportAuthorized(key)).toBe(false);
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');vi.stubEnv('CALENDAR_EXPORT_TOKEN','short');expect(calendarExportAuthorized('short')).toBe(false);expect(calendarExportAuthorized(null)).toBe(false);
});
it('rejects date injection and malformed ranges rather than producing partial output',()=>{
 for(const from of ['2027-02-30','20270301','2027-03-01\r\nSUMMARY:private'])expect(()=>serializeDirectCalendar([{id:'id',from,to:'2027-03-03'}],key)).toThrow('Calendar export unavailable');
 expect(()=>serializeDirectCalendar([{id:'id',from:'2027-03-03',to:'2027-03-03'}],key)).toThrow();
});
