import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PriceBreakdown from '../src/components/PriceBreakdown';
import type {Quote} from '../src/lib/types';
it('leads with selected-stay total including mandatory cleaning/tax, without a new processing fee',()=>{
 const quote={totalCents:87945,expiresAt:'2026-10-31T18:00:00Z',lineItems:[{label:'Synthetic accommodation',amountCents:60000},{label:'Cleaning fee',amountCents:18000},{label:'TOT',amountCents:9945}]} as Quote;
 const html=renderToStaticMarkup(<PriceBreakdown quote={quote} showSampleBadge/>);
 expect(html).toContain('$879.45');expect(html.indexOf('Stay total')).toBeLessThan(html.indexOf('Cleaning fee'));
 expect(html).toContain('No payment-processing surcharge is added');expect(html).toContain('Test quote only');expect(html).not.toContain('tax rate are draft');
});
