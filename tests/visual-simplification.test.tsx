import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import Header from '../src/components/Header';
import PropertyExperience from '../src/components/PropertyExperience';
import PhotoGallery from '../src/components/PhotoGallery';
import {getProperty} from '../src/lib/property';
import {resolveStayConfiguration} from '../src/lib/accommodation';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>'/'}));
afterEach(()=>vi.useRealTimers());
it('removes menu and intro review clutter, and places exact screenshot sections after future-labelled facts',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
 const header=renderToStaticMarkup(<Header/>);expect(header).not.toContain('Open menu');expect(header).toContain('Ask Kipper');
 const html=renderToStaticMarkup(<PropertyExperience property={getProperty('casa-pacifica')!} publicPreview/>);
 expect(html).toContain('Experience authentic San Diego beach culture. the comfort of feeling at home.');
 expect(html).not.toContain('No verified reviews yet');
 expect(html).toContain('5 bedrooms · 3 baths available in 03/27');expect(html).not.toContain('15 guests');
 expect(html).toContain('8 guests');expect(html).toContain('3 bedrooms');expect(html).toContain('2 baths');expect(html).not.toContain('Current accommodation:');
 expect(html.indexOf('3 bedrooms')).toBeLessThan(html.indexOf('At home in San Diego'));
 expect(html.indexOf('The good kind of staying in.')).toBeLessThan(html.indexOf('A space for everyone.'));
 expect(html).toContain('About these highlights');expect(html).toContain('Read all policies');expect(html).toContain('Selected Airbnb reviews supplied by the host');
 expect(html).not.toMatch(/Wi-Fi 7|5 GHz|Warm and welcoming staff/);
});
it('does not change current headcount or future booking authority',()=>{
 const p=getProperty('casa-pacifica')!;expect(p.maxGuests).toBe(8);expect(p.maxTotalOccupancy).toBe(8);
 expect(resolveStayConfiguration(p,'2027-03-01','2027-03-03').status).toBe('pending_approval');
 expect(resolveStayConfiguration(p,'2027-02-28','2027-03-02').status).toBe('manual_review');
});
it('makes hero chrome transparent while retaining touch targets and accessible controls',()=>{
 const html=renderToStaticMarkup(<PhotoGallery propertyName="Casa Pacifica" photos={getProperty('casa-pacifica')!.photos}/>);
 expect(html).toContain('bg-black/25');expect(html).toContain('bg-transparent');expect(html).toContain('h-11 w-11');
 expect(html).toContain('Share this stay');expect(html).not.toContain('Next home photo');expect(html).toContain('data-photo-dots');
});
