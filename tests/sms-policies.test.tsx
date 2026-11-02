import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import SmsPrivacy from '../src/app/policies/sms-privacy/page';
import SmsTerms from '../src/app/policies/sms-terms/page';
import Contact from '../src/app/contact/page';
afterEach(()=>vi.unstubAllEnvs());
it('publishes approved prelaunch operator and email without phone destinations or forms',()=>{
 for(const Component of [SmsPrivacy,SmsTerms,Contact]){
  const html=renderToStaticMarkup(<Component/>);
  expect(html).toContain('Renier De La Cruz');expect(html).toContain('mailto:vizushu@gmail.com');
  expect(html).not.toMatch(/href="(?:sms:|tel:)|<form|<input|<textarea|\+1\d{10}/);
  expect(html).toContain('/policies/sms-privacy');expect(html).toContain('/policies/sms-terms');
 }
});
it('distinguishes planned own-system retention from unconfigured provider deletion',()=>{
 const html=renderToStaticMarkup(<SmsPrivacy/>);
 for(const text of ['up to 90 days after a conversation closes','own support system','may be retained indefinitely','up to 30 days','not configured yet','not a promise that every provider copy','consent evidence','opt-out records'])expect(html).toContain(text);
 expect(html).toContain('We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.');
});
it('limits consent to initiated support, not a subscription, and labels future STOP HELP truthfully',()=>{
 const html=renderToStaticMarkup(<SmsTerms/>);
 for(const text of ['SMS Terms','not an active subscription','replies relevant to that conversation','does not authorize marketing','Message and data rates may apply','reply STOP','Reply HELP','No keyword response is active','human backup','not currently answering'])expect(html).toContain(text);
 expect(html).not.toContain('Cancellation refund schedule confirmed');
});
it.each(['true','false'])('never activates SMS or imports legacy destinations when preview=%s',preview=>{
 vi.stubEnv('SITE_PREVIEW_MODE',preview);vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_SMS_NUMBER','+12025550123');
 const html=renderToStaticMarkup(<Contact/>);
 expect(html).toContain('disabled=""');expect(html).toContain('No message can be sent here.');
 expect(html).not.toContain('+12025550123');expect(html).not.toContain('href="sms:');
});
