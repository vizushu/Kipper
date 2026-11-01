import {NextRequest,NextResponse} from 'next/server';
import {isStagingTest,stagingConfigured,stagingOrigin,STAGING_COOKIE,validStagingSession} from './lib/staging-session';
function protect(response:NextResponse):NextResponse {
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('X-Content-Type-Options','nosniff');
  return response;
}
export async function middleware(req:NextRequest) {
  if(!isStagingTest())return NextResponse.next();
  const path=req.nextUrl.pathname;
  // No public bundles, photo/image proxy, source maps or arbitrary health-prefix bypass.
  if(path==='/api/staging/health'&&req.method==='GET')return protect(NextResponse.json({ok:true,mode:'isolated-test'}));
  if(path==='/robots.txt'&&req.method==='GET')return protect(new NextResponse('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}}));
  if(path==='/sw.js'||path==='/manifest.webmanifest')return protect(new NextResponse(null,{status:404}));
  if(!stagingConfigured())return protect(new NextResponse('Staging access is unavailable.',{status:503}));
  if(path==='/api/webhooks/stripe'&&req.method==='POST')return protect(NextResponse.next());
  if(path==='/staging/login'&&req.method==='GET')return protect(new NextResponse('<!doctype html><html><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width"><title>Private test site</title><body><h1>Private synthetic booking test</h1><p>No real reservations. Test cards only.</p><form method="post" action="/api/staging/login"><label>Staging password <input type="password" name="password" required maxlength="128" autocomplete="current-password"></label><button>Sign in</button></form></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}}));
  if((path==='/api/staging/login'||path==='/api/staging/logout')&&req.method==='POST')return protect(NextResponse.next());
  if(await validStagingSession(req.cookies.get(STAGING_COOKIE)?.value)){
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.get('origin')!==stagingOrigin())return protect(NextResponse.json({error:'Invalid origin.'},{status:403}));
    if(['/contact','/policies/sms-terms','/policies/sms-privacy'].includes(path))return protect(new NextResponse('Synthetic staging only. External guest contact is disabled.',{headers:{'Content-Type':'text/plain'}}));
    return protect(NextResponse.next());
  }
  if(path.startsWith('/api/')||req.method!=='GET')return protect(NextResponse.json({error:'Private staging sign-in required.'},{status:401}));
  return protect(NextResponse.redirect(new URL('/staging/login',stagingOrigin()!),303));
}
export const config={matcher:['/:path*']};
