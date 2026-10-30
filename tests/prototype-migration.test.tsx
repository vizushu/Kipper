import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import HomePage from '../src/app/page';
import PropertyExperience from '../src/components/PropertyExperience';
import StickyBookBar from '../src/components/StickyBookBar';
import { getProperty } from '../src/lib/property';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => { throw Error('not found'); } }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
it('root is the actual date-aware property controller, with no demo prices or private address', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z')); vi.stubEnv('SITE_PREVIEW_MODE','true');
  const html = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({ checkIn:'2027-02-20',checkOut:'2027-02-22',adults:'2',children:'0',infants:'1' }) }));
  expect(html).toContain('value="2027-02-20"'); expect(html).toContain('3 guests, including 1 infant');
  expect(html).toContain('8 guests'); expect(html).toContain('2 baths');
  expect(html).toContain('Open all photo albums'); expect(html).toContain('The ease of a San Diego getaway');
  expect(html).not.toContain(getProperty('casa-pacifica')!.address);
  expect(html).not.toMatch(/\$449|\$1,215|15 guests|3 full bathrooms|CP-DEMO|Alex Rivera/);
});
it('keeps future and crossing configurations blocked in the new presentation', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  for (const range of [{checkIn:'2027-03-01',checkOut:'2027-03-03'},{checkIn:'2027-02-28',checkOut:'2027-03-02'}]) {
    const html=renderToStaticMarkup(<PropertyExperience property={getProperty('casa-pacifica')!} publicPreview initialSelection={{range,guests:{adults:2,children:0,infants:0}}}/>);
    expect(html).not.toContain('Open all photo albums'); expect(html).not.toContain('Check availability &amp; price'); expect(html).toContain('Reservations and payments are disabled');
  }
});
it('has one persistent action at all widths and a single stateful booking panel', () => {
  const html=renderToStaticMarkup(<StickyBookBar label="Add dates" detail="Choose your stay" onOpen={()=>{}}/>);
  expect(html.match(/data-booking-open/g)).toHaveLength(1); expect(html).not.toContain('lg:hidden');
  const source=readFileSync('src/components/BookingWidget.tsx','utf8');
  expect(source).toContain('hidden={!expanded}'); expect(source).toContain('max-w-[527px]');
  expect(source).toContain('document.body.style.overflow = overflow'); expect(source).toContain('previous?.isConnected');
  expect(source).not.toContain('lg:hidden');
});
