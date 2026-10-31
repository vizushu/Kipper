import {pathToFileURL} from 'node:url';

// No feed URL, export capability, guest data, or operator action belongs in this job.
/** @param {{secret?: string, fetcher?: typeof fetch, signal?: AbortSignal}} [options] */
export async function runCalendarSync({secret,fetcher=fetch,signal=AbortSignal.timeout(20_000)}={}) {
  if(typeof secret!=='string'||!/^[-_A-Za-z0-9]{43,128}$/.test(secret))return {ok:false,status:'configuration-error'};
  try {
    const response=await fetcher('https://innkipper.com/api/calendar/sync',{
      method:'POST',redirect:'error',signal,
      headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},
      body:JSON.stringify({action:'sync'}),
    });
    if(!response.ok)return {ok:false,status:'http-error'};
    // Consume only a bounded response; never echo provider bodies or error details.
    const reader=response.body?.getReader();if(!reader)return {ok:false,status:'invalid-response'};
    let size=0,body='';const decoder=new TextDecoder();
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return {ok:false,status:'invalid-response'};}body+=decoder.decode(value,{stream:true});}
    body+=decoder.decode();const result=JSON.parse(body);
    return result?.status==='updated'&&result.conflictCount===0
      ?{ok:true,status:'updated'}:{ok:false,status:'review-required'};
  }catch{return {ok:false,status:'request-failed'};}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const deadline=setTimeout(()=>{console.log(JSON.stringify({ok:false,status:'deadline'}));process.exit(1);},30_000);
  const result=await runCalendarSync({secret:process.env.CALENDAR_WORKER_SECRET});
  clearTimeout(deadline);console.log(JSON.stringify(result));process.exit(result.ok?0:1);
}
