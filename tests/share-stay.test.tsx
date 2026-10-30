import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import ShareStay, { publicStayShareUrl } from '../src/components/ShareStay';
it('shares only the origin and allowlisted public pathname, never query or hash', () => {
  expect(publicStayShareUrl('https://example.com?token=secret', '/properties/casa-pacifica?email=private#access-token')).toBe('https://example.com/properties/casa-pacifica');
  expect(publicStayShareUrl('https://example.com', '/?booking=secret')).toBe('https://example.com/');
  for (const path of ['/booking/private', '/admin', '/checkout', '//evil.example/x', '/properties/../booking/private', '/properties/a%2fb']) expect(publicStayShareUrl('https://example.com',path)).toBeNull();
  expect(publicStayShareUrl('javascript:alert(1)', '/')).toBeNull();
  expect(publicStayShareUrl('https://user:password@example.com', '/')).toBeNull();
});
it('does not share/copy automatically and renders an explicit trigger without private data', () => {
  const html = renderToStaticMarkup(<ShareStay propertyName="Casa Pacifica" />);
  expect(html).toContain('Share this stay');
  expect(html).not.toContain('role="dialog"');
  const source = readFileSync('src/components/ShareStay.tsx','utf8');
  expect(source).toContain('onClick={share}');
  expect(source).toContain('onClick={copy}');
  expect(source).toContain('window.location.pathname');
  expect(source).not.toContain('window.location.href');
  expect(source).not.toContain('fetch(');
});
