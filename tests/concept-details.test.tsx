import React from 'react';
import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import FaxJokeField from '../src/components/FaxJokeField';
import SmartHomeConcept,{adjustConceptTemperature,CONCEPT_INITIAL_TEMPERATURE} from '../src/components/SmartHomeConcept';
it('keeps fax humor disabled, unnamed, optional and out of booking data',()=>{
 const html=renderToStaticMarkup(<FaxJokeField/>);
 expect(html).toContain('Fax number');expect(html).toContain('placeholder="Just kidding!"');expect(html).toContain('disabled=""');expect(html).toContain('aria-describedby=');
 expect(html).toContain('no fax number needed or collected');expect(html).not.toMatch(/\sname=|\srequired|\svalue=/);
 const checkout=readFileSync('src/app/checkout/CheckoutClient.tsx','utf8');expect(checkout).toContain('<FaxJokeField/>');expect(checkout).not.toMatch(/fax:|faxNumber|setFax/);
});
it('starts an optional collapsed local concept with explicit nonoperational labels',()=>{
 const html=renderToStaticMarkup(<SmartHomeConcept/>);
 expect(html).toContain('<details');expect(html).not.toMatch(/<details[^>]* open/);
 for(const text of ['Smart-home concept','local demo','Local simulation only. No devices are connected.','72','°F','Example lights:','off','aria-pressed="false"','Simulated temperature'])expect(html).toContain(text);
 expect(html).toContain('do not change the home');expect(html).not.toMatch(/<form|<input/);
});
it('bounds the demonstration without operational side effects or persistence',()=>{
 expect(CONCEPT_INITIAL_TEMPERATURE).toBe(72);expect(adjustConceptTemperature(72,1)).toBe(73);expect(adjustConceptTemperature(72,-1)).toBe(71);
 expect(adjustConceptTemperature(60,-1)).toBe(60);expect(adjustConceptTemperature(85,1)).toBe(85);
 const source=readFileSync('src/components/SmartHomeConcept.tsx','utf8');expect(source).not.toMatch(/fetch\(|localStorage|sessionStorage|sendBeacon|track\(|process.env|api\//);
 expect(source).toContain('setLights(value => !value)');expect(source).toContain('useState(false)');
});
it('keeps the concept adjacent to amenities, inside date-approved details',()=>{
 const source=readFileSync('src/components/PropertyExperience.tsx','utf8');expect(source).toContain('<AmenityHighlights groups={property.amenities}/>{isCasa&&<SmartHomeConcept/>}');
 expect(source.indexOf('{showDetails&&<>')).toBeLessThan(source.indexOf('<SmartHomeConcept/>'));
});
