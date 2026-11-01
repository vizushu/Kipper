import {afterEach,expect,it,vi} from 'vitest';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getAdapter,resetAdapter} from '../src/lib/db';
import {SqliteAdapter} from '../src/lib/db/sqlite';
let directory:string|undefined;
afterEach(()=>{resetAdapter();vi.unstubAllEnvs();if(directory)rmSync(directory,{recursive:true,force:true});});
it('staging ignores production adapter and configured or explicit database paths',async()=>{
 directory=mkdtempSync(join(tmpdir(),'staging-isolation-proof-'));
 const forbidden=join(directory,'production.db');
 vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('DATA_ADAPTER','supabase');vi.stubEnv('SQLITE_PATH',forbidden);
 const adapter=getAdapter();expect(adapter).toBeInstanceOf(SqliteAdapter);
 expect(existsSync('/tmp/kipper-staging/bookings.db')).toBe(true);expect(existsSync(forbidden)).toBe(false);
 resetAdapter();const direct=new SqliteAdapter(forbidden);direct.close();expect(existsSync(forbidden)).toBe(false);
});
it('does not reuse a production singleton when staging flag changes',()=>{
 directory=mkdtempSync(join(tmpdir(),'staging-switch-proof-'));
 vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('DATA_ADAPTER','sqlite');vi.stubEnv('SQLITE_PATH',join(directory,'ordinary.db'));
 const ordinary=getAdapter();vi.stubEnv('STAGING_TEST_MODE','true');const staging=getAdapter();expect(staging).not.toBe(ordinary);
});
