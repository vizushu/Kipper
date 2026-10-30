import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../src/app/manifest';

const ORIGIN = 'https://kipper.example';
function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const stored = new Map<string, Response>();
  const cache = { put: vi.fn(async (path: string, response: Response) => { stored.set(path, response); }), match: vi.fn(async (path: string) => stored.get(path)) };
  const fetch = vi.fn(async () => new Response('public shell', { status: 200 }));
  const remove = vi.fn(async () => true);
  const context = vm.createContext({
    URL, Response,
    Request: class extends Request { constructor(input: string, init?: RequestInit) { super(new URL(input, ORIGIN), init); } },
    fetch,
    caches: { open: async () => cache, keys: async () => ['unrelated-cache', 'kipper-public-shell-v0', 'kipper-public-shell-v1'], delete: remove },
    self: { location: { origin: ORIGIN }, clients: { claim: vi.fn(async () => {}) }, addEventListener: (name: string, fn: (event: any) => void) => { handlers[name] = fn; } },
  });
  vm.runInContext(readFileSync('public/sw.js', 'utf8'), context);
  async function lifecycle(name: string) { let work: Promise<void> | undefined; handlers[name]({ waitUntil: (promise: Promise<void>) => { work = promise; } }); await work; }
  function request(path: string, options: { method?: string; mode?: string; rsc?: boolean } = {}) {
    const respondWith = vi.fn();
    handlers.fetch({ request: { url: new URL(path, ORIGIN).href, method: options.method ?? 'GET', mode: options.mode ?? 'navigate', headers: new Headers(options.rsc ? { RSC: '1' } : {}) }, respondWith });
    return respondWith;
  }
  return { handlers, cache, fetch, remove, lifecycle, request, stored };
}

describe('conservative public PWA shell', () => {
  it('has standalone install metadata and sized local brand icons', () => {
    const config = manifest();
    expect(config.display).toBe('standalone');
    expect(config.start_url).toBe('/');
    expect(config.icons?.map(icon => icon.sizes)).toContain('512x512');
    for (const icon of config.icons ?? []) expect(readFileSync(`public${icon.src}`).length).toBeGreaterThan(100);
  });
  it('precaches only generic offline content and icons, never home/listing HTML', async () => {
    const w = worker(); await w.lifecycle('install');
    expect([...w.stored.keys()].sort()).toEqual(['/icons/kipper-180.png', '/icons/kipper-192.png', '/icons/kipper-512.png', '/offline.html']);
    await w.lifecycle('activate');
    expect(w.remove).toHaveBeenCalledExactlyOnceWith('kipper-public-shell-v0');
  });
  it('leaves sensitive routes, all query URLs, APIs, third parties and mutations entirely network-only', () => {
    const w = worker();
    for (const path of ['/api/quote', '/api/availability', '/api/bookings', '/admin', '/admin/calendar', '/checkout', '/booking/secret-reference', '/bookings/ref/secret', '/access/token', '/properties/casa-pacifica?token=secret', '/?utm_source=test', 'https://js.stripe.com/v3']) {
      expect(w.request(path), path).not.toHaveBeenCalled();
    }
    expect(w.request('/', { method: 'POST' })).not.toHaveBeenCalled();
    expect(w.request('/', { rsc: true })).not.toHaveBeenCalled();
    expect(w.request('/properties', { mode: 'cors' })).not.toHaveBeenCalled();
  });
  it('returns only generic offline shell for allowlisted public navigations when network fails', async () => {
    const w = worker(); await w.lifecycle('install');
    w.fetch.mockRejectedValueOnce(new Error('offline'));
    const intercepted = w.request('/properties/casa-pacifica');
    expect(intercepted).toHaveBeenCalledOnce();
    const response = await intercepted.mock.calls[0][0];
    expect(await response.text()).toBe('public shell');
    expect(w.cache.put).toHaveBeenCalledTimes(4); // no navigation or API cache writes
  });
  it('does not replace successful public navigation with stale cached HTML', async () => {
    const w = worker(); await w.lifecycle('install');
    w.fetch.mockResolvedValueOnce(new Response('fresh network page'));
    const intercepted = w.request('/');
    expect(await (await intercepted.mock.calls[0][0]).text()).toBe('fresh network page');
    expect(w.cache.match).not.toHaveBeenCalled();
    expect(w.cache.put).toHaveBeenCalledTimes(4);
  });
});
