import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSessionCookie, isAdminRequest, ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS } from '../src/lib/admin-auth';
import { requireAdmin } from '../src/app/api/_helpers';
import { POST as login } from '../src/app/api/admin/login/route';
import { POST as logout } from '../src/app/api/admin/logout/route';
import { GET as sessionStatus } from '../src/app/api/admin/session/route';
const db = vi.hoisted(() => ({ createAdminSession: vi.fn(), getAdminSession: vi.fn(), revokeAdminSession: vi.fn(), consumeRateLimit: vi.fn() }));
vi.mock('../src/lib/db', () => ({ getAdapter: () => db }));
let stored: any;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
beforeEach(() => {
  vi.clearAllMocks(); stored=undefined;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T18:00:00Z'));
  vi.stubEnv('ADMIN_SECRET', 'synthetic-secret-only'); vi.stubEnv('SITE_PREVIEW_MODE','false');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://example.test');
  db.createAdminSession.mockImplementation(async row=>{stored={...row};});
  db.getAdminSession.mockImplementation(async key=>stored?.tokenHash===key?stored:null);
  db.revokeAdminSession.mockImplementation(async key=>{if(stored?.tokenHash!==key)return false;stored.revokedAt??=new Date().toISOString();return true;});
  db.consumeRateLimit.mockResolvedValue({allowed:true,retryAfterSeconds:0});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
function request(token?:string, method='GET', extra:Record<string,string>={}) {
 return new NextRequest('https://example.test/api/admin/session',{method,headers:{...(token?{cookie:`${ADMIN_COOKIE_NAME}=${token}`}:{}),...extra}});
}
describe('server-enforced admin sessions',()=>{
 it('stores only random token hashes with absolute 8h expiry',async()=>{
  const one=(await adminSessionCookie())!; const first={...stored};
  const two=(await adminSessionCookie())!;
  expect(one.value).toMatch(/^[a-f0-9]{64}$/); expect(two.value).not.toBe(one.value);
  expect(first.tokenHash).toBe(hash(one.value)); expect(JSON.stringify(first)).not.toContain(one.value);
  expect(Date.parse(first.expiresAt)-Date.parse(first.createdAt)).toBe(ADMIN_SESSION_TTL_SECONDS*1000);
  expect(await isAdminRequest(request(two.value))).toBe(true);
 });
 it('rejects old deterministic cookies, unknown tokens, and expires at exact server cutoff',async()=>{
  expect(await isAdminRequest(request(hash('cp-admin-session:v1:synthetic-secret-only')))).toBe(false);
  const c=(await adminSessionCookie())!;
  vi.advanceTimersByTime(ADMIN_SESSION_TTL_SECONDS*1000-1); expect(await isAdminRequest(request(c.value))).toBe(true);
  vi.advanceTimersByTime(1); expect(await isAdminRequest(request(c.value))).toBe(false);
 });
 it('revokes on logout, clears cookie and rejects captured-cookie replay',async()=>{
  const c=(await adminSessionCookie())!;
  expect((await logout(request(c.value,'POST',{origin:'https://example.test'}))).headers.get('set-cookie')).toContain('Max-Age=0');
  expect(stored.revokedAt).toBeTruthy(); expect(await isAdminRequest(request(c.value))).toBe(false);
  expect((await logout(request(c.value,'POST',{origin:'https://example.test'}))).status).toBe(200);
 });
 it('invalidates existing sessions on secret rotation',async()=>{
  const c=(await adminSessionCookie())!;vi.stubEnv('ADMIN_SECRET','rotated-synthetic-secret');
  expect(await isAdminRequest(request(c.value))).toBe(false);
 });
 it('fails closed on lookup error and preview before touching storage',async()=>{
  const c=(await adminSessionCookie())!;db.getAdminSession.mockRejectedValue(new Error('synthetic failure'));
  expect(await isAdminRequest(request(c.value))).toBe(false);
  vi.stubEnv('SITE_PREVIEW_MODE','true');vi.clearAllMocks();
  expect(await adminSessionCookie()).toBe(null);expect(await isAdminRequest(request(c.value,'GET',{'x-admin-secret':'synthetic-secret-only'}))).toBe(false);
  expect(db.getAdminSession).not.toHaveBeenCalled();expect(db.createAdminSession).not.toHaveBeenCalled();
 });
 it.each(['POST','PATCH','PUT','DELETE'])('requires same-origin for cookie %s, even with a bogus machine header',async method=>{
  const c=(await adminSessionCookie())!;
  expect((await requireAdmin(request(c.value,method,{origin:'https://evil.example','x-admin-secret':'bogus'})))?.status).toBe(403);
  expect((await requireAdmin(request(c.value,method)))?.status).toBe(403);
  expect(await requireAdmin(request(c.value,method,{origin:'https://example.test'}))).toBe(null);
 });
 it('permits explicitly authenticated machine requests but rejects incorrect secret',async()=>{
  expect(await requireAdmin(request(undefined,'POST',{'x-admin-secret':'synthetic-secret-only'}))).toBe(null);
  expect((await requireAdmin(request(undefined,'POST',{'x-admin-secret':'wrong'})))?.status).toBe(401);
 });
 it('does not trust forwarded host or malformed origin',async()=>{
  const c=(await adminSessionCookie())!;
  for(const origin of ['null','https://evil.example','https://example.test/path']){
   expect((await requireAdmin(request(c.value,'POST',{origin,'x-forwarded-host':'evil.example'})))?.status).toBe(403);
  }
 });
 it('session endpoint reflects revocation and never caches status',async()=>{
  const c=(await adminSessionCookie())!;
  const ok=await sessionStatus(request(c.value));expect(ok.status).toBe(200);expect(ok.headers.get('cache-control')).toContain('no-store');
  stored.revokedAt=new Date().toISOString();expect((await sessionStatus(request(c.value))).status).toBe(401);
 });
});
describe('login and logout boundaries',()=>{
 function loginRequest(secret='synthetic-secret-only',origin='https://example.test'){return new Request('https://example.test/api/admin/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({secret})});}
 it('issues random HttpOnly session and verifies secret without storing it',async()=>{
  const response=await login(loginRequest());expect(response.status).toBe(200);
  const cookie=response.headers.get('set-cookie')!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=lax');expect(cookie).toContain('Max-Age=28800');
  expect(JSON.stringify(stored)).not.toContain('synthetic-secret-only');
 });
 it('rejects cross-origin login before consuming storage and wrong secret without session',async()=>{
  expect((await login(loginRequest('synthetic-secret-only','https://evil.example'))).status).toBe(403);
  expect(db.consumeRateLimit).not.toHaveBeenCalled();
  expect((await login(loginRequest('bad'))).status).toBe(401);expect(db.createAdminSession).not.toHaveBeenCalled();
 });
 it('limits login before secret verification with a bounded persistent bucket',async()=>{
  db.consumeRateLimit.mockResolvedValue({allowed:false,retryAfterSeconds:900});
  const response=await login(loginRequest());expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('900');expect(db.createAdminSession).not.toHaveBeenCalled();
  expect(db.consumeRateLimit.mock.calls[0]).toEqual([hash('admin-login:global:v1'),20,900]);
 });
 it('fails closed on storage errors and refuses preview login/logout',async()=>{
  db.consumeRateLimit.mockRejectedValue(new Error('synthetic failure'));expect((await login(loginRequest())).status).toBe(503);
  vi.stubEnv('SITE_PREVIEW_MODE','true');expect((await login(loginRequest())).status).toBe(401);
  expect((await logout(request(undefined,'POST',{origin:'https://example.test'}))).status).toBe(401);
 });
 it('does not clear cookie if server revocation fails',async()=>{
  const c=(await adminSessionCookie())!;db.revokeAdminSession.mockRejectedValue(new Error('synthetic failure'));
  const res=await logout(request(c.value,'POST',{origin:'https://example.test'}));expect(res.status).toBe(503);expect(res.headers.get('set-cookie')).toBe(null);
 });
});

describe('every existing mutation route inherits the origin boundary',()=>{
 it('rejects cross-origin cookie writes before route work, including a bogus machine header',async()=>{
  const c=(await adminSessionCookie())!;
  const handlers = [
   (await import('../src/app/api/admin/settings/route')).PUT,
   (await import('../src/app/api/admin/rates/route')).POST,
   (await import('../src/app/api/admin/blocks/route')).POST,
   (await import('../src/app/api/admin/emails/resend/route')).POST,
   (await import('../src/app/api/admin/outbox/route')).POST,
   (await import('../src/app/api/admin/maintenance/route')).POST,
   (await import('../src/app/api/admin/payment-exceptions/route')).POST,
  ];
  for(const handler of handlers){
   const response=await handler(request(c.value,'POST',{origin:'https://evil.example','x-admin-secret':'invalid'}));
   expect(response.status).toBe(403);
  }
  const remove=(await import('../src/app/api/admin/blocks/[id]/route')).DELETE;
  expect((await remove(request(c.value,'DELETE',{origin:'https://evil.example'}),{params:Promise.resolve({id:'synthetic'})})).status).toBe(403);
 });
});
