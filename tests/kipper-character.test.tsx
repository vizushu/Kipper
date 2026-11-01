import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import AskKipperWelcome from '../src/components/AskKipperWelcome';
import KipperCharacter from '../src/components/KipperCharacter';

it('offers a clear question and direct human help without pretending to be connected chat', () => {
  const html = renderToStaticMarkup(<AskKipperWelcome/>);
  expect(html).toContain('What would you like to know about your stay?');
  expect(html).toContain('Your AI concierge is in development');
  expect(html).toContain('mailto:vizushu@gmail.com');
  expect(html).toContain('Explore stay answers');
  expect(html).toContain('aria-labelledby="kipper-welcome-title"');
  expect(html).toContain('Back to stay help');
  expect(html).not.toMatch(/<input|<textarea|<audio|<form|Listening|Checking your request/);
});
it('has a decorative original-image fallback before loading WebGL', () => {
  const html = renderToStaticMarkup(<KipperCharacter/>);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('original-mascot.png');
  expect(html).toContain('alt=""');
  expect(html).not.toContain('<canvas');
});
it('uses the real Notion neutral GLB with three meshes, no external resources and no animation rig claim', () => {
  const data = readFileSync('public/kipper/neutral-concept.glb');
  expect(data.toString('ascii', 0, 4)).toBe('glTF');
  const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
  expect(json.meshes).toHaveLength(3);
  expect(json.nodes.map((node: {name: string}) => node.name)).toEqual(['KipBody', 'Eye1', 'Eye2']);
  expect(json.buffers.every((buffer: {uri?: string}) => !buffer.uri)).toBe(true);
  expect(json.animations).toBeUndefined();
});
it('keeps render code lazy, bounded, hidden-tab-aware and disposable', () => {
  const component = readFileSync('src/components/KipperCharacter.tsx','utf8');
  const renderer = readFileSync('src/lib/kipper-renderer.ts','utf8');
  expect(component).toContain('import("@/lib/kipper-renderer")');
  expect(component).toContain('prefers-reduced-motion: reduce');
  expect(renderer).toContain('/ 1670');
  expect(renderer).toContain('document.hidden');
  expect(renderer).toContain('renderer.dispose()');
  expect(renderer).toContain('webglcontextlost');
  expect(renderer).not.toMatch(/setInterval|Audio|microphone|api\/|https:\/\//);
});
