import { isValidDateStr, todayInLA } from './dates';
import { BookingError, type AccommodationConfiguration, type Property, type StaySnapshot } from './types';

export interface StayConfigurationResult {
  status: 'no_dates' | 'available' | 'pending_approval' | 'manual_review' | 'invalid_dates';
  configuration?: AccommodationConfiguration;
  message?: string;
}
/** Configuration versions share property.id: never separate sellable inventory. */
export function resolveStayConfiguration(property: Property, checkIn?: string, checkOut?: string): StayConfigurationResult {
  const versions = property.configurations ?? [{ id: `${property.id}-current`, label: `${property.bedrooms} bedrooms`, effectiveFrom: '0001-01-01', bedrooms: property.bedrooms, maxGuests: property.maxGuests, maxTotalOccupancy: property.maxTotalOccupancy, checkoutApproved: true }];
  const at = (date: string) => versions.find(v => v.effectiveFrom <= date && (!v.effectiveTo || date < v.effectiveTo));
  if (!checkIn || !checkOut) return { status: 'no_dates', configuration: at(checkIn && isValidDateStr(checkIn) ? checkIn : todayInLA()) };
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkOut <= checkIn) return {status:'invalid_dates', message:'Choose a valid check-in and check-out date.'};
  const configuration = at(checkIn);
  if (!configuration) return {status:'pending_approval', message:'This accommodation is not yet available for these dates.'};
  if (configuration.effectiveTo && checkOut > configuration.effectiveTo) return {status:'manual_review', message:'This stay crosses an accommodation change. Please contact Casa Pacifica for manual review; online checkout is unavailable.'};
  if (!configuration.checkoutApproved || !configuration.maxGuests || !configuration.maxTotalOccupancy) return {status:'pending_approval', configuration, message:`${configuration.label} begins ${configuration.effectiveFrom}. Guest capacity and accommodation details are awaiting approval; online checkout is not yet available.`};
  return {status:'available', configuration};
}
export function snapshotForStay(property: Property, checkIn: string, checkOut: string): StaySnapshot {
  const resolved = resolveStayConfiguration(property, checkIn, checkOut);
  if (resolved.status !== 'available' || !resolved.configuration) throw new BookingError('UNAVAILABLE', resolved.message ?? 'Accommodation is unavailable.');
  const c = resolved.configuration;
  return { configurationId:c.id, label:c.label, bedrooms:c.bedrooms, maxGuests:c.maxGuests!, maxTotalOccupancy:c.maxTotalOccupancy!, propertyName:property.name, timezone:'America/Los_Angeles', checkInTime:property.checkInTime, checkOutTime:property.checkOutTime, houseRules:[...property.houseRules], cancellationPolicy:property.cancellationPolicy, cancellationPolicyVersion:property.cancellationPolicyVersion };
}
