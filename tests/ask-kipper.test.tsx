import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ContactPage,{metadata} from '../src/app/contact/page';
import {readFileSync} from 'node:fs';
afterEach(()=>vi.unstubAllEnvs());
it.each(['true','false'])('keeps one honest unavailable contact entry in preview=%s',preview=>{
 vi.stubEnv('SITE_PREVIEW_MODE',preview);vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');
 vi.stubEnv('GUEST_CONTACT_SLACK_URL','https://join.slack.com/t/internal/shared_invite/private');
 vi.stubEnv('GUEST_CONTACT_SMS_NUMBER','+12025550123');vi.stubEnv('GUEST_CONTACT_EMAIL','private@example.test');
 const html=renderToStaticMarkup(<ContactPage/>);
 expect(metadata.title).toBe('Ask Kipper');expect(html).toContain('Questions about your stay?');
 expect(html.match(/<button[^>]*disabled/g)).toHaveLength(1);expect(html).toMatch(/<button[^>]*disabled/);
 expect(html).toContain('aria-describedby="message-status"');expect(html).toContain('mailto:vizushu@gmail.com');
 expect(html).toContain('Booked guests: urgent help');expect(html).toContain('original booking confirmation');
 expect(html).toContain('Kipper AI is not answering here yet');
 expect(html).not.toMatch(/private@example|12025550123|join.slack|Discord|Ask dot|sms:|tel:|<form|<input|<textarea/);
 expect(html).not.toMatch(/15.minute|instant answer|within.*minutes/i);
});
it('uses the same contact page from header and footer, without a competing chat entry',()=>{
 for(const path of ['src/components/Header.tsx','src/components/Footer.tsx']){
  const source=readFileSync(path,'utf8');expect(source).toContain('href="/contact"');expect(source).toContain('Ask Kipper');
 }
 const source=readFileSync('src/app/contact/page.tsx','utf8');expect(source).not.toContain('getGuestContactChannels');expect(source).not.toContain('fetch(');
});
