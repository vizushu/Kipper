import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import AmenityHighlights, { selectAmenityHighlights } from '../src/components/AmenityHighlights';
import { getProperty } from '../src/lib/property';

it('opens amenities in an initially closed native dialog, not an inline disclosure', () => {
  const html = renderToStaticMarkup(<AmenityHighlights groups={getProperty('casa-pacifica')!.amenities}/>);
  expect(html).toContain('<dialog');
  expect(html).not.toMatch(/<details|<summary|<dialog[^>]* open/);
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain('The good kind of staying in.');
  expect(html).toContain('aria-label="Close amenities"');
  expect(html).not.toContain('Back');
  expect(html).toContain('grid-cols-2');
  expect(html).toContain('href="/contact"');
});

it('keeps full authoritative amenities and generic Wi-Fi without importing prototype promises', () => {
  const groups = [{category: 'Verified category', items: ['Wifi', 'Verified synthetic amenity', 'Full kitchen']}];
  const html = renderToStaticMarkup(<AmenityHighlights groups={groups}/>);
  expect(html).toContain('Verified category');
  expect(html).toContain('Verified synthetic amenity');
  expect(html).toContain('Wi-Fi');
  expect(html).not.toMatch(/Wi-Fi 7|5 GHz|Sauna|Garage|instant|live chat/);
  expect(selectAmenityHighlights(groups)).toEqual(['Full kitchen', 'Wifi', 'Verified synthetic amenity']);
  expect(renderToStaticMarkup(<AmenityHighlights groups={[]}/>)).toContain('awaiting confirmation');
});

it('preserves native focus trapping, Escape close, outside dismissal and opener restoration', () => {
  const source = readFileSync('src/components/AmenityHighlights.tsx', 'utf8');
  expect(source).toContain('showModal()');
  expect(source).toContain('onClose={() => setOpen(false)}');
  expect(source).toContain('event.target !== event.currentTarget');
  expect(source).toContain('getBoundingClientRect()');
  expect(source).toContain('document.body.style.overflow = overflow');
  expect(source).toContain('opener?.isConnected');
  expect(source).toContain('opener.focus()');
  expect(source).not.toContain('onCancel='); // browser Escape semantics remain intact
});
