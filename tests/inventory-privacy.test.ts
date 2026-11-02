import {describe,it,expect,vi} from 'vitest';
import {parseICal,importICalFromUrl} from '../src/lib/ical';
import {assertRangeAvailable} from '../src/lib/availability';
import {DEFAULT_PRICING_SETTINGS} from '../src/lib/pricing';
const options={propertyId:'casa-pacifica'};
const event=(extra='')=>`BEGIN:VEVENT\nUID:synthetic-private-reference\nDTSTART;VALUE=DATE:20270220\nDTEND;VALUE=DATE:20270222\nSUMMARY:Synthetic private guest name\n${extra}\nEND:VEVENT`;
const calendar=(body=event())=>`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:synthetic\n${body}\nEND:VCALENDAR`;
describe('conservative inventory privacy',()=>{
 it('does not expose private admin block reason through unavailable errors',()=>{
  const input={settings:DEFAULT_PRICING_SETTINGS,checkIn:'2027-02-20',checkOut:'2027-02-22',bookings:[],blocks:[{id:'private',propertyId:'casa-pacifica',from:'2027-02-20',to:'2027-02-22',reason:'Synthetic private guest name / private reference'}],now:new Date('2026-10-30T12:00:00Z')};
  expect(()=>assertRangeAvailable(input)).toThrow('Those dates are unavailable. Please choose another stay.');
 });
 it('preserves exclusive all-day checkout and deterministic IDs but discards private metadata',()=>{
  const parsed=parseICal(calendar(),options);expect(parsed).toEqual(parseICal(calendar(),options));expect(parsed[0]).toMatchObject({from:'2027-02-20',to:'2027-02-22',propertyId:'casa-pacifica'});
  expect(JSON.stringify(parsed)).not.toMatch(/Synthetic private guest name|synthetic-private-reference/);
  expect(parseICal(calendar(event().replace('DTEND;VALUE=DATE:20270222\n','')),options)[0].to).toBe('2027-02-21');
 });
 it.each(['RRULE:FREQ=DAILY','RDATE;VALUE=DATE:20270225','EXDATE;VALUE=DATE:20270221','STATUS:CANCELLED','TRANSP:TRANSPARENT','DURATION:P3D','RECURRENCE-ID;VALUE=DATE:20270220','DTSTART;TZID=America/New_York:20270220T150000'])('fails whole feed rather than ignoring unsupported occupancy: %s',line=>expect(()=>parseICal(calendar(event(line)),options)).toThrow('manual review'));
 it('rejects malformed, truncated, duplicate and invalid-date events without partial results',()=>{
  for(const text of [calendar(event().replace('DTSTART;VALUE=DATE:20270220\n','')),calendar(event().replace('20270220','20270230')),calendar(event()).replace('END:VEVENT',''),calendar(event()+'\n'+event()),calendar().replace('DTEND;VALUE=DATE:20270222','DTEND;VALUE=DATE:20270219'),calendar().replace('UID:synthetic-private-reference\n',''),calendar().replace('DTSTART;VALUE=DATE:20270220','DTSTART:20270220T150000Z')])expect(()=>parseICal(text,options)).toThrow('manual review');
 });
 it('rejects oversized input and unknown inventory',()=>{expect(()=>parseICal('x'.repeat(1024*1024+1),options)).toThrow();expect(()=>parseICal(calendar(),{propertyId:'unknown'})).toThrow();});
 it('never fetches arbitrary remote feeds or exposes the supplied URL in errors',async()=>{const fetch=vi.spyOn(globalThis,'fetch');await expect(importICalFromUrl('http://169.254.169.254/private-token',options)).rejects.toThrow('Remote calendar fetching is disabled');expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();});
});
