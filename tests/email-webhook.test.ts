import {createHmac} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {POST} from '../src/app/api/webhooks/resend/route';
import {boundedBody,emailProviderEvent,verifyEmailWebhookSignature,EMAIL_WEBHOOK_MAX_BYTES} from '../src/lib/email-webhook';
const mock=vi.hoisted(()=>({adapter:vi.fn(),record:vi.fn()}));
vi.mock('@/lib/db',()=>({getAdapter:mock.adapter}));
const now=Date.UTC(2026,10,1,1,0,0),secret='whsec_'+Buffer.alloc(32,7).toString('base64');
const providerId='11111111-1111-4111-8111-111111111111';
const event={type:'email.delivered',created_at:new Date(now).toISOString(),data:{email_id:providerId,to:['private@example.test'],subject:'private fixture',html:'secret body'}};
function signed(body=JSON.stringify(event),id='msg_fixture',timestamp=Math.floor(now/1000),key=secret){const text=String(timestamp);const signature=createHmac('sha256',Buffer.from(key.slice(6),'base64')).update(`${id}.${text}.${body}`).digest('base64');return new Request('https://example.test/api/webhooks/resend',{method:'POST',headers:{'svix-id':id,'svix-timestamp':text,'svix-signature':`v1,${signature}`},body});}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('EMAIL_WEBHOOK_APPROVED','true');vi.stubEnv('RESEND_WEBHOOK_SECRET',secret);vi.resetAllMocks();mock.adapter.mockReturnValue({recordEmailProviderEvent:mock.record});mock.record.mockResolvedValue('recorded');});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.restoreAllMocks();});
it('matches the official Svix published manual-verification test vector',()=>{
 const body=Buffer.from('{"event_type":"ping","data":{"success":true}}');
 const headers=new Headers({'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='});
 expect(verifyEmailWebhookSignature(body,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000)).toBe('msg_loFOjxBNrRLzqYUf');
});
it('preview overrides contradictory webhook approval before body or DB access',async()=>{vi.stubEnv('SITE_PREVIEW_MODE','true');const request=signed();const body=vi.spyOn(request,'body','get');expect((await POST(request)).status).toBe(404);expect(body).not.toHaveBeenCalled();expect(mock.adapter).not.toHaveBeenCalled();});
it.each(['','false'])('missing exact approval blocks webhook',async value=>{vi.stubEnv('EMAIL_WEBHOOK_APPROVED',value);expect((await POST(signed())).status).toBe(404);expect(mock.adapter).not.toHaveBeenCalled();});
it('missing/malformed signing secret fails closed',async()=>{vi.stubEnv('RESEND_WEBHOOK_SECRET','whsec_not-a-valid-secret');expect((await POST(signed())).status).toBe(404);expect(mock.adapter).not.toHaveBeenCalled();});
it('records only safe event metadata, never body/recipient/subject',async()=>{
 expect((await POST(signed())).status).toBe(200);const stored=mock.record.mock.calls[0][0];
 expect(stored).toMatchObject({eventId:'msg_fixture',providerMessageId:providerId,type:'delivered'});expect(stored.payloadHash).toMatch(/^[a-f0-9]{64}$/);
 expect(JSON.stringify(stored)).not.toMatch(/private|secret body|subject|recipient/);
});
it('same signed event replay is acknowledged but delegated to atomic dedupe',async()=>{mock.record.mockResolvedValueOnce('recorded').mockResolvedValueOnce('duplicate');expect((await POST(signed())).status).toBe(200);expect((await POST(signed())).status).toBe(200);expect(mock.record.mock.calls[0][0]).toEqual(mock.record.mock.calls[1][0]);});
it('unknown provider ID and database errors are retryable, never falsely acknowledged',async()=>{mock.record.mockResolvedValueOnce('unknown').mockRejectedValueOnce(new Error('private provider/body leak'));for(let i=0;i<2;i++){const response=await POST(signed());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private');}});
it('conflicting replay ID fails closed',async()=>{mock.record.mockResolvedValue('conflict');expect((await POST(signed())).status).toBe(409);});
it.each([-301,301])('rejects stale/future signed attempt timestamp %s',async offset=>{expect((await POST(signed(undefined,undefined,now/1000+offset))).status).toBe(400);expect(mock.adapter).not.toHaveBeenCalled();});
it('rejects altered raw bytes even if JSON has same meaning',async()=>{const source=signed();const body=JSON.stringify(event)+' ';expect((await POST(new Request(source.url,{method:'POST',headers:source.headers,body}))).status).toBe(400);expect(mock.adapter).not.toHaveBeenCalled();});
it('supports multiple v1 signatures without accepting unknown-only versions',async()=>{const request=signed();request.headers.set('svix-signature','v2,invalid '+request.headers.get('svix-signature'));expect((await POST(request)).status).toBe(200);const invalid=signed();invalid.headers.set('svix-signature',invalid.headers.get('svix-signature')!.replace('v1,','v2,'));expect((await POST(invalid)).status).toBe(400);});
it('rejects missing headers and oversized signatures before DB access',async()=>{const request=signed();request.headers.delete('svix-id');expect((await POST(request)).status).toBe(400);const oversized=signed();oversized.headers.set('svix-signature','x'.repeat(1025));expect((await POST(oversized)).status).toBe(400);expect(mock.adapter).not.toHaveBeenCalled();});
it('bounds raw bodies even without content-length',async()=>{const request=signed('x'.repeat(EMAIL_WEBHOOK_MAX_BYTES+1));expect((await POST(request)).status).toBe(413);expect(mock.adapter).not.toHaveBeenCalled();await expect(boundedBody(new Response('ok',{headers:{'content-length':'90000'}}),4096)).rejects.toThrow('Invalid email webhook');});
it('ignores signed unsupported types without storage or side effects',async()=>{expect((await POST(signed(JSON.stringify({...event,type:'email.opened'})))).status).toBe(200);expect(mock.adapter).not.toHaveBeenCalled();});
it.each([{...event,data:{email_id:'not-a-provider-id'}},{...event,created_at:'bad-date'},{...event,created_at:new Date(now+301000).toISOString()}])('rejects signed malformed event data',async value=>{expect((await POST(signed(JSON.stringify(value)))).status).toBe(400);expect(mock.adapter).not.toHaveBeenCalled();});
it('normalizes supported event timestamps and strips unknown payload fields',()=>{expect(emailProviderEvent(Buffer.from(JSON.stringify(event)),'msg_fixture',now)).toEqual(expect.objectContaining({occurredAt:new Date(now).toISOString()}));});
it('bounds stalled body reads without persisting partial content',async()=>{
 const request=new Request('https://example.test/api/webhooks/resend',{method:'POST',body:new ReadableStream({pull:()=>new Promise(()=>{})}),duplex:'half'} as RequestInit);
 const pending=boundedBody(request,1024);const rejection=expect(pending).rejects.toMatchObject({status:408});
 await vi.advanceTimersByTimeAsync(10001);await rejection;expect(mock.adapter).not.toHaveBeenCalled();
});
