import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ContactPage from '../src/app/contact/page';
import { getGuestContactChannels } from '../src/lib/guest-contact';
const slack='https://join.slack.com/t/synthetic-guests/shared_invite/fixture-token';
const discord='https://discord.gg/synthetic-invite';
const number='+12025550123';
beforeEach(()=>{vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','false');vi.stubEnv('GUEST_CONTACT_SLACK_URL',slack);vi.stubEnv('GUEST_CONTACT_DISCORD_URL',discord);vi.stubEnv('GUEST_CONTACT_SMS_NUMBER',number);});
afterEach(()=>vi.unstubAllEnvs());
describe('guest contact destinations fail closed',()=>{
 it('lists four requested channels without destinations until explicit approval',()=>{
  const channels=getGuestContactChannels();expect(channels.map(c=>c.name)).toEqual(['Slack','Discord','SMS','Ask dot']);
  expect(channels.every(c=>!c.href)).toBe(true);expect(channels[3].status).toBe('in_development');
 });
 it('strips configured destinations in preview even with approval and test flags',()=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('BOOKING_TEST_MODE','true');
  const html=renderToStaticMarkup(<ContactPage/>);for(const privateValue of [slack,discord,number])expect(html).not.toContain(privateValue);
  expect(getGuestContactChannels().every(c=>!c.href)).toBe(true);expect(html).toContain('messages cannot be sent');
  expect(html).not.toMatch(/<form|<input|<textarea|<button|href="(?:https:|sms:)/);
 });
 it('exposes only approved guest invitation links and E164 SMS without a message body',()=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');const channels=getGuestContactChannels();
  expect(channels.map(c=>c.href)).toEqual([slack,discord,`sms:${number}`,undefined]);
  const html=renderToStaticMarkup(<ContactPage/>);expect(html).toContain('referrerPolicy="no-referrer"');expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain('?body=');expect(html).toContain('Ask dot is not answering questions yet');
 });
 it.each(['javascript:alert(1)','http://join.slack.com/t/a/shared_invite/b','https://join.slack.com.evil.example/t/a/shared_invite/b','https://private.slack.com/archives/internal','https://app.slack.com/client/private/channel','https://join.slack.com:444/t/a/shared_invite/b','https://user:pass@join.slack.com/t/a/shared_invite/b','https://join.slack.com/t/a/shared_invite/b?token=secret','https://join.slack.com/t/a/shared_invite/b#secret'])('rejects unsafe/private Slack destination %s',value=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_SLACK_URL',value);expect(getGuestContactChannels()[0].href).toBeUndefined();
 });
 it.each(['https://discord.com/channels/private/channel','https://discord.gg.evil.example/invite','https://discord.gg/invite?message=private','sms:+12025550123','https://localhost/invite'])('rejects unsupported Discord destination %s',value=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_DISCORD_URL',value);expect(getGuestContactChannels()[1].href).toBeUndefined();
 });
 it('accepts the alternate public Discord invitation shape',()=>{vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_DISCORD_URL','https://discord.com/invite/synthetic');expect(getGuestContactChannels()[1].href).toBe('https://discord.com/invite/synthetic');});
 it.each(['2025550123','+0123456789','+12025550123?body=hello','+12025550123;123','+1234567890123456','+12'])('rejects unsafe or malformed SMS number %s',value=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_SMS_NUMBER',value);expect(getGuestContactChannels()[2].href).toBeUndefined();
 });
 it('does not fabricate dot integration from arbitrary environment values',()=>{
  vi.stubEnv('GUEST_CONTACT_LINKS_APPROVED','true');vi.stubEnv('GUEST_CONTACT_DOT_URL','https://example.test/private-thread');
  expect(getGuestContactChannels()[3]).toMatchObject({status:'in_development'});expect(getGuestContactChannels()[3].href).toBeUndefined();
 });
 it('provides usable information links instead of dead contact buttons or fake chat',()=>{
  const html=renderToStaticMarkup(<ContactPage/>);expect(html).toContain('sm:grid-cols-2');expect(html.match(/<article /g)).toHaveLength(4);
  expect(html).toContain('href="/faq"');expect(html).toContain('href="/policies/cancellation"');expect(html).not.toMatch(/<form|<textarea|<input|<button/);
 });
});
