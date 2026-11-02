import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const sql=vi.hoisted(()=>({allowed:true,attempts:0}));
vi.mock('better-sqlite3',()=>({default:class {exec(){} close(){} prepare(){return {get:()=>sql.allowed?undefined:{started:Date.now(),attempts:20},run:()=>{sql.attempts++;}};} transaction(fn:()=>boolean){return {immediate:fn};}}}));
import {stagingLogin} from '../src/lib/staging-login';
import {validStagingSession,STAGING_COOKIE} from '../src/lib/staging-session';
const origin='https://private-test.example';
beforeEach(()=>{sql.allowed=true;sql.attempts=0;vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('STAGING_ACCESS_PASSWORD','p'.repeat(43));vi.stubEnv('STAGING_SESSION_SECRET','s'.repeat(43));vi.stubEnv('STAGING_ORIGIN',origin);});
afterEach(()=>vi.unstubAllEnvs());
function request(password='p'.repeat(43),headers:Record<string,string>={}){return new Request(origin+'/api/staging/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams({password})});}
it('creates secure host-only short-lived session with constant destination',async()=>{const result=await stagingLogin(request());expect(result.status).toBe(303);expect(result.headers.get('location')).toBe(origin+'/');const cookie=result.cookies.get(STAGING_COOKIE);expect(await validStagingSession(cookie?.value)).toBe(true);const raw=result.headers.get('set-cookie')!;for(const field of ['Secure','HttpOnly','SameSite=strict','Path=/','Max-Age=1800'])expect(raw).toContain(field);expect(raw).not.toContain('Domain=');});
it('rejects invalid password without echoing it',async()=>{const result=await stagingLogin(request('wrong-sensitive'));expect(result.status).toBe(401);expect(await result.text()).not.toContain('wrong-sensitive');});
it('enforces origin before password processing; no forwarded origin trust',async()=>{expect((await stagingLogin(request(undefined,{origin:'https://evil.example','x-forwarded-host':'private-test.example'}))).status).toBe(403);expect(sql.attempts).toBe(0);});
it('persisted global bucket denies without trusting changing client IP',async()=>{sql.allowed=false;expect((await stagingLogin(request(undefined,{'x-forwarded-for':'1.2.3.4'}))).status).toBe(429);});
it('bounds request payload',async()=>{expect((await stagingLogin(request('x'.repeat(2048)))).status).toBe(413);});
it('logout is same-origin and expires the cookie',async()=>{const result=await stagingLogin(request(),true);expect(result.status).toBe(303);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect((await stagingLogin(request(undefined,{origin:'https://evil.example'}),true)).status).toBe(403);});
it('off is404 and missing configuration503',async()=>{vi.stubEnv('STAGING_TEST_MODE','false');expect((await stagingLogin(request())).status).toBe(404);vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('STAGING_SESSION_SECRET','');expect((await stagingLogin(request())).status).toBe(503);});
