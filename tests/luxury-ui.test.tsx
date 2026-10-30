import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AmenityHighlights, { selectAmenityHighlights } from '../src/components/AmenityHighlights';
import PhotoGallery from '../src/components/PhotoGallery';
import PropertyExperience from '../src/components/PropertyExperience';
import { getProperty } from '../src/lib/property';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const property = getProperty('casa-pacifica')!;
afterEach(() => vi.useRealTimers());
it('curates actual interior assets and keeps annotated parking out of the hero', () => {
  expect(property.photos.slice(0, 3).map(p => p.src)).toEqual(['/photos/casa-pacifica-02.jpg', '/photos/casa-pacifica-06.jpg', '/photos/casa-pacifica-03.jpg']);
  expect(property.photos.at(-1)?.room).toBe('Guest parking');
  expect(property.photos.some(p => p.src.endsWith('-01.jpg'))).toBe(false);
  expect(property.photos.find(p => p.src.endsWith('-08.jpg'))?.room).toBe('Hallway');
});
it('shows six exact verified amenities with every original detail in a native closed disclosure', () => {
  const highlights = selectAmenityHighlights(property.amenities);
  expect(highlights).toHaveLength(6);
  for (const item of highlights) expect(property.amenities.flatMap(g => g.items)).toContain(item);
  const html = renderToStaticMarkup(<AmenityHighlights groups={property.amenities} />);
  expect(html).toContain('Show all amenities');
  expect(html).toContain('<details');
  expect(html).not.toMatch(/<details[^>]* open/);
  for (const group of property.amenities) expect(html).toContain(group.category.replaceAll('&', '&amp;'));
  expect(selectAmenityHighlights([{ category: 'Other', items: ['Verified item'] }])).toEqual(['Verified item']);
  expect(selectAmenityHighlights([])).toEqual([]);
});
it('renders the prototype carousel with photo albums and visible count', () => {
  const html = renderToStaticMarkup(<PhotoGallery photos={property.photos} propertyName={property.name} />);
  expect(html).toContain('aria-label="Open all photo albums"');
  expect(html).toContain('aria-label="Next home photo"');
  expect(html).toContain('View all 12 photos');
  expect(html).toContain('1 / 12');
  expect(html).not.toContain('opacity-0');
  expect(renderToStaticMarkup(<PhotoGallery photos={[]} propertyName="Empty" />)).toBe('');
});
it('discloses upstairs separation, inclusive occupancy and transition ahead of the space description', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  const html = renderToStaticMarkup(<PropertyExperience property={property} publicPreview />);
  expect(html.indexOf('Before you book')).toBeLessThan(html.indexOf('The space'));
  expect(html).toContain('separate private residence');
  expect(html).toContain('Maximum 8 people on the property, including infants and daytime visitors.');
  expect(html).toContain('March 1, 2027');
  expect(html).not.toContain(property.address);
});
it('does not carry current access or occupancy disclosures into the unapproved expansion', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T12:00:00Z'));
  const html = renderToStaticMarkup(<PropertyExperience property={property} publicPreview />);
  expect(html).not.toContain('separate private residence');
  expect(html).not.toContain('Maximum 8 people');
  expect(html).not.toContain('Show all amenities');
  expect(html).not.toContain('View all 12 photos');
});
