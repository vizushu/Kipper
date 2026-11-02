import { describe, expect, it } from 'vitest';
import { getProperty } from '../src/lib/property';
import { validateGuests } from '../src/lib/pricing';
import { snapshotForStay, resolveStayConfiguration } from '../src/lib/accommodation';
const property = getProperty('casa-pacifica')!;
describe('owner-confirmed overnight and visitor limits', () => {
 it('permits eight staying guests including infants, never ten overnight', () => {
  expect(property.maxGuests).toBe(8); expect(property.maxTotalOccupancy).toBe(10);
  expect(() => validateGuests({adults:6,children:1,infants:1}, property)).not.toThrow();
  for (const adults of [9,10]) expect(() => validateGuests({adults,children:0,infants:0},property)).toThrow('overnight guests');
 });
 it('binds distinct limits in new snapshots without changing already captured rules', () => {
  const p = {...property, houseRules:[...property.houseRules]};
  const snapshot = snapshotForStay(p,'2027-02-20','2027-02-22');
  expect(snapshot.maxGuests).toBe(8); expect(snapshot.maxTotalOccupancy).toBe(10);
  expect(snapshot.houseRules.join(' ')).toContain('approved daytime visitors');
  p.houseRules[0]='Later change'; expect(snapshot.houseRules[0]).not.toBe('Later change');
  expect(resolveStayConfiguration(property,'2027-03-01','2027-03-03').status).toBe('pending_approval');
 });
 it('lists all four owner-confirmed safety items without silently removing camera disclosure', () => {
  expect(property.safetyDevices).toEqual(expect.arrayContaining(['Smoke alarm','Carbon monoxide alarm','Fire extinguisher','First aid kit','Exterior security camera']));
 });
});
