import {expect,it} from 'vitest';
import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SqliteAdapter} from '../src/lib/db/sqlite';
it('two actual processes racing for one home cannot both reserve',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kipper-race-'));const file=path.join(dir,'db.sqlite');const adapter=new SqliteAdapter(file);
 const children=[0,1].map(i=>spawn(process.execPath,[path.resolve('node_modules/vite-node/vite-node.mjs'),path.resolve('tests/fixtures/race-create.ts'),file,`process-${i}`],{stdio:['pipe','pipe','pipe']}));
 try{
  const outputs=children.map(child=>{let out='';let err='';let readyResolve:()=>void;const ready=new Promise<void>(resolve=>readyResolve=resolve);child.stdout.on('data',data=>{out+=String(data);if(out.includes('READY\n'))readyResolve();});child.stderr.on('data',data=>err+=String(data));const result=new Promise<string>((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error(err)));});return{ready,result};});
  await Promise.all(outputs.map(o=>o.ready));children.forEach(c=>c.stdin.write('GO\n'));
  const results=(await Promise.all(outputs.map(o=>o.result))).map(output=>JSON.parse(output.trim().split('\n').at(-1)!));
  expect(results.filter(r=>r.id)).toHaveLength(1);expect(results.filter(r=>r.code==='UNAVAILABLE')).toHaveLength(1);expect(await adapter.listBookings()).toHaveLength(1);
 }finally{children.forEach(c=>c.kill());adapter.close();fs.rmSync(dir,{recursive:true,force:true});}
},20000);
