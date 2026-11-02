import { describe, expect, it } from 'vitest';
import { resolveStayConfiguration, snapshotForStay } from '../src/lib/accommodation';
import { getProperty } from '../src/lib/property';
import { computeQuote, DEFAULT_PRICING_SETTINGS } from '../src/lib/pricing';
const property = getProperty('casa-pacifica')!;
const input = {property,settings:DEFAULT_PRICING_SETTINGS,rateOverrides:{},guests:{adults:2,children:0,infants:0},now:new Date('2026-10-30T12:00:00Z')};
describe('date-aware physical accommodation', () => {
 it('checkout March 1 is still entirely 3BR', () => { const r=resolveStayConfiguration(property,'2027-02-27','2027-03-01'); expect(r.status).toBe('available');expect(r.configuration?.bedrooms).toBe(3); });
 it('March 1 arrival selects 5BR but cannot quote before approval', () => { expect(resolveStayConfiguration(property,'2027-03-01','2027-03-03').configuration?.bedrooms).toBe(5); expect(() => computeQuote({...input,checkIn:'2027-03-01',checkOut:'2027-03-03'})).toThrow('awaiting approval'); });
 it('cross-boundary stay requires manual review', () => {expect(resolveStayConfiguration(property,'2027-02-28','2027-03-02').status).toBe('manual_review'); expect(() => computeQuote({...input,checkIn:'2027-02-28',checkOut:'2027-03-02'})).toThrow('manual review');});
 it('incomplete future range never selects the old room configuration', () => expect(resolveStayConfiguration(property,'2027-03-01').configuration?.bedrooms).toBe(5));
 it('snapshots are independent of subsequent rules changes', () => {const p={...property,houseRules:[...property.houseRules]}; const snapshot=snapshotForStay(p,'2027-02-27','2027-03-01');p.houseRules.push('Later rule');expect(snapshot.houseRules).not.toContain('Later rule');expect(snapshot.cancellationPolicyVersion).toBe('firm-cleaning-waived-2026-11-01');});
 it('generic second property has no Casa-specific dependency', () => {const p={...property,id:'another-home',configurations:undefined,bedrooms:2};expect(snapshotForStay(p,'2027-04-01','2027-04-03').bedrooms).toBe(2);});
 it('retains one physical inventory identity across slug aliases', () => expect(getProperty('casa-pacifica-san-diego')?.id).toBe(property.id));
});
