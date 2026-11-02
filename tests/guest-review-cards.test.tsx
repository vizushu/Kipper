import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import GuestReviewCards,{type GuestReview} from '../src/components/GuestReviewCards';
const sample:GuestReview={id:'synthetic',name:'Synthetic guest',date:'January 2026',stars:5,text:'A synthetic fixture, not a real testimonial.',avatar:'/synthetic-avatar.png'};
it('attributes selected historical reviews without an aggregate or verification claim',()=>{
 const html=renderToStaticMarkup(<GuestReviewCards reviews={[sample]}/>);
 expect(html).toContain('Selected Airbnb reviews supplied by the host');expect(html).toContain('not reviews collected or independently verified');expect(html).toContain('January 2026');expect(html).toContain('5 out of 5 stars');expect(html).not.toMatch(/aggregateRating|ratingValue|application\/ld\+json/);
});
it('keeps complete mixed feedback and lower ratings without changing or hiding their words',()=>{
 const negative={...sample,id:'critical',stars:1 as const,text:'A useful stay, but access was unclear. Please preserve this criticism.'};
 const html=renderToStaticMarkup(<GuestReviewCards reviews={[sample,{...sample,id:'second'},negative]}/>);
 expect(html).toContain(negative.text);expect(html).toContain('1 out of 5 stars');expect(html).toContain('Read all 3 supplied reviews');expect(html).not.toContain('line-clamp');
});
it('labels missing review text instead of inventing a positive substitute',()=>{
 const html=renderToStaticMarkup(<GuestReviewCards reviews={[{...sample,stars:1,text:null}]}/>);
 expect(html).toContain('does not include this review');expect(html).toContain('1 out of 5 stars');
});
it('renders nothing without supplied records and escapes quote content',()=>{
 expect(renderToStaticMarkup(<GuestReviewCards reviews={[]}/>)).toBe('');
 expect(renderToStaticMarkup(<GuestReviewCards reviews={[{...sample,text:'<script>not executable</script>'}]}/>)).toContain('&lt;script&gt;');
});

import {CASA_PACIFICA_REVIEWS} from '../src/data/guest-reviews';
import {readFileSync,readdirSync} from 'node:fs';
it('contains exactly ten deduplicated supplied reviews and retains the complete mixed account',()=>{
 expect(CASA_PACIFICA_REVIEWS.map(r=>r.name)).toEqual(['Milad','Gonzalo','Fernando','Julie','Davy','Andrya','Kristie','Adrian','Veronica','Christian']);
 expect(new Set(CASA_PACIFICA_REVIEWS.map(r=>r.id)).size).toBe(10);
 const mixed=CASA_PACIFICA_REVIEWS.find(r=>r.name==='Andrya')!;
 expect(mixed.text).toContain('it was a little weird not knowing if the owner could be there');
 expect(mixed.text).toContain('I just wish they told me clearly if the owner either was or wasn’t there.');
 expect(mixed.text).toMatch(/The areas not to access are clearly labeled or blocked off\.$/);
 expect(mixed.stars).toBe(5);
 expect(CASA_PACIFICA_REVIEWS.every(r=>r.text&&r.avatar===`/images/reviews/${r.id}.png`)).toBe(true);
});
it('ships only small avatar PNGs with no screenshot or metadata chunks',()=>{
 expect(readdirSync('public/images/reviews').sort()).toEqual(CASA_PACIFICA_REVIEWS.map(r=>`${r.id}.png`).sort());
 for(const r of CASA_PACIFICA_REVIEWS){const png=readFileSync(`public${r.avatar}`);expect(png.subarray(1,4).toString()).toBe('PNG');expect(png.readUInt32BE(16)).toBeLessThanOrEqual(136);expect(png.readUInt32BE(20)).toBeLessThanOrEqual(136);
 let offset=8;const chunks=[];while(offset<png.length){const size=png.readUInt32BE(offset);chunks.push(png.subarray(offset+4,offset+8).toString());offset+=size+12;}expect(chunks.every(c=>['IHDR','IDAT','IEND'].includes(c))).toBe(true);}
});
