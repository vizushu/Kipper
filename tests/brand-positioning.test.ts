import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getProperty } from '../src/lib/property';
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sources(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(join(dir, entry.name), 'utf8')] : []);
}
describe('Kipper concierge startup positioning', () => {
  it('does not identify Kipper as property manager, operator or legal host in application copy', () => {
    const text = sources('src').join('\n');
    expect(text).not.toMatch(/Kipper Property Management|operated by Kipper|hosted directly by Kipper|Hosted by Kipper|hostName\s*[=:]\s*["']Kipper/i);
    expect(text).not.toContain('9 years hosting on Airbnb');
    expect(text).not.toContain('private heated');
  });
  it('withholds the host card until the homeowner identity is verified, without removing the property license', () => {
    const property = getProperty('casa-pacifica')!;
    expect(property.hostName).toBeUndefined();
    expect(property.brandLine).toBe('Casa Pacifica · San Diego');
    expect(property.license).toBe('STR-13982L');
    expect(readFileSync('src/components/Footer.tsx', 'utf8')).toContain('Casa Pacifica property · San Diego STRO');
  });
  it('states the concierge development and legal-party launch gates without enabling booking', () => {
    const about = readFileSync('src/app/about/page.tsx', 'utf8');
    expect(about).toContain('Kipper is the concierge AI in development');
    expect(about).toContain('Final contracting and merchant account details will be disclosed');
    expect(about).toContain('accepts no reservations or payments');
  });
});

it('uses Casa Pacifica for navigation, app identity, offline shell and receipt sender defaults',()=>{
  const header=readFileSync('src/components/Header.tsx','utf8');
  expect(header).toContain('aria-label="Casa Pacifica home"');
  expect(header).not.toContain('Kipper');
  expect(readFileSync('public/offline.html','utf8')).toContain('CASA PACIFICA');
  const outbox=readFileSync('src/lib/outbox.ts','utf8');
  expect(outbox).toContain('Casa Pacifica <bookings@example.test>');
  expect(outbox).not.toContain('Kipper');
  expect(sources('src').join('\n')).not.toContain('Kipper Stays');
});
