import {afterEach,expect,it,vi} from 'vitest';
import {isBookingTestPreviewEnabled} from '../src/lib/booking-launch';
afterEach(()=>vi.unstubAllEnvs());
it('fails closed unless explicitly enabled for test preview',()=>{vi.stubEnv('BOOKING_TEST_MODE','');expect(isBookingTestPreviewEnabled()).toBe(false);vi.stubEnv('BOOKING_TEST_MODE','false');expect(isBookingTestPreviewEnabled()).toBe(false);vi.stubEnv('BOOKING_TEST_MODE','true');expect(isBookingTestPreviewEnabled()).toBe(true);});
