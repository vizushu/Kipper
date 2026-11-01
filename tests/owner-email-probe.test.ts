import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {createHmac} from 'node:crypto';
import {ownerProbeConfig,ownerProbeAuthorized,OWNER_PROBE_ENVELOPE,sendOwnerProbe} from '../src/lib/owner-email-probe';
import {OwnerEmailProbeStore} from '../src/lib/db/sqlite-owner-email-probe';
import {GET,POST} from '../src/app/api/owner-email-probe/route';
import {POST as webhook} from '../src/app/api/webhooks/resend-owner-probe/route';
const now=Date.parse('2026-11-01T06:00:00.000Z'),id='11111111-1111-4111-8111-111111111111',providerId='22222222-2222-4222-8222-222222222222',secret='p'.repeat(64),webhookSecret='whsec_'+Buffer.alloc(32,3).toString('base64');
let dir:string,store:OwnerEmailProbeStore;
const request=(body='{}',key=secret)=>new Request('https://example.test/api/owner-email-probe',{method:'POST',headers:{authorization:`Bearer ${key}`},body});
function config(){return ownerProbeConfig(now)!;}
beforeEach(()=>{
 vi.spyOn(Date,'now').mockReturnValue(now);dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-probe-test-'));const file=path.join(dir,'test.db');new Database(file).close();
 for(const [k,v] of Object.entries({SQLITE_PATH:file,DATA_ADAPTER:'sqlite',STAGING_TEST_MODE:'false',SITE_PREVIEW_MODE:'true',OWNER_EMAIL_PROBE_APPROVED:'true',OWNER_EMAIL_PROBE_ID:id,OWNER_EMAIL_PROBE_SECRET:secret,OWNER_EMAIL_PROBE_ISSUED_AT:new Date(now-1000).toISOString(),OWNER_EMAIL_PROBE_EXPIRES_AT:new Date(now+3600000-1000).toISOString(),RESEND_API_KEY:'synthetic-provider-key',OWNER_EMAIL_PROBE_WEBHOOK_APPROVED:'true',RESEND_OWNER_PROBE_WEBHOOK_SECRET:webhookSecret}))vi.stubEnv(k,v);
 store=new OwnerEmailProbeStore();
});
afterEach(()=>{store?.close();vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();fs.rmSync(dir,{recursive:true,force:true});});
describe('one-shot owner email probe',()=>{
 it('requires explicit preview-only SQLite purpose and valid short-lived authorization',()=>{
  expect(config()).not.toBeNull();
  for(const [key,value] of [['STAGING_TEST_MODE','true'],['SITE_PREVIEW_MODE','false'],['OWNER_EMAIL_PROBE_APPROVED','false'],['DATA_ADAPTER','supabase'],['OWNER_EMAIL_PROBE_SECRET','short'],['OWNER_EMAIL_PROBE_ID','-'.repeat(36)],['OWNER_EMAIL_PROBE_EXPIRES_AT',new Date(now+7200000).toISOString()],['OWNER_EMAIL_PROBE_ISSUED_AT',new Date(now+1000).toISOString()]]){const old=process.env[key];vi.stubEnv(key,value);expect(ownerProbeConfig(now)).toBeNull();vi.stubEnv(key,old);}
 });
 it('rejects cross-purpose keys and bad bearer without secret reflection',()=>{
  expect(ownerProbeAuthorized(request(),config())).toBe(true);expect(ownerProbeAuthorized(request('{}','wrong'),config())).toBe(false);
  for(const key of ['ADMIN_SECRET','CALENDAR_WORKER_SECRET','OPERATIONS_WORKER_SECRET','OPERATOR_ALERT_WORKER_SECRET','RESEND_API_KEY','RESEND_OWNER_PROBE_WEBHOOK_SECRET']){const old=process.env[key];vi.stubEnv(key,secret);expect(ownerProbeConfig(now)).toBeNull();vi.stubEnv(key,old);}
 });
 it('atomically claims once across two connections and blocks concurrent different authorization',()=>{
  const second=new OwnerEmailProbeStore();try{expect(store.claim(config(),now).kind).toBe('claimed');expect(second.claim(config(),now).kind).toBe('busy');expect(second.claim({...config(),id:'33333333-3333-4333-8333-333333333333'},now).kind).toBe('busy');}finally{second.close();}
 });
 it('retries uncertain acceptance only with stable key, original window and three-attempt global budget',()=>{
  const c=config();const keys:string[]=[];
  for(let n=0;n<3;n++){const claim=store.claim(c,now+n*30001);expect(claim.kind).toBe('claimed');if(claim.kind==='claimed'){keys.push(claim.idempotencyKey);store.uncertain(c,claim.lease,now+n*30001);}}
  expect(new Set(keys).size).toBe(1);expect(store.claim(c,now+90003).kind).toBe('blocked');expect(store.claim({...c,id:'33333333-3333-4333-8333-333333333333'},now+90003).kind).toBe('blocked');expect(store.claim(c,c.expiresAt).kind).toBe('blocked');
 });
 it('freezes authorization configuration and never resends accepted messages',()=>{
  const c=config(),claim=store.claim(c,now);if(claim.kind!=='claimed')throw new Error('claim');
  expect(store.claim({...c,fingerprint:'changed'},now+30001).kind).toBe('blocked');expect(store.accepted(c,'wrong',providerId,now)).toBe(false);expect(store.accepted(c,claim.lease,providerId,now)).toBe(true);expect(store.claim(c,now+30001).kind).toBe('accepted');expect(store.status(c)).toEqual({id,state:'accepted'});
 });
 it('stale acknowledgement cannot overwrite a newer lease',()=>{const c=config(),a=store.claim(c,now),b=store.claim(c,now+30001);if(a.kind!=='claimed'||b.kind!=='claimed')throw new Error('claim');expect(store.accepted(c,a.lease,providerId,now+30002)).toBe(false);expect(store.accepted(c,b.lease,providerId,now+30002)).toBe(true);});
 it('stores only known probe delivery evidence with replay conflict and monotonic adverse state',()=>{
  const c=config();const event={eventId:'evt_synthetic',providerMessageId:providerId,type:'delivered' as const,occurredAt:new Date(now).toISOString(),receivedAt:new Date(now).toISOString(),payloadHash:'a'.repeat(64)};
  expect(store.event(c,event)).toBe('unknown');const claim=store.claim(c,now);if(claim.kind!=='claimed')throw new Error('claim');store.accepted(c,claim.lease,providerId,now);
  expect(store.event(c,event)).toBe('recorded');expect(store.event(c,event)).toBe('duplicate');expect(store.event(c,{...event,payloadHash:'b'.repeat(64)})).toBe('conflict');
  expect(store.event(c,{...event,eventId:'evt_bounced',type:'bounced'})).toBe('recorded');store.event(c,{...event,eventId:'evt_later'});expect(store.status(c).state).toBe('bounced');
  const db=new Database(process.env.SQLITE_PATH!);expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual(expect.arrayContaining([{name:'owner_email_probes'},{name:'owner_email_probe_events'}]));expect(db.prepare("SELECT name FROM sqlite_master WHERE name IN ('bookings','delivery_outbox')").all()).toEqual([]);db.close();
 });
 it('allows authenticated opaque status for seven days but not another send after expiry',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(now+7200000);expect((await GET(new Request('https://example.test',{headers:{authorization:`Bearer ${secret}`}}))).status).toBe(200);expect((await POST(request())).status).toBe(404);expect(ownerProbeConfig(now+8*86400000,true)).toBeNull();
 });
 it('rejects unauthorized, staging, arbitrary payload and oversize before transport',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect((await POST(request('{}','wrong'))).status).toBe(404);expect((await POST(request('{"to":"other@example.test"}'))).status).toBe(400);expect((await POST(request('x'.repeat(129)))).status).toBe(400);vi.stubEnv('STAGING_TEST_MODE','true');expect((await POST(request())).status).toBe(404);expect(fetcher).not.toHaveBeenCalled();
 });
 it('does not consume an authorization before signed evidence configuration is ready',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);vi.stubEnv('OWNER_EMAIL_PROBE_WEBHOOK_APPROVED','false');expect((await POST(request())).status).toBe(503);expect(store.status(config()).state).toBe('not-started');vi.stubEnv('OWNER_EMAIL_PROBE_WEBHOOK_APPROVED','true');vi.stubEnv('RESEND_OWNER_PROBE_WEBHOOK_SECRET','whsec_YQ==');expect((await POST(request())).status).toBe(503);vi.stubEnv('RESEND_OWNER_PROBE_WEBHOOK_SECRET',webhookSecret);vi.stubEnv('RESEND_WEBHOOK_SECRET',webhookSecret);expect((await POST(request())).status).toBe(503);expect(fetcher).not.toHaveBeenCalled();});
 it('sends fixed owner content once and reports acceptance rather than delivery',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:providerId}),{status:200}));vi.stubGlobal('fetch',fetcher);
  const result=await POST(request());expect(await result.json()).toEqual({id,state:'accepted'});expect((await POST(request())).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
  const [url,options]=fetcher.mock.calls[0];expect(url).toBe('https://api.resend.com/emails');expect(options.redirect).toBe('error');expect(JSON.parse(options.body)).toEqual({from:OWNER_PROBE_ENVELOPE.from,to:[OWNER_PROBE_ENVELOPE.to],reply_to:OWNER_PROBE_ENVELOPE.replyTo,subject:OWNER_PROBE_ENVELOPE.subject,text:OWNER_PROBE_ENVELOPE.text});
 });
 it('redacts provider failures and preserves uncertain state',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('private provider response')));const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain('private');expect(store.status(config()).state).toBe('uncertain');
 });
 it('bounds provider response and validates provider ID',async()=>{await expect(sendOwnerProbe(`owner-probe:${id}`,config()?.fingerprint??'invalid',vi.fn().mockResolvedValue(new Response('x'.repeat(4097))))).rejects.toThrow();await expect(sendOwnerProbe(`owner-probe:${id}`,config()?.fingerprint??'invalid',vi.fn().mockResolvedValue(new Response('{"id":"bad"}')))).rejects.toThrow();});
 it('verifies dedicated signed webhook and rejects unknown IDs without adopting them',async()=>{
  const raw=JSON.stringify({type:'email.delivered',created_at:new Date(now).toISOString(),data:{email_id:providerId}}),timestamp=String(now/1000),eventId='evt_signed_probe';
  const signature=createHmac('sha256',Buffer.alloc(32,3)).update(`${eventId}.${timestamp}.${raw}`).digest('base64');
  const req=()=>new Request('https://example.test/api/webhooks/resend-owner-probe',{method:'POST',headers:{'svix-id':eventId,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`},body:raw});
  expect((await webhook(req())).status).toBe(503);const c=config(),claim=store.claim(c,now);if(claim.kind!=='claimed')throw new Error('claim');store.accepted(c,claim.lease,providerId,now);expect((await webhook(req())).status).toBe(200);expect(store.status(c).state).toBe('delivered');vi.stubEnv('STAGING_TEST_MODE','true');expect((await webhook(req())).status).toBe(404);
 });
 it('survives process-style reopen with the same idempotency and accepted evidence',()=>{const c=config(),first=store.claim(c,now);if(first.kind!=='claimed')throw new Error('claim');store.close();store=new OwnerEmailProbeStore();const retry=store.claim(c,now+30001);if(retry.kind!=='claimed')throw new Error('claim');expect(retry.idempotencyKey).toBe(first.idempotencyKey);store.accepted(c,retry.lease,providerId,now+30002);store.close();store=new OwnerEmailProbeStore();expect(store.status(c).state).toBe('accepted');expect(store.claim(c,now+60002).kind).toBe('accepted');});
 it('transport refuses provider configuration changed after durable claim',async()=>{const c=config(),fetcher=vi.fn();store.claim(c,now);vi.stubEnv('RESEND_API_KEY','different-synthetic-key');await expect(sendOwnerProbe(`owner-probe:${id}`,c.fingerprint,fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();});
 it('transport independently rejects poisoned staging and disabled preview approval',async()=>{const fetcher=vi.fn();vi.stubEnv('STAGING_TEST_MODE','true');await expect(sendOwnerProbe(`owner-probe:${id}`,config()?.fingerprint??'invalid',fetcher)).rejects.toThrow();vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('OWNER_EMAIL_PROBE_APPROVED','false');await expect(sendOwnerProbe(`owner-probe:${id}`,config()?.fingerprint??'invalid',fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();});
 it('keeps conservative daily attempt budget through original authorization expiry',()=>{const c=config();for(let n=0;n<3;n++)store.claim(c,now+n*30001);const later=now+24*3600000+1000;const next={...c,id:'33333333-3333-4333-8333-333333333333',issuedAt:later,expiresAt:later+3600000};expect(store.claim(next,later).kind).toBe('blocked');});
 it('requires existing regular database file',()=>{expect(()=>new OwnerEmailProbeStore(path.join(dir,'missing.db'))).toThrow();const link=path.join(dir,'link.db');fs.symlinkSync(process.env.SQLITE_PATH!,link);expect(()=>new OwnerEmailProbeStore(link)).toThrow();const nested=path.join(dir,'nested');fs.mkdirSync(nested);new Database(path.join(nested,'db')).close();const alias=path.join(dir,'alias');fs.symlinkSync(nested,alias);expect(()=>new OwnerEmailProbeStore(path.join(alias,'db'))).toThrow();});
});
