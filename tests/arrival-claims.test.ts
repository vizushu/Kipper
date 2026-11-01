import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {getProperty} from '../src/lib/property';
const PROPERTY=getProperty('casa-pacifica')!;
describe('arrival information does not promise an unverified lock service',()=>{
 it('keeps verified arrival times and neutral arrangements',()=>{
  expect(PROPERTY.checkInTime).toBe('3:00 PM');expect(PROPERTY.checkOutTime).toBe('11:00 AM');
  expect(PROPERTY.checkInMethod).toBe('Confirm arrival arrangements with Casa Pacifica before travel');
  expect(JSON.stringify(PROPERTY.amenities)).not.toMatch(/smart.?lock|self.check.in/i);
  expect(JSON.stringify(PROPERTY.faqs)).not.toMatch(/smart.?lock|no need to coordinate a key/i);
 });
 it('removes automatic entry-code promises from public FAQs and policies',()=>{
  const faq=fs.readFileSync('src/app/faq/page.tsx','utf8');
  expect(faq).toContain('How do I arrange check-in?');expect(faq).not.toContain('Your personal entry code is sent');
  for(const p of ['src/app/policies/terms/page.tsx','src/app/policies/privacy/page.tsx'])expect(fs.readFileSync(p,'utf8')).not.toMatch(/smart.lock|self.check.in/i);
 });
});
