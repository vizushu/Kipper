import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PriceBreakdown from '../src/components/PriceBreakdown';
import {outboxEnvelope} from '../src/lib/outbox';
import type {OutboxJob} from '../src/lib/db/workflows';
import {expect,it} from 'vitest';
import {getProperty} from '../src/lib/property';
import {computeQuote,DEFAULT_PRICING_SETTINGS,nightlyRateCents} from '../src/lib/pricing';
const property=getProperty('casa-pacifica')!;
const input={property,settings:{...DEFAULT_PRICING_SETTINGS,promos:[{code:'DIRECT10',type:'percent' as const,percent:10}]},rateOverrides:{'2027-02-20':103000},checkIn:'2027-02-20',checkOut:'2027-02-22',guests:{adults:2,children:0,infants:0},now:new Date('2026-11-01T00:00:00Z')};
it.each(['2027-02-18','2027-02-19','2027-02-20','2027-07-02','2028-01-10'])('uses permanent flat449 without weekday,season or dateoverride uplift on %s',date=>{expect(nightlyRateCents(property,date,{[date]:100000})).toBe(44900);});
it('quotes accommodation with actual waived cleaning and12.75percent taxable total',()=>{const q=computeQuote(input);expect(q.subtotalCents).toBe(89800);expect(q.cleaningFeeCents).toBe(0);expect(q.taxesCents).toBe(11450);expect(q.totalCents).toBe(101250);expect(q.discountCents).toBe(0);expect(q.petFeeCents).toBe(0);expect(q.lineItems.map(x=>x.label).join(' ')).not.toMatch(/processing|service fee|Apple Pay/i);});
it('does not silently apply legacy storedDIRECT10 promotion',()=>{expect(()=>computeQuote({...input,promoCode:'DIRECT10'})).toThrow(/not valid/);expect(DEFAULT_PRICING_SETTINGS.promos).toEqual([]);});
it('does not imply free pets or charge the unapproved samplepetfee',()=>{expect(()=>computeQuote({...input,pets:1})).toThrow(/contact Casa Pacifica/);expect(property.petPolicy.onlineApprovalPending).toBe(true);});
it('future configuration remains unavailable even though rate helper is timeless',()=>{expect(()=>computeQuote({...input,checkIn:'2027-03-01',checkOut:'2027-03-03'})).toThrow();});
it('new pricing does not mutate already issued quotes or accepted price snapshots',()=>{const old=computeQuote({...input,property:{...property,pricingMode:'legacy_sample',baseNightlyCents:34900,minNightlyCents:34900,maxNightlyCents:103000},rateOverrides:{}});const before=JSON.stringify(old);computeQuote(input);expect(JSON.stringify(old)).toBe(before);expect(old.totalCents).not.toBe(computeQuote(input).totalCents);});

it('stores usual180 only as display context, never as a charge or tax base',()=>{const q=computeQuote(input);expect(q.lineItems.find(x=>x.label==='Cleaning fee')).toEqual({label:'Cleaning fee',amountCents:0,referenceAmountCents:18000,detail:'Waived for direct bookings'});expect(q.staySnapshot?.priceBreakdown?.cleaningFeeCents).toBe(0);expect(q.lineItems.reduce((sum,x)=>sum+x.amountCents,0)).toBe(q.totalCents);});

it('renders the genuine priorfee strike-through and zero in quote and frozen receipt',()=>{const q=computeQuote(input);const html=renderToStaticMarkup(React.createElement(PriceBreakdown,{quote:q}));expect(html).toContain('<del');expect(html).toContain('$180');expect(html).toContain('$0');expect(html).toContain('Waived for direct bookings');expect(html).toContain('Usual fee');const job={kind:'guest_confirmation',payload:{booking:{...q,reference:'CP-SYNTHETIC',guest:{email:'guest@example.test'},createdAt:'2026-11-01T00:00:00Z'}}} as unknown as OutboxJob;const receipt=outboxEnvelope(job);expect(receipt.html).toContain('<del');expect(receipt.html).toContain('$0');expect(receipt.html).toContain('$1,012.50');});

it('keeps the waiver visible in the listing without advertising a fixed nightly price',()=>{const source=readFileSync('src/components/PropertyExperience.tsx','utf8');expect(source).toContain('Waived for direct bookings');expect(source).toContain('property.cleaningFeeCents===0');expect(source).not.toContain('$449');});
