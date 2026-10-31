import {describe,it,expect,vi} from 'vitest';
import {runCalendarSync} from '../scripts/sync-calendar.mjs';
const secret='s'.repeat(43);
describe('calendar cron runner',()=>{
 it('only sends sync with bearer to fixed HTTPS endpoint, never approval',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({status:'updated',conflictCount:0,blockCount:8})));
  expect(await runCalendarSync({secret,fetcher})).toEqual({ok:true,status:'updated'});
  expect(fetcher).toHaveBeenCalledTimes(1);const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('https://innkipper.com/api/calendar/sync');expect(options.redirect).toBe('error');
  expect(options.body).toBe('{"action":"sync"}');expect(options.headers).toEqual({authorization:`Bearer ${secret}`,'content-type':'application/json'});
 });
 it('missing credential never calls network',async()=>{const fetcher=vi.fn();expect((await runCalendarSync({fetcher})).status).toBe('configuration-error');expect(fetcher).not.toHaveBeenCalled();});
 it.each(['failed','busy','review-required','not-configured','disabled'])('fails honestly for %s without retry',async status=>{const fetcher=vi.fn(async()=>new Response(JSON.stringify({status,conflictCount:0})));expect((await runCalendarSync({secret,fetcher})).ok).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);});
 it('conflicts are not scheduler success',async()=>{expect((await runCalendarSync({secret,fetcher:async()=>new Response('{"status":"updated","conflictCount":1}')})).ok).toBe(false);});
 it('never returns raw exception, response body or secrets',async()=>{for(const fetcher of [async()=>{throw new Error(secret)},async()=>new Response(secret,{status:500}),async()=>new Response(secret),async()=>new Response('x'.repeat(4097))]){const r=await runCalendarSync({secret,fetcher});expect(r.ok).toBe(false);expect(JSON.stringify(r)).not.toContain(secret);}});
});
