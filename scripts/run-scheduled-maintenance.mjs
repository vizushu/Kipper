import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const activeChildren=new Set();
const jobs=Object.freeze({
 calendar:{file:fileURLToPath(new URL('./sync-calendar.mjs',import.meta.url)),deadlineMs:30_000,envNames:['CALENDAR_WORKER_SECRET']},
 operations:{file:fileURLToPath(new URL('./run-operations.mjs',import.meta.url)),deadlineMs:60_000,envNames:['OPERATIONS_WORKER_SECRET','SITE_PREVIEW_MODE','STAGING_TEST_MODE']},
});
/** Fixed children, no shell, no child output, and only each purpose's credential. */
export function runMaintenanceChild(name,{spawnChild=spawn,env=process.env}={}){
 const job=jobs[name];if(!job)return Promise.resolve('failed');
 return new Promise(resolve=>{
  let child,timer,expired=false,settled=false;
  const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};
  try{
   const childEnv=Object.fromEntries(job.envNames.filter(key=>env[key]!==undefined).map(key=>[key,env[key]]));
   child=spawnChild(process.execPath,[job.file],{shell:false,stdio:'ignore',env:childEnv});
   activeChildren.add(child);
   child.once('error',()=>finish('failed'));
   child.once('close',code=>{activeChildren.delete(child);finish(expired?'deadline':code===0?'completed':'failed');});
   timer=setTimeout(()=>{expired=true;try{child.kill('SIGKILL');}catch{finish('failed');}},job.deadlineMs);
  }catch{finish('failed');}
 });
}
/** Calendar failure never suppresses operations; neither child is retried. */
export async function runScheduledMaintenance({runChild=runMaintenanceChild}={}){
 const safe=async name=>{try{const result=await runChild(name);return ['completed','failed','deadline'].includes(result)?result:'failed';}catch{return 'failed';}};
 const calendar=await safe('calendar');
 const operations=await safe('operations');
 return {ok:calendar==='completed'&&operations==='completed',calendar,operations};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const emergency=setTimeout(()=>{for(const child of activeChildren){try{child.kill('SIGKILL');}catch{}}console.log(JSON.stringify({ok:false,calendar:'unknown',operations:'unknown',status:'deadline'}));process.exit(1);},95_000);
 const result=await runScheduledMaintenance();clearTimeout(emergency);console.log(JSON.stringify(result));process.exit(result.ok?0:1);
}
