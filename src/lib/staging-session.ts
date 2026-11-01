/** Edge-compatible perimeter. No booking authorization or provider credentials here. */
export const STAGING_COOKIE = '__Host-kipper_staging';
export const STAGING_SESSION_SECONDS = 30 * 60;
export function isStagingTest(): boolean { return process.env.STAGING_TEST_MODE === 'true'; }
export function stagingOrigin(): string | null {
  try {const url=new URL(process.env.STAGING_ORIGIN??'');return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.origin:null;}catch{return null;}
}
export function stagingConfigured(): boolean {
  return !!stagingOrigin() && /^[A-Za-z0-9_-]{43,128}$/.test(process.env.STAGING_SESSION_SECRET ?? '') &&
    /^[A-Za-z0-9_-]{32,128}$/.test(process.env.STAGING_ACCESS_PASSWORD ?? '') &&
    process.env.STAGING_SESSION_SECRET !== process.env.STAGING_ACCESS_PASSWORD;
}
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(value: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)); }
async function key() {
  if (!stagingConfigured()) throw new Error('Staging access is not configured.');
  return crypto.subtle.importKey('raw',new TextEncoder().encode(process.env.STAGING_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function createStagingSession(now = Date.now()): Promise<string> {
  const payload=encode(new TextEncoder().encode(JSON.stringify({purpose:'kipper-staging-test',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+STAGING_SESSION_SECONDS,nonce:crypto.randomUUID()})));
  return `${payload}.${encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(payload))))}`;
}
export async function validStagingSession(token: string | undefined, now = Date.now()): Promise<boolean> {
  if(!stagingConfigured()||!token||token.length>512||!/^[-\w]+\.[-\w]+$/.test(token))return false;
  try {
    const [payload,signature]=token.split('.');
    if(!await crypto.subtle.verify('HMAC',await key(),decode(signature),new TextEncoder().encode(payload)))return false;
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(payload))),seconds=Math.floor(now/1000);
    return value.purpose==='kipper-staging-test'&&Number.isSafeInteger(value.iat)&&Number.isSafeInteger(value.exp)&&value.iat<=seconds&&value.exp>seconds&&value.exp-value.iat===STAGING_SESSION_SECONDS&&typeof value.nonce==='string';
  } catch { return false; }
}
