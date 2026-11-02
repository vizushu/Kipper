import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SqliteAdapter} from '../src/lib/db/sqlite';
it('actual separate processes serialize incoming blocks versus a direct hold without silent conflicts',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-race-')),file=path.join(dir,'db');const a=new SqliteAdapter(file);
 const lease=await a.beginCalendarSync('casa-pacifica','airbnb-primary');await a.completeCalendarSync({propertyId:'casa-pacifica',sourceId:'airbnb-primary',leaseId:lease!.leaseId,events:[{uidHash:'b'.repeat(64),from:'2027-01-01',to:'2027-01-02'}],nowISO:new Date().toISOString()});
 const children=['import','hold'].map(action=>spawn(process.execPath,[path.resolve('node_modules/vite-node/vite-node.mjs'),path.resolve('tests/fixtures/calendar-race.ts'),file,action],{stdio:['pipe','pipe','pipe']}));
 try{
  const outputs=children.map(child=>{let out='',err='';let readyResolve:()=>void;const ready=new Promise<void>(resolve=>readyResolve=resolve);child.stdout.on('data',data=>{out+=String(data);if(out.includes('READY\n'))readyResolve();});child.stderr.on('data',data=>err+=String(data));const result=new Promise<string>((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error(err)));});return{ready,result};});
  await Promise.all(outputs.map(o=>o.ready));children.forEach(c=>c.stdin.write('GO\n'));const result=await Promise.all(outputs.map(o=>o.result));expect(result[0]).toContain('"imported":true');
  const bookings=await a.listBookings();const status=await a.getCalendarStatus('casa-pacifica','airbnb-primary');expect(await a.listBlocks('casa-pacifica')).toHaveLength(1);
  if(result[1].includes('HELD')){expect(bookings).toHaveLength(1);expect(status?.conflictCount).toBe(1);await a.attachPaymentIntent(bookings[0].id,'pi_race_fixture');expect(await a.confirmBookingPayment(bookings[0].id,'pi_race_fixture',new Date().toISOString())).toBeNull();}
  else {expect(result[1]).toContain('UNAVAILABLE');expect(bookings).toHaveLength(0);expect(status?.conflictCount).toBe(0);}
 }finally{children.forEach(c=>c.kill());a.close();fs.rmSync(dir,{recursive:true,force:true});}
},20_000);
