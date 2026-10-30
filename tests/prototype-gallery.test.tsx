import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import PhotoGallery, { nextPhotoIndex } from '../src/components/PhotoGallery';
import { getProperty } from '../src/lib/property';
const photos = getProperty('casa-pacifica')!.photos;
it('renders the actual living-room carousel and accessible album/video controls without invented facts', () => {
  const html = renderToStaticMarkup(<PhotoGallery photos={photos} propertyName="Casa Pacifica" />);
  expect(html).toContain('Open all photo albums');
  expect(html).toContain('Previous home photo');
  expect(html).toContain('Next home photo');
  expect(html).toContain('Video tour');
  expect(html).toContain('View all 12 photos');
  expect(html).toContain(photos[0].alt);
  expect(html).not.toContain('15 guests');
  expect(html).not.toContain('<video');
  expect(html).not.toContain('role="dialog"');
});
it('wraps repeated forward/back navigation safely and handles no photographs', () => {
  expect(nextPhotoIndex(11,1,12)).toBe(0);
  expect(nextPhotoIndex(0,-1,12)).toBe(11);
  expect(nextPhotoIndex(4,25,12)).toBe(5);
  expect(nextPhotoIndex(0,-1,0)).toBe(0);
  expect(renderToStaticMarkup(<PhotoGallery photos={[]} propertyName="Empty" />)).toBe('');
  const one = renderToStaticMarkup(<PhotoGallery photos={photos.slice(0,1)} propertyName="One" />);
  expect(one).not.toContain('Next home photo');
});
it('retains focus/scroll cleanup and honest non-playable video content', () => {
  const source = readFileSync('src/components/PhotoGallery.tsx', 'utf8');
  expect(source).toContain('if (opener?.isConnected) opener.focus()');
  expect(source).toContain('document.body.style.overflow = overflow');
  expect(source).toContain('event.key === "Escape"');
  expect(source).toContain('event.key === "Tab"');
  expect(source).toContain('The home’s video tour is not available yet');
  expect(source).not.toContain('localStorage');
  expect(source).not.toContain('fetch(');
});
