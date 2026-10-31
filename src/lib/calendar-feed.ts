/** Conservative Airbnb iCalendar transport/parser. No private feed metadata is returned.
 * A feed is an advisory snapshot, not a cross-channel inventory lock.
 */
import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request} from 'node:https';
import type {LookupFunction} from 'node:net';
import {addDays,isValidDateStr} from './dates';

export interface CalendarEvent {uidHash:string;from:string;to:string}
export interface ParsedCalendar {events:CalendarEvent[];cancelledUidHashes:string[];ignoredOwnEvents:number}
export const CALENDAR_MAX_BYTES=1024*1024;
export const CALENDAR_MAX_EVENTS=5000;
const TIMEOUT_MS=10_000;
const FAILURE='Calendar synchronization could not be verified. Keep existing blocks and require manual review.';
function invalid():never {throw new Error(FAILURE);}
function day(value:string):string {
 if(!/^\d{8}$/.test(value))invalid();
 const result=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
 if(!isValidDateStr(result))invalid();return result;
}

export function parseAirbnbCalendar(text:string,propertyId:string):ParsedCalendar {
 if(!propertyId||propertyId.length>200||Buffer.byteLength(text,'utf8')>CALENDAR_MAX_BYTES||text.includes('\0'))invalid();
 const unfolded:string[]=[];
 for(const line of text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n')){
  if(/^[ \t]/.test(line)){if(!unfolded.length)invalid();unfolded[unfolded.length-1]+=line.slice(1);}
  else unfolded.push(line);
 }
 const lines=unfolded.filter(line=>line!=='');
 if(lines[0]!=='BEGIN:VCALENDAR'||lines.at(-1)!=='END:VCALENDAR')invalid();
 const events=new Map<string,CalendarEvent>();const cancelled=new Set<string>();
 const seen=new Map<string,string>();let ignoredOwnEvents=0,count=0,inEvent=false,version=false;
 let uid:string|undefined,from:string|undefined,to:string|undefined,status:string|undefined;
 for(const line of lines.slice(1,-1)){
  if(line==='BEGIN:VEVENT'){
   if(inEvent||++count>CALENDAR_MAX_EVENTS)invalid();
   inEvent=true;uid=from=to=status=undefined;continue;
  }
  if(line==='END:VEVENT'){
   if(!inEvent||!uid)invalid();
   inEvent=false;
   if(status!=='CANCELLED'&&!from)invalid();
   if(to&&!from)invalid();
   const end=from?(to??addDays(from,1)):undefined;
   if(from&&(!end||!isValidDateStr(end)||end<=from))invalid();
   const signature=JSON.stringify([from,end,status==='CANCELLED']);
   if(seen.has(uid)){if(seen.get(uid)!==signature)invalid();continue;}
   seen.set(uid,signature);
   // Our outbound UID survives many round trips; rewritten mirrors still need operator review.
   if(uid.toLowerCase().endsWith('@casa-pacifica.direct')){ignoredOwnEvents++;continue;}
   const uidHash=createHash('sha256').update(JSON.stringify([propertyId,uid])).digest('hex');
   if(status==='CANCELLED')cancelled.add(uidHash);
   else events.set(uidHash,{uidHash,from:from!,to:end!});
   continue;
  }
  if(line.startsWith('BEGIN:')||line.startsWith('END:'))invalid();
  const colon=line.indexOf(':');if(colon<1)invalid();
  const key=line.slice(0,colon),value=line.slice(colon+1);
  if(!inEvent){
   if(key==='VERSION'){if(version||value!=='2.0')invalid();version=true;}
   else if(key==='METHOD'){if(value!=='PUBLISH')invalid();}
   else if(!['PRODID','CALSCALE'].includes(key)&&!key.startsWith('X-'))invalid();
   continue;
  }
  if(key==='UID'){if(uid!==undefined||!value||value.length>1024)invalid();uid=value;}
  else if(key==='DTSTART;VALUE=DATE'){if(from!==undefined)invalid();from=day(value);}
  else if(key==='DTEND;VALUE=DATE'){if(to!==undefined)invalid();to=day(value);}
  else if(key==='STATUS'){if(status!==undefined||!['CONFIRMED','TENTATIVE','CANCELLED'].includes(value))invalid();status=value;}
  else if(key==='TRANSP'){if(value!=='OPAQUE')invalid();}
  else if(['SUMMARY','DESCRIPTION','LOCATION','URL','DTSTAMP','CREATED','LAST-MODIFIED','SEQUENCE'].includes(key)||key.startsWith('X-')){/* Deliberately discard descriptive/private metadata. */}
  else invalid(); // Timed dates, TZID, recurrence and unknown semantics fail the whole snapshot.
 }
 if(inEvent||!version)invalid();
 return {events:[...events.values()].sort((a,b)=>a.uidHash.localeCompare(b.uidHash)),cancelledUidHashes:[...cancelled].sort(),ignoredOwnEvents};
}

