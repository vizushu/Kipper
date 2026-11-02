import {expect,it} from 'vitest';
import {checkoutQuoteErrorMessage} from '../src/app/checkout/CheckoutClient';
it.each([
 ['UNAVAILABLE','5-bedroom accommodation begins 2027-03-01. Guest capacity and accommodation details are awaiting approval; online checkout is not yet available.'],
 ['UNAVAILABLE','This stay crosses an accommodation change. Please contact Casa Pacifica for manual review; online checkout is unavailable.'],
 ['GUEST_LIMIT','Please contact Casa Pacifica before booking with a pet; online pet bookings are not available yet.'],
 ['GUEST_LIMIT','This home permits at most 8 overnight guests, including infants; you entered 9 staying guests.'],
 ['UNAVAILABLE','These dates are unavailable.'],
])('preserves the public API explanation for %s without inventing a different cause',(code,message)=>{
 expect(checkoutQuoteErrorMessage(code,new Error(message))).toBe(message);
});
it('keeps expiry guidance and generic non-error fallback',()=>{
 expect(checkoutQuoteErrorMessage('QUOTE_EXPIRED',new Error('expired'))).toContain('a quote does not hold dates');
 expect(checkoutQuoteErrorMessage(undefined,null)).toBe('Could not price this stay.');
});
