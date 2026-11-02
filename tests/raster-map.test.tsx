import React from 'react';
import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import NeighborhoodMap,{neighborhoodRasterTiles} from '../src/components/NeighborhoodMap';
it('uses only the nine currently-visible raster tiles at one neighborhood zoom, without WebGL',()=>{
 const tiles=neighborhoodRasterTiles();expect(tiles).toHaveLength(9);expect(new Set(tiles.map(t=>t.src)).size).toBe(9);
 for(const tile of tiles){expect(tile.src).toMatch(/^https:\/\/tile.openstreetmap.org\/13\/143[01]\/330[012]\.png$|^https:\/\/tile.openstreetmap.org\/13\/1429\/330[012]\.png$/);expect(tile.left).toBeLessThan(100);expect(tile.left+tile.width).toBeGreaterThan(0);expect(tile.top).toBeLessThan(100);expect(tile.top+tile.height).toBeGreaterThan(0);}
 const html=renderToStaticMarkup(<NeighborhoodMap/>);expect(html).not.toMatch(/<iframe|<canvas|tile.openstreetmap.org\/13/);expect(html).toContain('OpenStreetMap contributors');
 const source=readFileSync('src/components/NeighborhoodMap.tsx','utf8');expect(source).toContain("rootMargin:'0px'");expect(source).toContain('referrerPolicy="origin"');expect(source).toContain('loading="lazy"');expect(source).not.toMatch(/fetch\(|localStorage|caches\.|geolocation/);
});
it('uses font-independent SVG diagonal arrows in all affected locations',()=>{
 for(const path of ['Header','Footer','PoliciesDialog','NeighborhoodMap']){const source=readFileSync(`src/components/${path}.tsx`,'utf8');expect(source).toContain('IconArrowUpRight');expect(source).not.toContain('↗');}
});
