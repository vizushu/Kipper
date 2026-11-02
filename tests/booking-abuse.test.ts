import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import type {DataAdapter} from '../src/lib/db/adapter';
import {consumeBookingRequest} from '../src/lib/booking-abuse';
const consumeRateLimit=vi.fn();const adapter={consumeRateLimit} as unknown as DataAdapter;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('BOOKING_ACCESS_SECRET','synthetic-booking-secret-at-least-32-bytes');consumeRateLimit.mockResolvedValue({allowed:true,retryAfterSeconds:0});});
afterEach(()=>vi.unstubAllEnvs());
it('normalizes email to a stable nonreversible keyed bucket, distinct from global',async()=>{await consumeBookingRequest(adapter,' Guest@Example.Test ');await consumeBookingRequest(adapter,'guest@example.test');await consumeBookingRequest(adapter);expect(consumeRateLimit.mock.calls[0][0]).toBe(consumeRateLimit.mock.calls[1][0]);expect(consumeRateLimit.mock.calls[2][0]).not.toBe(consumeRateLimit.mock.calls[0][0]);expect(JSON.stringify(consumeRateLimit.mock.calls)).not.toMatch(/guest|example/i);});
it('preview never touches storage even with an available access secret',async()=>{vi.stubEnv('SITE_PREVIEW_MODE','true');await expect(consumeBookingRequest(adapter)).rejects.toThrow('Preview');expect(consumeRateLimit).not.toHaveBeenCalled();});
it('missing or short signing configuration fails before storing identity',async()=>{vi.stubEnv('BOOKING_ACCESS_SECRET','short');await expect(consumeBookingRequest(adapter,'guest@example.test')).rejects.toThrow('unavailable');expect(consumeRateLimit).not.toHaveBeenCalled();});
