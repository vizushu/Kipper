import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import Contact from '../src/app/contact/page';
import StayHelpGuide from '../src/components/StayHelpGuide';
import {getProperty} from '../src/lib/property';
import {CANCELLATION_POLICY} from '../src/lib/cancellation';
afterEach(()=>vi.unstubAllEnvs());
it('offers a working blank email action before optional closed guide questions',()=>{
 const html=renderToStaticMarkup(<Contact/>);
 expect(html).toContain('>Email us</a>');expect(html.indexOf('>Email us</a>')).toBeLessThan(html.indexOf('Quick stay answers'));
 expect(html).toContain('Opens your email app. You choose whether to send.');
 expect(html.match(/<details/g)).toHaveLength(7);expect(html).not.toMatch(/<details[^>]* open/);
 expect(html).not.toMatch(/mailto:[^"]*\?|<form|<input|<textarea|role="log"|typing|Message sent/);
});
it('limits public answers to verified facts and makes timing and unavailable checkout explicit',()=>{
 const property=getProperty('casa-pacifica')!;const html=renderToStaticMarkup(<StayHelpGuide/>);
 for(const text of ['Verified stay guide—not live AI or chat','8 overnight guests','children and infants','10','approved daytime visitors','March 1, 2027','does not change automatically mid-stay','Online reservations and payments are not open yet','does not reserve the property','3:00 PM','11:00 AM'])expect(html).toContain(text);
 expect(html).toContain(CANCELLATION_POLICY.text);
 for(const privateValue of [property.address,String(property.latitude),String(property.longitude)])expect(html).not.toContain(privateValue);
 expect(html).not.toMatch(/15 guests|Wi-Fi 7|sauna|Queen bed|upstairs|downstairs|shared space|\$449/);
});
it.each(['true','false'])('keeps SMS/AI unavailable independent of preview=%s',preview=>{
 vi.stubEnv('SITE_PREVIEW_MODE',preview);vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_SMS_NUMBER','+12025550123');
 const html=renderToStaticMarkup(<Contact/>);expect(html).toContain('Text us · unavailable');expect(html).toContain('disabled=""');expect(html).not.toContain('href="sms:');expect(html).not.toContain('+12025550123');expect(html).toContain('Kipper AI is not answering here yet');
});
it('has no send/AI/provider implementation hidden behind the guide',()=>{
 const source=readFileSync('src/components/StayHelpGuide.tsx','utf8');expect(source).not.toMatch(/fetch\(|use client|process.env|localStorage|api\/|sendMessage/);
 expect(source).toContain('getProperty');expect(source).toContain('CANCELLATION_POLICY.text');
});
