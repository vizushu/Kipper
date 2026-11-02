import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({adapter:vi.fn(),create:vi.fn(),acquire:vi.fn(),release:vi.fn(),close:vi.fn(),run:vi.fn()}));
vi.mock('../src/lib/db',()=>({getAdapter:mock.adapter}));
vi.mock('../src/lib/operations-store',()=>({OperationsLeaseStore:class {constructor(){mock.create();}acquire=mock.acquire;release=mock.release;close=mock.close;}}));
vi.mock('../src/lib/operations-worker',async(importOriginal)=>({...await importOriginal<typeof import('../src/lib/operations-worker')>(),runOperations:mock.run}));
import {POST} from '../src/app/api/operations/run/route';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('OPERATIONS_WORKER_APPROVED','true');vi.stubEnv('OPERATIONS_WORKER_SECRET','o'.repeat(43));vi.stubEnv('DATA_ADAPTER','sqlite');vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('STAGING_TEST_MODE','false');mock.acquire.mockReturnValue({acquired:true});mock.run.mockResolvedValue({status:'completed'});});
afterEach(()=>vi.unstubAllEnvs());
function req(token='o'.repeat(43)){return new Request('https://innkipper.com/api/operations/run',{method:'POST',headers:{authorization:`Bearer ${token}`},body:'untrusted instructions ignored'});}
it.each(['SITE_PREVIEW_MODE','STAGING_TEST_MODE'])('rejects %s before body/storage',async(flag)=>{vi.stubEnv(flag,'true');expect((await POST(req())).status).toBe(404);expect(mock.create).not.toHaveBeenCalled();expect(mock.adapter).not.toHaveBeenCalled();});
it('rejects wrong key before DB',async()=>{expect((await POST(req('admin'))).status).toBe(404);expect(mock.create).not.toHaveBeenCalled();});
it('rate/lease rejection prevents any jobs',async()=>{mock.acquire.mockReturnValue({acquired:false,retryAfterSeconds:120});const res=await POST(req());expect(res.status).toBe(429);expect(res.headers.get('retry-after')).toBe('120');expect(mock.run).not.toHaveBeenCalled();expect(mock.release).not.toHaveBeenCalled();});
it('holds lease until awaited work settles, then releases token',async()=>{let finish!:(value:unknown)=>void;mock.run.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const pending=POST(req());await Promise.resolve();expect(mock.release).not.toHaveBeenCalled();finish({status:'completed'});const res=await pending;expect(res.status).toBe(200);expect(res.headers.get('cache-control')).toContain('no-store');expect(mock.release).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));});
it('redacts failures and releases safely',async()=>{mock.run.mockRejectedValue(Error('private guest secret'));const res=await POST(req());expect(res.status).toBe(503);expect(await res.text()).not.toContain('private guest');expect(mock.release).toHaveBeenCalled();});