/** Strict origin/path allowlist. The query may carry a private Airbnb key; never log it. */
export function validatedAirbnbCalendarUrl(value:string):URL {
 let url:URL;try{url=new URL(value);}catch{invalid();}
 if(value.length>4096||url.protocol!=='https:'||url.hostname!=='www.airbnb.com'||url.port&&url.port!=='443'||url.username||url.password||url.hash||!/^\/calendar\/ical\/[A-Za-z0-9_-]+\.ics$/.test(url.pathname))invalid();
 return url;
}

/** Conservative globally routable addresses only, including rejection of IPv4-in-IPv6. */
export function isPublicCalendarAddress(address:string):boolean {
 if(isIP(address)===4){
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||address==='168.63.129.16'||a===169&&b===254||a===172&&b>=16&&b<=31||a===100&&b>=64&&b<=127||a===192&&(b===168||b===0&&c===0||b===0&&c===2||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
 }
 if(isIP(address)!==6||address.includes('.')||address.includes('%'))return false;
 const halves=address.toLowerCase().split('::');
 const left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
 const parts=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left;
 const numbers=parts.map(part=>parseInt(part,16));
 if(numbers.length!==8||numbers[0]<0x2000||numbers[0]>0x3fff)return false;
 // IETF special-use, documentation, 6to4 and documentation allocation: reject conservatively.
 return !(numbers[0]===0x2001&&(numbers[1]<=0x1ff||numbers[1]===0xdb8)||numbers[0]===0x2002||numbers[0]===0x3fff);
}

export async function fetchAirbnbCalendar(value:string):Promise<string> {
 const url=validatedAirbnbCalendarUrl(value);
 const deadline=Date.now()+TIMEOUT_MS;
 let dnsTimer:ReturnType<typeof setTimeout>|undefined;
 try {
  const addresses=await Promise.race([
   lookup(url.hostname,{all:true,verbatim:true}),
   new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error(FAILURE)),TIMEOUT_MS);}),
  ]);
  clearTimeout(dnsTimer);
  if(!addresses.length||addresses.some(item=>!isPublicCalendarAddress(item.address)))invalid();
  const pinned=addresses[0];
  // Pin resolution for this TLS request. Keep the hostname/SNI and normal certificate checks.
  const pinnedLookup:LookupFunction=(_hostname,options,callback)=>{
   if(typeof options==='object'&&options.all)callback(null,[pinned]);
   else callback(null,pinned.address,pinned.family);
  };
  return await new Promise<string>((resolve,reject)=>{
   let settled=false;let timer:ReturnType<typeof setTimeout>|undefined;
   const finish=(error:boolean,result?:string)=>{
    if(settled)return;settled=true;clearTimeout(timer);
    if(error)reject(new Error(FAILURE));else resolve(result!);
   };
   const req=request(url,{method:'GET',lookup:pinnedLookup,agent:false,servername:url.hostname,
    headers:{Accept:'text/calendar','Accept-Encoding':'identity','User-Agent':'CasaPacificaCalendar/1.0'}},res=>{
     const fail=()=>{finish(true);res.destroy();req.destroy();};
     // Never follow redirects, negotiate compression, accept HTML/login pages or unbounded bodies.
     const mime=(res.headers['content-type']??'').split(';')[0].trim().toLowerCase();
     const length=res.headers['content-length'];
     if(res.statusCode!==200||!['text/calendar','application/ics','application/icalendar','text/plain'].includes(mime)||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'||length!==undefined&&(!/^\d+$/.test(length)||Number(length)>CALENDAR_MAX_BYTES)){fail();return;}
     let bytes=0;const chunks:Buffer[]=[];
     res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>CALENDAR_MAX_BYTES){fail();return;}chunks.push(Buffer.from(chunk));});
     res.on('aborted',fail);res.on('error',fail);
     res.on('end',()=>{
      if(settled)return;
      const text=Buffer.concat(chunks).toString('utf8');
      if(!res.complete||!text.startsWith('BEGIN:VCALENDAR')||!text.trimEnd().endsWith('END:VCALENDAR')||text.includes('\0')){fail();return;}
      finish(false,text);
     });
    });
   req.on('error',()=>finish(true));
   timer=setTimeout(()=>{finish(true);req.destroy();},Math.max(1,deadline-Date.now()));
   req.end();
  });
 } catch {clearTimeout(dnsTimer);throw new Error(FAILURE);}
}
