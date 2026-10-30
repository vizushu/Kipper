import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import BookingProgress from '../src/app/checkout/BookingProgress';
import CheckoutPage from '../src/app/checkout/page';
import BookingAccessPage from '../src/app/booking-access/page';
import ContactPage from '../src/app/contact/page';

beforeEach(() => { vi.stubGlobal('React', React); vi.stubEnv('SITE_PREVIEW_MODE', 'true'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('renders one current real checkout step without clickable simulated steps', () => {
  for (const current of ['review', 'payment', 'confirmation'] as const) {
    const html = renderToStaticMarkup(<BookingProgress current={current} />);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('Booking progress');
    expect(html).not.toMatch(/<button|<a /);
  }
});
it('keeps the narrow checkout preview free of payment and guest controls', () => {
  const html = renderToStaticMarkup(<CheckoutPage />);
  expect(html).toContain('max-w-[590px]');
  expect(html).toContain('Checkout is disabled in this preview');
  expect(html).not.toMatch(/<input|<form|<iframe/);
});
it('keeps recovery private and disabled under the prototype visual shell', () => {
  const html = renderToStaticMarkup(<BookingAccessPage />);
  expect(html).toContain('max-w-[590px]');
  expect(html).toContain('No booking details or recovery codes are collected');
  expect(html).not.toMatch(/<input|<form/);
});
it('renders contact options without a pretend concierge conversation', () => {
  const html = renderToStaticMarkup(<ContactPage />);
  expect(html).toContain('Let’s talk about your stay.');
  expect(html).toContain('Ask dot is not answering questions yet');
  expect(html).not.toMatch(/<textarea|<input|<form/);
});
it('maps checkout progression to details state while keeping authoritative price and provider form', () => {
  const source = readFileSync('src/app/checkout/CheckoutClient.tsx', 'utf8');
  expect(source).toContain('<BookingProgress current={detailsConfirmed ? "payment" : "review"} />');
  expect(source).toContain('<PriceBreakdown quote={quote}');
  expect(source).toContain('onConfirmPayment={handleConfirmPayment}');
  expect(source.indexOf('aria-label="Price summary"')).toBeLessThan(source.indexOf('{/* Guest details */}'));
  expect(source).not.toContain('lg:grid-cols-[1fr_400px]');
});
