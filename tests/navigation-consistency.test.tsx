import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {BackButton,BackLink} from '../src/components/BackControl';
import {IconArrowLeft,IconArrowRight,IconArrowUpRight,IconShare,IconChevronDown} from '../src/components/icons';
import NeighborhoodMap from '../src/components/NeighborhoodMap';
vi.mock('next/navigation',()=>({usePathname:()=>'/'}));
it('uses one thin full-arrow Back style for links and buttons, with no duplicate close',()=>{
 const button=renderToStaticMarkup(<BackButton onClick={()=>{}}/>);
 const link=renderToStaticMarkup(<BackLink href="/properties"/>);
 for(const html of [button,link]){expect(html).toContain('M30 8H2m7-4L2 8l7 4');expect(html).toContain('stroke-width="1.15"');expect(html).toContain('viewBox="0 0 32 16"');expect(html).toContain('aria-hidden="true"');expect(html).toContain('width:1.5em;height:.75em');expect(html).toContain('>Back');expect(html).toContain('min-h-11');}
 expect(link).toContain('href="/properties"');expect(button).toContain('type="button"');
 for(const path of ['components/PhotoGallery','components/ShareStay','components/RoomCards','components/BookingWidget','app/contact/page','app/properties/[slug]/page','app/booking/[reference]/page']){
  const source=readFileSync('src/'+path+'.tsx','utf8');expect(source).toContain('BackControl');expect(source).not.toMatch(/← Back|IconChevronLeft|Close gallery|Close booking panel/);
 }
});
it('keeps album, individual-photo and video titles on one scale and preserves hierarchical focus',()=>{
 const source=readFileSync('src/components/PhotoGallery.tsx','utf8');
 expect(source.match(/className="casa-page-heading/g)).toHaveLength(3);
 expect(source).toContain('<Header onNavigate={close}/>');
 expect(source).toContain('returnToAlbum.current = true; setView("albums")');
 expect(source).toContain('data-album-index={index}');
 expect(source).toContain('a[href]');expect(source).toContain('opener.focus()');
 expect(source).not.toMatch(/IconX|Close gallery|text-4xl|sm:text-5xl/);
 const css=readFileSync('src/app/globals.css','utf8');expect(css).not.toContain('font: inherit;');expect(css).not.toContain('.casa-editorial h2 {');
});
it('uses the same thin navigation icon family, including calendar arrows',()=>{
 for(const Icon of [IconArrowLeft,IconArrowRight,IconArrowUpRight,IconShare,IconChevronDown]){const html=renderToStaticMarkup(<Icon/>);expect(html).toContain('stroke-width="1.15"');expect(html).toContain('viewBox="0 0 24 24"');}
 const source=readFileSync('src/components/AvailabilityCalendar.tsx','utf8');expect(source).toContain('IconArrowLeft');expect(source).not.toContain('IconChevron');
});
it('brands the broad neighborhood circle without changing geography or implying a property pin',()=>{
 const html=renderToStaticMarkup(<NeighborhoodMap/>);
 expect(html).toContain('src="/icons/casa-pacifica.svg"');expect(html).toContain('not the property location');expect(html).toContain('OpenStreetMap contributors');
 expect(html).not.toMatch(/Mira Mesa<br|10840|marker=|geolocation/);
 const source=readFileSync('src/components/NeighborhoodMap.tsx','utf8');expect(source).toContain('h-7 w-7 items-center justify-center rounded bg-white');
});

it('shares the normal page-title scale across public routes without changing checkout state logic',()=>{
 for(const route of ['contact/page','checkout/page','checkout/CheckoutClient','booking-access/page','properties/page','policies/PolicyShell','booking/[reference]/page','faq/page']){
  expect(readFileSync('src/app/'+route+'.tsx','utf8')).toContain('<h1 className="casa-page-heading">');
 }
});

it('keeps the main amenities heading on the editorial scale after dialog CSS isolation',()=>{
 expect(readFileSync('src/components/PropertyExperience.tsx','utf8')).toContain('<h2 className="casa-page-heading mb-6">The good kind of staying in.</h2>');
});

it("keeps diagonal and share arrows long and narrow without changing their controls",()=>{
 expect(renderToStaticMarkup(<IconArrowUpRight/>)).toContain("M3 21 21 3M13 4l8-1-1 8");
 expect(renderToStaticMarkup(<IconShare/>)).toContain("M12 17V1m-4 7 4-7 4 7");
 expect(readFileSync("src/components/ShareStay.tsx","utf8")).toContain("<IconShare");
 for(const name of ["Header","Footer","PoliciesDialog","AmenityHighlights","NeighborhoodMap"]) expect(readFileSync(`src/components/${name}.tsx`,"utf8")).toContain("IconArrowUpRight");
});


it('scales navigation glyphs to type without shrinking interactive targets',()=>{
 for(const Icon of [IconArrowLeft,IconArrowRight,IconArrowUpRight,IconShare,IconChevronDown]) {
  const html=renderToStaticMarkup(<Icon className="h-5 w-5"/>);
  expect(html).toContain('width:1em;height:1em;flex-shrink:0');
  expect(html).toContain('stroke-width="1.15"');
 }
 const back=readFileSync('src/components/BackControl.tsx','utf8');
 expect(back).toContain('width: "1.5em", height: ".75em"');
 expect(back).toContain('min-h-11');
 expect(back).toContain('viewBox="0 0 32 16"');
 const share=readFileSync('src/components/ShareStay.tsx','utf8');
 const map=readFileSync('src/components/NeighborhoodMap.tsx','utf8');
 const calendar=readFileSync('src/components/AvailabilityCalendar.tsx','utf8');
 for(const source of [share,map,calendar])expect(source).toContain('h-11 w-11');
 expect(share).toContain('rounded-full');
 expect(map).toContain('h-7 w-7');
});
