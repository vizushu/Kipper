import {afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:state.token})})}));
import {createStagingSession,STAGING_COOKIE} from '../src/lib/staging-session';
import {getBookingByReference} from '../src/data/api';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('forwards staging session only to pinned staging origin alongside booking bearer, without redirect following',async()=>{
 vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('STAGING_ORIGIN','https://stage.example');vi.stubEnv('STAGING_ACCESS_PASSWORD','p'.repeat(43));vi.stubEnv('STAGING_SESSION_SECRET','s'.repeat(43));vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://production.example');state.token=await createStagingSession();
 const fetcher=vi.fn().mockResolvedValue(Response.json({booking:{id:'synthetic'}}));vi.stubGlobal('fetch',fetcher);
 expect(await getBookingByReference('REF','booking-capability')).toEqual({id:'synthetic'});const [url,options]=fetcher.mock.calls[0];expect(url).toBe('https://stage.example/api/bookings/ref/REF');expect(options.redirect).toBe('error');expect(options.headers.get('authorization')).toBe('Bearer booking-capability');expect(options.headers.get('cookie')).toBe(`${STAGING_COOKIE}=${state.token}`);
 state.token='invalid';expect(await getBookingByReference('REF','booking-capability')).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
});
