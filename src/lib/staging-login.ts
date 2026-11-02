import Database from 'better-sqlite3';
import {mkdirSync,lstatSync} from 'node:fs';
import {timingSafeEqual,createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createStagingSession,isStagingTest,stagingConfigured,stagingOrigin,STAGING_COOKIE,STAGING_SESSION_SECONDS} from './staging-session';
export function consumeStagingLoginAttempt(now=Date.now()):boolean {
  if(lstatSync('/tmp/kipper-staging',{throwIfNoEntry:false})?.isSymbolicLink()||lstatSync('/tmp/kipper-staging/auth.db',{throwIfNoEntry:false})?.isSymbolicLink())throw new Error('Unsafe staging auth path');
  mkdirSync('/tmp/kipper-staging',{recursive:true,mode:0o700});
  const db=new Database('/tmp/kipper-staging/auth.db');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS login_limit (id INTEGER PRIMARY KEY CHECK(id=1), started INTEGER NOT NULL, attempts INTEGER NOT NULL)');
    return db.transaction(()=>{
      const row=db.prepare('SELECT started,attempts FROM login_limit WHERE id=1').get() as {started:number;attempts:number}|undefined;
      if(!row||now-row.started>=15*60*1000){db.prepare('INSERT OR REPLACE INTO login_limit VALUES (1,?,1)').run(now);return true;}
      if(row.attempts>=20)return false;
      db.prepare('UPDATE login_limit SET attempts=attempts+1 WHERE id=1').run();return true;
    }).immediate();
  } finally {db.close();}
}
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'same-origin'};
function response(message:string,status:number){return new NextResponse(message,{status,headers});}
export async function stagingLogin(req:Request,logout=false):Promise<NextResponse>{
  if(!isStagingTest())return response('Not found.',404);
  if(!stagingConfigured())return response('Staging access is unavailable.',503);
  // Origin is mandatory and HTTPS is mandatory: no forwarded-header origin trust.
  if(req.headers.get('origin')!==stagingOrigin())return response('Invalid origin.',403);
  if(logout){const result=NextResponse.redirect(new URL('/staging/login',stagingOrigin()!),303);for(const [k,v] of Object.entries(headers))result.headers.set(k,v);result.cookies.set(STAGING_COOKIE,'',{secure:true,httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return result;}
  try {
    if(!consumeStagingLoginAttempt())return response('Sign-in temporarily unavailable.',429);
    if(req.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded')return response('Invalid sign-in.',400);
    const reader=req.body?.getReader();if(!reader)return response('Invalid sign-in.',400);
    let size=0;const chunks:Uint8Array[]=[];
    // Bound streamed input even when Content-Length is omitted or false.
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;void reader.cancel();},5000);
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){void reader.cancel();return response('Invalid sign-in.',413);}chunks.push(value);}}finally{clearTimeout(timer);}
    if(timedOut)return response('Invalid sign-in.',408);
    const password=new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('password')??'';
    const digest=(value:string)=>createHash('sha256').update(value).digest();
    if(!timingSafeEqual(digest(password),digest(process.env.STAGING_ACCESS_PASSWORD!)))return response('Invalid sign-in.',401);
    const result=NextResponse.redirect(new URL('/',stagingOrigin()!),303);for(const [k,v] of Object.entries(headers))result.headers.set(k,v);
    result.cookies.set(STAGING_COOKIE,await createStagingSession(),{secure:true,httpOnly:true,sameSite:'strict',path:'/',maxAge:STAGING_SESSION_SECONDS});return result;
  }catch{return response('Staging access is unavailable.',503);}
}
