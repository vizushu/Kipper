import React from 'react';
import {expect,it,vi} from 'vitest';
import NeighborhoodMap from '../src/components/NeighborhoodMap';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import MapboxNeighborhood,{approvedPublicMapToken,neighborhoodArea,NEIGHBORHOOD_CENTER} from '../src/components/MapboxNeighborhood';
it('accepts only explicitly configured public tokens, never secret tokens or arbitrary strings',()=>{
 expect(approvedPublicMapToken(undefined)).toBeNull();expect(approvedPublicMapToken('')).toBeNull();
 expect(approvedPublicMapToken('sk.synthetic')).toBeNull();expect(approvedPublicMapToken('pk.foo bar')).toBeNull();
 expect(approvedPublicMapToken('pk.synthetic.fixture')).toBe('pk.synthetic.fixture');
});
it('uses a fixed closed broad neighborhood polygon without property or visitor inputs',()=>{
 const area=neighborhoodArea();expect(NEIGHBORHOOD_CENTER).toEqual([-117.145,32.93]);
 expect(area.geometry.coordinates[0]).toHaveLength(65);
 expect(area.geometry.coordinates[0][0][0]).toBeCloseTo(area.geometry.coordinates[0][64][0]);
 for(const [lng,lat] of area.geometry.coordinates[0]){expect(lng).toBeGreaterThan(-117.17);expect(lng).toBeLessThan(-117.12);expect(lat).toBeGreaterThan(32.91);expect(lat).toBeLessThan(32.95);}
});
it('keeps pending enhancement hidden and unfocusable without exposing the token in HTML',()=>{
 const html=renderToStaticMarkup(<MapboxNeighborhood token="pk.synthetic.fixture"/>);
 expect(html).toContain('aria-hidden="true"');expect(html).toContain('inert=""');expect(html).not.toContain('pk.synthetic');
});
it('retains fallback, lazy loading, attribution, cleanup and cooperative gestures without sensitive APIs',()=>{
 const source=readFileSync('src/components/MapboxNeighborhood.tsx','utf8');
 for(const required of ["import('mapbox-gl/esm')",'sdk.supported()',"map.on('error',()=>fail('style-load-error'))","map.on('webglcontextlost',()=>fail('webgl-context-lost'))","setTimeout(()=>fail('timeout'),12000)",'map?.remove()','cooperativeGestures:true','respectPrefersReducedMotion:true','attributionControl:true'])expect(source).toContain(required);
 expect(source).not.toMatch(/geolocation|localStorage|sessionStorage|fetch\(|property\.address|searchParams/);
 const wrapper=readFileSync('src/components/NeighborhoodMap.tsx','utf8');expect(wrapper).toContain('visible&&mapToken&&');expect(wrapper).toContain('neighborhoodRasterTiles().map');
});

it('discloses provider requests only when the optional integration is configured',()=>{
 vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN','pk.synthetic.fixture');
 try {const html=renderToStaticMarkup(<NeighborhoodMap/>);expect(html).toContain('Interactive maps connect to Mapbox');expect(html).toContain('https://www.mapbox.com/legal/privacy');expect(html).not.toContain('pk.synthetic.fixture');} finally {vi.unstubAllEnvs();}
});

it('exposes only bounded non-sensitive DOM diagnostics, never provider error details',()=>{
 const source=readFileSync('src/components/MapboxNeighborhood.tsx','utf8');
 for(const state of ['unsupported-webgl','timeout','style-load-error','webgl-context-lost','sdk-load-error','ready'])expect(source).toContain(`'${state}'`);
 expect(source).toContain('data-mapbox-state={status}');expect(source).toContain('data-mapbox-state={failure}');
 expect(source).not.toMatch(/error\.message|console\.|JSON.stringify|event\.error/);
});
