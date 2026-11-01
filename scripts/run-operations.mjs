import {pathToFileURL} from 'node:url';
/** No destination override, redirects, retries, guest data or response-body logging. */
export async function runOperationsWorker({secret,fetcher=fetch,timeoutMs=55_000}={}){
 if(process.env.SITE_PREVIEW_MODE==='true'||process.env.STAGING_TEST_MODE==='true')return {ok:false,status:'disabled'};
 if(typeof secret!=='string'||!/^[-_A-Za-z0-9]{43,128}$/.test(secret))return {ok:false,status:'configuration-error'};
 const controller=new AbortController();let reader;let timeout;
 const work=async()=>{
  try{
   const response=await fetcher('https://innkipper.com/api/operations/run',{method:'POST',redirect:'error',headers:{authorization:`Bearer ${secret}`},signal:controller.signal});
   if(!response.ok)return {ok:false,status:'http-error'};
   reader=response.body?.getReader();if(!reader)return {ok:false,status:'invalid-response'};
   const chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){void reader.cancel().catch(()=>{});return {ok:false,status:'invalid-response'};}chunks.push(value);}
   const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   return value?.status==='completed'&&['holds','outbox','alerts'].every(name=>value[name]?.status==='completed')?{ok:true,status:'completed'}:{ok:false,status:'review-required'};
  }catch{return {ok:false,status:'request-failed'};}
 };
 try{return await Promise.race([work(),new Promise(resolve=>{timeout=setTimeout(()=>{controller.abort();void reader?.cancel().catch(()=>{});resolve({ok:false,status:'deadline'});},Math.max(1,Math.min(55_000,timeoutMs)));})]);}
 finally{clearTimeout(timeout);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const emergency=setTimeout(()=>{console.log(JSON.stringify({ok:false,status:'deadline'}));process.exit(1);},60_000);
 const result=await runOperationsWorker({secret:process.env.OPERATIONS_WORKER_SECRET});clearTimeout(emergency);console.log(JSON.stringify(result));process.exit(result.ok?0:1);
}
