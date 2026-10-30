import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {bookingSessionCookie} from '../src/lib/booking-session';
afterEach(()=>vi.unstubAllEnvs());
it('uses scoped HttpOnly secure production cookie, not URL access tokens',()=>{vi.stubEnv('NODE_ENV','production');expect(bookingSessionCookie('synthetic-token')).toMatchObject({httpOnly:true,secure:true,sameSite:'strict',path:'/booking/',maxAge:86400});expect(readFileSync('src/app/checkout/CheckoutClient.tsx','utf8')).not.toContain('?token=');expect(readFileSync('src/app/booking/[reference]/page.tsx','utf8')).not.toContain('searchParams');});
