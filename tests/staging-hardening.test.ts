import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {stagingStripeBody} from '../src/lib/staging-webhook';
import {POST} from '../src/app/api/webhooks/stripe/route';
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
const request=(body:BodyInit,headers?:HeadersInit)=>new Request('https://stage.example/api/webhooks/stripe',{method:'POST',body,headers,duplex:'half'} as RequestInit);
it('preserves exact valid body bytes and bounds declared/streamed sizes',async()=>{
 const raw='{"signed":"exact raw payload"}\n';expect(await stagingStripeBody(request(raw))).toBe(raw);
 await expect(stagingStripeBody(request('',{'content-length':'65537'}))).rejects.toMatchObject({httpStatus:413});
 await expect(stagingStripeBody(request('x'.repeat(65537)))).rejects.toMatchObject({httpStatus:413});
 await expect(stagingStripeBody(request(new Uint8Array([255])))).rejects.toMatchObject({httpStatus:400});
});
it('cancels a stalled anonymous stream after five seconds',async()=>{
 vi.useFakeTimers();const cancel=vi.fn();const pending=stagingStripeBody(request(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel})));const assertion=expect(pending).rejects.toMatchObject({httpStatus:408});await vi.advanceTimersByTimeAsync(5000);await assertion;expect(cancel).toHaveBeenCalled();
});
it('route applies staging limits before signature verification and preview still wins',async()=>{
 vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('SITE_PREVIEW_MODE','false');expect((await POST(request('x'.repeat(65537)))).status).toBe(413);
 vi.stubEnv('SITE_PREVIEW_MODE','true');expect((await POST(request('x'.repeat(65537)))).status).toBe(503);
});
it('both server entry points supply staging mode and maps are not mounted in staging',()=>{
 for(const file of ['src/app/page.tsx','src/app/properties/[slug]/page.tsx'])expect(readFileSync(file,'utf8')).toContain('stagingTest={isStagingTest()}');
 const component=readFileSync('src/components/PropertyExperience.tsx','utf8');expect(component).toContain('stagingTest?<p');expect(component).toContain('External maps are disabled on this synthetic test site.');expect(component).toContain(':<NeighborhoodMap/>');expect(component).not.toContain('process.env.STAGING');
});
