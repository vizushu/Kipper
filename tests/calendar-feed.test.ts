import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
vi.mock('node:dns/promises',()=>({lookup:vi.fn()}));
vi.mock('node:https',()=>({request:vi.fn()}));
import {lookup} from 'node:dns/promises';
import type {LookupAddress} from 'node:dns';
const mockLookup=vi.mocked(lookup as (host:string,options:{all:true;verbatim:true})=>Promise<LookupAddress[]>);
import {request} from 'node:https';
import {CALENDAR_MAX_BYTES,fetchAirbnbCalendar,isPublicCalendarAddress,parseAirbnbCalendar,validatedAirbnbCalendarUrl} from '../src/lib/calendar-feed';
const feed=(...events:string[])=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:synthetic\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
const event=(uid='synthetic-event',extra='')=>`BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTART;VALUE=DATE:20270313\r\nDTEND;VALUE=DATE:20270315\r\n${extra?extra+'\r\n':''}END:VEVENT`;
const url='https://www.airbnb.com/calendar/ical/synthetic.ics?key=synthetic-private-key';

describe('calendar snapshots',()=>{
 it('keeps exclusive dates stable over spring/fall DST and never returns private fields',()=>{
  const text=feed(event('private-uid','SUMMARY:Private Guest Name\r\nDESCRIPTION:Private booking reference\r\nLOCATION:Private address'),event('fall','STATUS:CONFIRMED').replaceAll('20270313','20271106').replaceAll('20270315','20271108'));
  const parsed=parseAirbnbCalendar(text,'property');
  expect(parsed.events.map(e=>[e.from,e.to]).sort()).toEqual([['2027-03-13','2027-03-15'],['2027-11-06','2027-11-08']]);
  expect(JSON.stringify(parsed)).not.toMatch(/Private|private-uid|booking reference/);expect(parsed.events[0].uidHash).toMatch(/^[a-f0-9]{64}$/);
 });
 it('uses stable source-scoped UID hashes for changed dates and one-day default',()=>{
  const first=parseAirbnbCalendar(feed(event()),'property').events[0];
  const updated=parseAirbnbCalendar(feed(event().replace('DTEND;VALUE=DATE:20270315\r\n','')),'property').events[0];
  expect(updated.uidHash).toBe(first.uidHash);expect(updated.to).toBe('2027-03-14');
  expect(parseAirbnbCalendar(feed(event()),'other-property').events[0].uidHash).not.toBe(first.uidHash);
 });
 it('deduplicates identical events, rejects conflicting duplicate snapshots',()=>{
  expect(parseAirbnbCalendar(feed(event(),event()),'property').events).toHaveLength(1);
  expect(()=>parseAirbnbCalendar(feed(event(),event().replace('20270315','20270316')),'property')).toThrow('manual review');
 });
 it('supports explicit cancelled UID without dates, but does not mix cancelled and active copies',()=>{
  const cancelled='BEGIN:VEVENT\r\nUID:synthetic-event\r\nSTATUS:CANCELLED\r\nEND:VEVENT';
  const result=parseAirbnbCalendar(feed(cancelled),'property');expect(result.events).toEqual([]);expect(result.cancelledUidHashes).toHaveLength(1);
  expect(result.cancelledUidHashes[0]).toBe(parseAirbnbCalendar(feed(event()),'property').events[0].uidHash);
  expect(()=>parseAirbnbCalendar(feed(event(),cancelled),'property')).toThrow();
 });
 it('ignores marked own exports only, while retaining all ordinary Airbnb events',()=>{
  const result=parseAirbnbCalendar(feed(event('opaque@casa-pacifica.direct'),event('ordinary')),'property');
  expect(result.ignoredOwnEvents).toBe(1);expect(result.events).toHaveLength(1);
 });
 it('accepts valid empty full snapshots and folded descriptive metadata',()=>{
  expect(parseAirbnbCalendar(feed(),'property').events).toEqual([]);
  expect(parseAirbnbCalendar(feed(event('a','SUMMARY:private\r\n continued')),'property').events).toHaveLength(1);
 });
 it.each([
  event().replace('20270313','20270230'),event().replace('20270315','20270313'),event().replace('20270315','20270312'),
  event('a','RRULE:FREQ=DAILY'),event('a','EXDATE;VALUE=DATE:20270314'),event('a','RECURRENCE-ID;VALUE=DATE:20270313'),
  event().replace('DTSTART;VALUE=DATE:20270313','DTSTART;TZID=America/Los_Angeles:20270313T150000'),
  event().replace('DTSTART;VALUE=DATE:20270313','DTSTART:20270313T220000Z'),event('a','TRANSP:TRANSPARENT'),
  event().replace('UID:synthetic-event\r\n',''),event('a','STATUS:UNKNOWN'),event('a','BEGIN:VALARM\r\nEND:VALARM'),
 ])('fails an entire snapshot on unsupported/malformed occupancy semantics',bad=>{expect(()=>parseAirbnbCalendar(feed(event('valid'),bad),'property')).toThrow();});
 it('rejects incomplete, nested, oversized and excessive-event feeds',()=>{
  for(const text of [feed(event()).replace('END:VCALENDAR',''),feed(event()).replace('VERSION:2.0','VERSION:1.0'),feed(event()).replace('END:VEVENT',''),feed(event())+'\0',feed(event('a','SUMMARY:'+'x'.repeat(CALENDAR_MAX_BYTES)))])expect(()=>parseAirbnbCalendar(text,'property')).toThrow();
  expect(()=>parseAirbnbCalendar(feed(...Array.from({length:5001},(_,i)=>event(String(i)))),'property')).toThrow();
 });
});

