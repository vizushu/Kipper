import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PropertyExperience from '../src/components/PropertyExperience';
import { getProperty } from '../src/lib/property';
import type { Property } from '../src/lib/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../src/components/PhotoGallery', () => ({ default: ({ propertyName }: { propertyName: string }) => <div>Gallery for {propertyName}</div> }));

afterEach(() => { vi.useRealTimers(); });
function fixture(): Property {
  return structuredClone(getProperty('casa-pacifica')!);
}

describe('date-aware property template', () => {
  it('renders current approved accommodation, without public address or unsupported marketing claims', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
    const property = fixture();
    const html = renderToStaticMarkup(<PropertyExperience property={property} />);
    expect(html).toContain('3 bedrooms');
    expect(html).toContain('8 guests');
    expect(html).toContain('March 1, 2027');
    expect(html).toContain('STR-13982L');
    expect(html).toContain('A quote does not reserve dates.');
    expect(html).not.toContain(property.address);
    expect(html).not.toMatch(/best rate|free cancellation|383 stays/i);
    expect(html).not.toContain('$349');
  });
  it('does not inherit the old photos, capacity, bed map or amenities for the future configuration', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const property = fixture();
    const html = renderToStaticMarkup(<PropertyExperience property={property} />);
    expect(html).toContain('5 bedrooms');
    expect(html).not.toContain('8 guests');
    expect(html).not.toContain('Gallery for');
    expect(html).not.toContain('Sleeping arrangements');
    expect(html).not.toContain('King bed');
    expect(html).toContain('disabled');
  });
  it('renders a second property solely from its record, without Casa-specific claims', () => {
    const property = fixture();
    Object.assign(property, { name: 'Harbor House', city: 'Portland', neighborhood: 'Old Port', state: 'ME', license: undefined, hostName: 'Harbor Hosts', configurations: undefined, bedrooms: 2, beds: 2, bathrooms: 1, maxGuests: 4, highlights: [], amenities: [], bedLayout: [], description: 'A quiet harbor apartment.', guestAccess: 'Private apartment entrance.', houseRules: ['No smoking.'], faqs: [], safetyDevices: [] });
    const html = renderToStaticMarkup(<PropertyExperience property={property} />);
    expect(html).toContain('Harbor House');
    expect(html).toContain('Harbor Hosts');
    expect(html).toContain('4 guests');
    expect(html).toContain('2 bedrooms');
    expect(html).not.toContain('Casa Pacifica');
    expect(html).not.toContain('STR-13982L');
    expect(html).not.toContain('March 1, 2027');
  });
});
