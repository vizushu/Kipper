import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import robots from '../src/app/robots';
import RootLayout, { generateMetadata } from '../src/app/layout';
import ContactPage from '../src/app/contact/page';
import CheckoutPage from '../src/app/checkout/page';

vi.mock('../src/components/Header', () => ({ default: () => null }));
vi.mock('../src/components/Footer', () => ({ default: () => null }));
vi.mock('../src/components/PwaConnection', () => ({ default: () => null }));
vi.mock('../src/app/contact/ContactForm', () => ({ default: () => <form data-testid="contact-form" /> }));
vi.mock('../src/app/checkout/CheckoutClient', () => ({ default: () => <form data-testid="checkout-form" /> }));
afterEach(() => { vi.unstubAllEnvs(); });

describe('public preview presentation', () => {
  it('discourages all indexing and shows a persistent explicit preview banner', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'true');
    expect(generateMetadata().robots).toMatchObject({ index: false, follow: false, noarchive: true });
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
    const html = renderToStaticMarkup(<RootLayout><p>Public listing</p></RootLayout>);
    expect(html).toContain('Preview — bookings and payments are disabled');
    expect(html).toContain('fixed inset-x-0 top-0');
  });
  it('never renders contact or guest/payment forms in public preview, even with local test mode enabled', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'true'); vi.stubEnv('BOOKING_TEST_MODE', 'true');
    const contact = renderToStaticMarkup(<ContactPage />);
    const checkout = renderToStaticMarkup(<CheckoutPage />);
    expect(contact).not.toContain('<form');
    expect(contact).not.toContain('We read every message');
    expect(checkout).not.toContain('<form');
    expect(checkout).toContain('Checkout is disabled');
  });
  it('does not impose the preview banner or whole-site crawl denial on a nonpreview deployment', () => {
    vi.stubEnv('SITE_PREVIEW_MODE', 'false');
    expect(generateMetadata().robots).toBeUndefined();
    expect(robots().rules).toMatchObject({ allow: '/' });
    expect(renderToStaticMarkup(<ContactPage />)).toContain('contact-form');
    expect(renderToStaticMarkup(<CheckoutPage />)).toContain('checkout-form');
  });
});