describe('destination and network boundary',()=>{
 it.each(['http://www.airbnb.com/calendar/ical/1.ics','https://airbnb.com/calendar/ical/1.ics','https://www.airbnb.com.evil.test/calendar/ical/1.ics','https://user:pass@www.airbnb.com/calendar/ical/1.ics','https://www.airbnb.com:8443/calendar/ical/1.ics','https://www.airbnb.com/calendar/ical/1.ics#fragment','https://www.airbnb.com/rooms/123','https://127.0.0.1/calendar/ical/1.ics','https://www.airbnb.com/calendar/ical/%2e%2e/private.ics'])('rejects a non-allowlisted URL',value=>{expect(()=>validatedAirbnbCalendarUrl(value)).toThrow();});
 it('accepts private-key query without exposing or modifying it',()=>{expect(validatedAirbnbCalendarUrl(url).hostname).toBe('www.airbnb.com');});
 it.each(['127.0.0.1','10.0.0.1','0.0.0.0','169.254.169.254','168.63.129.16','172.16.1.1','192.168.1.1','100.64.0.1','192.0.0.1','192.0.2.1','198.18.0.1','198.51.100.3','203.0.113.1','224.0.0.1','255.255.255.255','::1','::','fc00::1','fe80::1','::ffff:127.0.0.1','2002:7f00::1','2001:db8::1','2001::1','3fff::1','not-an-ip'])('rejects private/reserved address %s',address=>{expect(isPublicCalendarAddress(address)).toBe(false);});
 it.each(['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])('recognizes globally routed synthetic addresses %s',address=>{expect(isPublicCalendarAddress(address)).toBe(true);});
});

class Response extends EventEmitter {
 statusCode=200;headers:Record<string,string>={'content-type':'text/calendar; charset=utf-8'};complete=true;destroy=vi.fn();
}
function responseMock(run:(res:Response)=>void) {
 const req=new EventEmitter() as EventEmitter&{end:()=>void;destroy:ReturnType<typeof vi.fn>};req.destroy=vi.fn();
 vi.mocked(request).mockImplementation(((...args:unknown[])=>{const callback=args[2] as (res:Response)=>void;
 req.end=()=>queueMicrotask(()=>{const res=new Response();callback(res);run(res);});return req;}) as unknown as typeof request);
 return req;
}

describe('bounded pinned HTTPS transport without external calls',()=>{
 beforeEach(()=>{vi.resetAllMocks();mockLookup.mockResolvedValue([{address:'1.1.1.1',family:4}]);});
 afterEach(()=>{vi.useRealTimers();});
 it('pins validated DNS and keeps TLS hostname, returns only calendar bytes',async()=>{
  responseMock(res=>{res.emit('data',Buffer.from(feed(event())));res.emit('end');});
  expect(await fetchAirbnbCalendar(url)).toBe(feed(event()));
  const options=vi.mocked(request).mock.calls[0][1] as Record<string,unknown>;
  expect(options.servername).toBe('www.airbnb.com');expect(options.agent).toBe(false);expect(options).not.toHaveProperty('rejectUnauthorized');
  const callback=vi.fn();(options.lookup as Function)('www.airbnb.com',{},callback);expect(callback).toHaveBeenCalledWith(null,'1.1.1.1',4);
 });
 it('rejects any private DNS answer before a request and redacts failed URLs',async()=>{
  mockLookup.mockResolvedValue([{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]);
  await expect(fetchAirbnbCalendar(url)).rejects.not.toThrow('synthetic-private-key');expect(request).not.toHaveBeenCalled();
 });
 it('rejects redirect, HTML, compression and oversized content-length before reading',async()=>{
  for(const change of [(r:Response)=>r.statusCode=302,(r:Response)=>r.headers['content-type']='text/html',(r:Response)=>r.headers['content-encoding']='gzip',(r:Response)=>r.headers['content-length']=String(CALENDAR_MAX_BYTES+1)]){
   vi.mocked(request).mockImplementation(((...args:unknown[])=>{const req=new EventEmitter() as EventEmitter&{end:()=>void;destroy:()=>void};req.destroy=vi.fn();req.end=()=>queueMicrotask(()=>{const res=new Response();change(res);(args[2] as Function)(res);});return req;}) as unknown as typeof request);
   await expect(fetchAirbnbCalendar(url)).rejects.toThrow('manual review');
  }
 });
 it('bounds actual stream length and rejects truncated/calendar-shaped errors',async()=>{
  for(const run of [(r:Response)=>{r.emit('data',Buffer.alloc(CALENDAR_MAX_BYTES+1));r.emit('end');},(r:Response)=>{r.complete=false;r.emit('data',Buffer.from(feed()));r.emit('end');},(r:Response)=>{r.emit('data',Buffer.from('<html>private failure</html>'));r.emit('end');},(r:Response)=>r.emit('aborted')]){
   responseMock(run);await expect(fetchAirbnbCalendar(url)).rejects.toThrow('manual review');
  }
 });
 it('enforces total DNS and response deadlines rather than waiting forever',async()=>{
  vi.useFakeTimers();mockLookup.mockImplementation(()=>new Promise(()=>{}));
  const dnsFailure=expect(fetchAirbnbCalendar(url)).rejects.toThrow('manual review');await vi.advanceTimersByTimeAsync(10_001);await dnsFailure;
  mockLookup.mockResolvedValue([{address:'1.1.1.1',family:4}]);const req=responseMock(()=>{});
  const streamFailure=expect(fetchAirbnbCalendar(url)).rejects.toThrow('manual review');await vi.advanceTimersByTimeAsync(10_001);await streamFailure;expect(req.destroy).toHaveBeenCalled();
 });
});
