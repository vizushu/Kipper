import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import PropertyExperience from '../src/components/PropertyExperience';
import PoliciesDialog from '../src/components/PoliciesDialog';
import NeighborhoodMap,{neighborhoodRasterTiles,MIRA_MESA_MAP_LINK} from '../src/components/NeighborhoodMap';
import Header from '../src/components/Header';
import {getProperty} from '../src/lib/property';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>'/'}));
afterEach(()=>vi.useRealTimers());
it('presents current icon facts and a quiet expansion indicator without removed notices or access emphasis',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
 const p=getProperty('casa-pacifica')!;const html=renderToStaticMarkup(<PropertyExperience property={p} publicPreview/>);
 expect(html).toContain('8 guests');expect(html).toContain('3 bedrooms');expect(html).toContain('2 baths');expect(html).toContain('5 bedrooms available in 03/27');
 expect(html).not.toMatch(/Current accommodation:|Future configuration —|15 guests|upstairs|downstairs|shared indoor|shared space/i);
 expect(p.guestAccess).toContain('downstairs'); // underlying accepted source is not rewritten
 expect(p.maxGuests).toBe(8);expect(p.configurations?.at(-1)?.checkoutApproved).toBe(false);
});
it('uses an actual modal for policies with current limits and a direct Ask Kipper route',()=>{
 const html=renderToStaticMarkup(<PoliciesDialog property={getProperty('casa-pacifica')!}/>);
 expect(html).toContain('<dialog');expect(html).not.toContain('<details');expect(html).toContain('Maximum 8 guests');
 for(const section of ['House rules','Pool &amp; safety','Cancellation','Questions before booking?'])expect(html).toContain(section);
 expect(html).toContain('href="/contact"');expect(html).not.toContain('15 guests');
 const source=readFileSync('src/components/PoliciesDialog.tsx','utf8');expect(source).toContain('showModal()');expect(source).toContain('getBoundingClientRect');expect(source).toContain('opener.focus()');
});
it('maps only broad neighborhood geography with no marker or property inputs',()=>{
 const html=renderToStaticMarkup(<NeighborhoodMap/>);const p=getProperty('casa-pacifica')!;
 expect(html).not.toContain('<iframe');expect(html).toContain('© OpenStreetMap contributors');expect(html).toContain('not the property location');
 for(const value of [p.address,String(p.latitude),String(p.longitude),'marker='])expect(html).not.toContain(value);
 expect(neighborhoodRasterTiles()).toHaveLength(9);expect(MIRA_MESA_MAP_LINK).not.toContain('marker');
 expect(html).toContain('referrerPolicy="no-referrer"');
});
it('keeps Back labels consistent and adds the Ask Kipper diagonal arrow',()=>{
 expect(renderToStaticMarkup(<Header/>)).toContain('M6 18 18 6M6 6h12v12');
 for(const path of ['src/app/contact/page.tsx','src/components/RoomCards.tsx','src/components/BookingWidget.tsx']){
  const source=readFileSync(path,'utf8');expect(source).toContain('← Back');expect(source).not.toMatch(/Back to the home|Close room details/);
 }
});
