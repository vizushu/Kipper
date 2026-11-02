import {EventEmitter} from 'node:events';
import {afterEach,expect,it,vi} from 'vitest';
import {runMaintenanceChild,runScheduledMaintenance} from '../scripts/run-scheduled-maintenance.mjs';
afterEach(()=>vi.useRealTimers());
it('runs fixed jobs in order once and requires both successes',async()=>{const runChild=vi.fn().mockResolvedValue('completed');expect(await runScheduledMaintenance({runChild})).toEqual({ok:true,calendar:'completed',operations:'completed'});expect(runChild.mock.calls).toEqual([['calendar'],['operations']]);});
it.each(['failed','deadline','private provider details'])('calendar %s does not suppress operations or leak arbitrary output',async value=>{const runChild=vi.fn().mockResolvedValueOnce(value).mockResolvedValueOnce('completed');const result=await runScheduledMaintenance({runChild});expect(result.ok).toBe(false);expect(result.operations).toBe('completed');expect(JSON.stringify(result)).not.toContain('private');expect(runChild).toHaveBeenCalledTimes(2);});
it('exceptions never suppress second job and do not echo errors',async()=>{const runChild=vi.fn().mockRejectedValueOnce(new Error('secret')).mockResolvedValueOnce('failed');expect(await runScheduledMaintenance({runChild})).toEqual({ok:false,calendar:'failed',operations:'failed'});});
it('fixed spawn has no shell/output and isolates purpose credentials',async()=>{
 const calls=[];const spawnChild=(...args)=>{calls.push(args);const child=new EventEmitter();queueMicrotask(()=>child.emit('close',0));return child;};
 const env={CALENDAR_WORKER_SECRET:'calendar',OPERATIONS_WORKER_SECRET:'ops',ADMIN_SECRET:'never',SITE_PREVIEW_MODE:'false',STAGING_TEST_MODE:'false'};
 expect(await runMaintenanceChild('calendar',{spawnChild,env})).toBe('completed');expect(await runMaintenanceChild('operations',{spawnChild,env})).toBe('completed');
 expect(calls[0][1][0]).toMatch(/scripts\/sync-calendar\.mjs$/);expect(calls[1][1][0]).toMatch(/scripts\/run-operations\.mjs$/);
 expect(calls[0][2]).toEqual({shell:false,stdio:'ignore',env:{CALENDAR_WORKER_SECRET:'calendar'}});expect(calls[1][2].env).toEqual({OPERATIONS_WORKER_SECRET:'ops',SITE_PREVIEW_MODE:'false',STAGING_TEST_MODE:'false'});
});
it.each([['calendar',30000],['operations',60000]])('kills %s at its bounded deadline and waits for exit',async(name,ms)=>{vi.useFakeTimers();const child=new EventEmitter();child.kill=vi.fn(()=>{queueMicrotask(()=>child.emit('close',null));return true;});const spawnChild=vi.fn(()=>child);const pending=runMaintenanceChild(name,{spawnChild,env:{}});await vi.advanceTimersByTimeAsync(ms);expect(await pending).toBe('deadline');expect(child.kill).toHaveBeenCalledExactlyOnceWith('SIGKILL');expect(spawnChild).toHaveBeenCalledTimes(1);});
it('rejects unknown jobs before spawn and handles process start failure',async()=>{const spawnChild=vi.fn(()=>{throw new Error('private');});expect(await runMaintenanceChild('arbitrary',{spawnChild})).toBe('failed');expect(spawnChild).not.toHaveBeenCalled();expect(await runMaintenanceChild('calendar',{spawnChild})).toBe('failed');});
