import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import Terms from '../src/app/policies/terms/page';
import Privacy from '../src/app/policies/privacy/page';
import About from '../src/app/about/page';
import Guide from '../src/components/StayHelpGuide';
import Cancellation from '../src/app/policies/cancellation/page';
import {readFileSync} from 'node:fs';
const mode=vi.hoisted(()=>({value:null as 'live'|'test'|null}));
vi.mock('../src/lib/payment-mode',()=>({getBookingPaymentMode:()=>mode.value}));
afterEach(()=>{mode.value=null;});
it('live copy identifies operator/providers and does not claim checkout or automated access is unavailable/connected incorrectly',()=>{
 mode.value='live';const terms=renderToStaticMarkup(<Terms/>),privacy=renderToStaticMarkup(<Privacy/>),about=renderToStaticMarkup(<About/>),guide=renderToStaticMarkup(<Guide/>);
 for(const text of [terms,privacy,about]){expect(text).toContain('Renier De La Cruz');expect(text).toContain('vizushu@gmail.com');expect(text).toContain('Stripe');expect(text).not.toMatch(/draft stay|test-only preview|No reservations or payments are accepted|Final contracting|controller.*must be identified/);}
 expect(terms).toContain('Automated Yale code provisioning is not connected');expect(terms).toContain('complete stay total');expect(terms).toContain('no separate payment-method surcharge');expect(privacy).toContain('Resend');expect(privacy).toContain('Render');expect(privacy).not.toContain('anonymized analytics');expect(guide).not.toContain('Online reservations and payments are not open yet');expect(guide).toContain('$462.47');expect(about).toContain('Direct booking');expect(terms).not.toContain('under Renier');expect(privacy).not.toContain('under Renier');expect(renderToStaticMarkup(<Cancellation/>)).not.toContain('Online booking is not open yet');
});
it.each([null,'test'] as const)('closed/test mode %s never claims new live paid bookings',value=>{
 mode.value=value;expect(renderToStaticMarkup(<Terms/>)).toContain('New paid bookings are closed');expect(renderToStaticMarkup(<Privacy/>)).toContain('New payments are closed');expect(renderToStaticMarkup(<About/>)).toContain('New reservations and payments are not open');expect(renderToStaticMarkup(<Guide/>)).toContain('Online reservations and payments are not open yet');
});

it("runtime-dependent policy/about pages opt out of static build caching",()=>{for(const name of ["policies/terms","policies/privacy","policies/cancellation","about"]){expect(readFileSync(`src/app/${name}/page.tsx`,"utf8")).toContain("export const dynamic = 'force-dynamic'");}});
