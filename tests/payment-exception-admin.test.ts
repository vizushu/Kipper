import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {NextRequest} from 'next/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {SqliteAdapter} from '../src/lib/db/sqlite';
import {adminSessionCookie} from '../src/lib/admin-auth';
import {GET,POST} from '../src/app/api/admin/payment-exceptions/route';
vi.mock('../src/lib/db',()=>({getAdapter:()=>adapter}));
let adapter:SqliteAdapter;let directory:string;
beforeEach(()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'casa-review-'));adapter=new SqliteAdapter(path.join(directory,'synthetic.sqlite'));vi.stubEnv('ADMIN_SECRET','synthetic-admin');vi.stubEnv('SITE_PREVIEW_MODE','false');});
afterEach(()=>{adapter.close();fs.rmSync(directory,{recursive:true,force:true});vi.unstubAllEnvs();});
function req(body?:unknown,authorized=true){return new NextRequest('https://example.test/api/admin/payment-exceptions',{method:body?'POST':'GET',headers:authorized?{'x-admin-secret':'synthetic-admin'}:{},...(body?{body:JSON.stringify(body)}:{})});}
async function seed(){return (await adapter.recordPaymentException({paymentIntentId:'pi_synthetic',providerEventId:'evt_synthetic',paymentMode:'test',amountCents:1000,amountReceivedCents:1000,currency:'usd',reason:'unmatched_payment'})).exception;}
it('requires admin and preview overrides valid credentials for reads and writes',async()=>{expect((await GET(req(undefined,false))).status).toBe(401);vi.stubEnv('SITE_PREVIEW_MODE','true');expect((await GET(req())).status).toBe(401);expect((await POST(req({}))).status).toBe(401);});
it('lists private no-store cases and records an idempotent review without financial actions',async()=>{const entry=await seed();const response=await GET(req());expect(response.headers.get('cache-control')).toContain('no-store');expect((await response.json()).cases).toHaveLength(1);const body={id:entry.id,note:'Synthetic operator reconciliation reviewed.',idempotencyKey:'synthetic-review-key'};expect((await POST(req(body))).status).toBe(200);const replay=await POST(req(body));expect(await replay.json()).toMatchObject({financialActionPerformed:false,case:{status:'reviewed',attentionRequired:false}});expect((await POST(req({...body,note:'Different synthetic reconciliation note.'}))).status).toBe(409);expect(await adapter.listBookings()).toHaveLength(0);expect(await adapter.listOutbox()).toHaveLength(0);});
it('rejects malformed review notes and never closes the case',async()=>{const entry=await seed();expect((await POST(req({id:entry.id,note:'ok',idempotencyKey:'synthetic-review-key'}))).status).toBe(400);expect((await adapter.listPaymentExceptions())[0].status).toBe('open');});

it('rejects cross-origin cookie review mutations',async()=>{const entry=await seed();const cookie=(await adminSessionCookie())!;const request=new NextRequest('https://example.test/api/admin/payment-exceptions',{method:'POST',headers:{cookie:`${cookie.name}=${cookie.value}`,origin:'https://other.example.test'},body:JSON.stringify({id:entry.id,note:'Synthetic review attempt.',idempotencyKey:'synthetic-cross-origin'})});expect((await POST(request)).status).toBe(403);expect((await adapter.listPaymentExceptions())[0].status).toBe('open');});
