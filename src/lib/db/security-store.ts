/** Private persistence contracts. Inputs are hashes, never raw tokens, addresses or IPs. */
export interface RateLimitResult { allowed:boolean; retryAfterSeconds:number }
export interface AdminSession {
  tokenHash:string; secretVersion:string; createdAt:string; expiresAt:string; revokedAt:string|null;
}
export interface AdminSessionStore {
  createAdminSession(session:AdminSession):Promise<void>;
  getAdminSession(tokenHash:string):Promise<AdminSession|null>;
  revokeAdminSession(tokenHash:string,nowISO:string):Promise<boolean>;
}
export interface SecurityStore extends AdminSessionStore {
  consumeRateLimit(keyHash:string,limit:number,windowSeconds:number,nowISO?:string):Promise<RateLimitResult>;
}
export const ADMIN_SESSION_MAX_TTL_MS = 8 * 60 * 60 * 1000;
export function validateSecurityHash(value:string):void {
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw new Error('Security store requires a SHA256 hash.');
}
export function securityTimestamp(value:string):number {
  const ms=typeof value==='string'?Date.parse(value):NaN;
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value)throw new Error('Security timestamp must be a canonical ISO instant.');
  return ms;
}
export function rateLimitWindow(keyHash:string,limit:number,windowSeconds:number,nowISO=new Date().toISOString()) {
  validateSecurityHash(keyHash);
  if(!Number.isInteger(limit)||limit<1||limit>10000||!Number.isInteger(windowSeconds)||windowSeconds<1||windowSeconds>86400)throw new Error('Invalid bounded rate limit.');
  const now=securityTimestamp(nowISO),duration=windowSeconds*1000;
  const start=Math.floor(now/duration)*duration;
  return {now,start,expires:start+duration};
}
export function validateAdminSession(session:AdminSession):void {
  validateSecurityHash(session.tokenHash);validateSecurityHash(session.secretVersion);
  const created=securityTimestamp(session.createdAt),expires=securityTimestamp(session.expiresAt);
  if(expires<=created||expires-created>ADMIN_SESSION_MAX_TTL_MS)throw new Error('Admin session expiry must be within eight hours of creation.');
  if(session.revokedAt!==null&&securityTimestamp(session.revokedAt)<created)throw new Error('Admin session revoke time precedes creation.');
}
