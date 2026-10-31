import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import PhotoGallery, { nextPhotoIndex, photoDotWindow, createHeroGesture } from '../src/components/PhotoGallery';
import { getProperty } from '../src/lib/property';
const photos = getProperty('casa-pacifica')!.photos;
it('renders the actual living-room carousel and accessible album/video controls without invented facts', () => {
  const html = renderToStaticMarkup(<PhotoGallery photos={photos} propertyName="Casa Pacifica" />);
  expect(html).toContain('Open all photo albums');
  expect(html).not.toContain('Previous home photo');
  expect(html).not.toContain('Next home photo');
  expect(html).toContain('pan-y pinch-zoom');
  expect(html).toContain('Swipe left or right');
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

it('shows exactly five bare dots that move across all twelve photographs', () => {
  expect(photoDotWindow(0,12)).toEqual([0,1,2,3,4]);
  expect(photoDotWindow(6,12)).toEqual([4,5,6,7,8]);
  expect(photoDotWindow(11,12)).toEqual([7,8,9,10,11]);
  for (let i=0; i<12; i++) { expect(photoDotWindow(i,12)).toHaveLength(5); expect(photoDotWindow(i,12)).toContain(i); }
  const html = renderToStaticMarkup(<PhotoGallery photos={photos} propertyName="Casa Pacifica" />);
  const dots = html.match(/data-photo-dots="[^"]*"[^>]*>(.*?)<\/div>/)?.[1] ?? '';
  expect((dots.match(/<span/g) ?? [])).toHaveLength(5);
  expect(html).not.toContain('bg-black/15');
  expect(html).not.toContain('bg-ink/85');
  expect(html).toContain('class="sr-only" aria-live="polite"');
  expect(html).toContain('sr-only focus:not-sr-only focus:min-h-11');
});
it('distinguishes taps, swipes, vertical scrolling and cancelled or stale gestures', () => {
  const g = createHeroGesture();
  g.start(1,100,100); expect(g.end(1,102,102)).toBe(0); expect(g.allowClick(1)).toBe(true);
  g.start(2,100,100); g.move(2,40,105); expect(g.end(2,40,105)).toBe(1); expect(g.allowClick(1)).toBe(false);
  g.cancel(2); expect(g.allowClick(1)).toBe(false); // lost capture after pointerup cannot revive tap
  expect(g.allowClick(0)).toBe(true); // keyboard activation remains available
  g.start(3,100,100); expect(g.end(3,105,200)).toBe(0); expect(g.allowClick(1)).toBe(false);
  g.start(4,100,100); g.move(4,150,100); g.move(4,100,100); expect(g.end(4,100,100)).toBe(0); expect(g.allowClick(1)).toBe(false);
  g.start(5,0,0); g.cancel(5); expect(g.end(5,100,0)).toBe(0); expect(g.allowClick(1)).toBe(false);
  g.start(6,0,0); g.cancel(5); expect(g.end(5,100,0)).toBe(0); expect(g.end(6,0,0)).toBe(0); expect(g.allowClick(1)).toBe(true);
  g.start(7,0,0); expect(g.end(7,60,5)).toBe(-1);
});
it('supports backdrop dismissal and consistent Back labels without changing photo detail navigation', () => {
  const source = readFileSync('src/components/PhotoGallery.tsx', 'utf8');
  expect(source).toContain('event.target === event.currentTarget');
  expect(source).toContain('onPointerCancel='); expect(source).toContain('onLostPointerCapture=');
  expect(source).toContain('Previous photo'); expect(source).toContain('Next photo');
  expect(source).not.toContain('Back to the stay');
});
