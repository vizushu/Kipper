import type Database from 'better-sqlite3';
import {rateLimitWindow,securityTimestamp,validateAdminSession,validateSecurityHash,type AdminSession,type RateLimitResult,type SecurityStore} from './security-store';
type DB=InstanceType<typeof Database>;
export const SECURITY_SCHEMA=`
CREATE TABLE IF NOT EXISTS security_rate_limits (
 key_hash TEXT NOT NULL,window_seconds INTEGER NOT NULL,window_start_ms INTEGER NOT NULL,
 expires_at_ms INTEGER NOT NULL,count INTEGER NOT NULL,
 PRIMARY KEY(key_hash,window_seconds,window_start_ms)
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry ON security_rate_limits(expires_at_ms);
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash TEXT PRIMARY KEY,secret_version TEXT NOT NULL,created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
`;
interface SessionRow {token_hash:string;secret_version:string;created_at:string;expires_at:string;revoked_at:string|null}
const session=(row:SessionRow):AdminSession=>({tokenHash:row.token_hash,secretVersion:row.secret_version,createdAt:row.created_at,expiresAt:row.expires_at,revokedAt:row.revoked_at});
export class SqliteSecurityStore implements SecurityStore {
 constructor(private db:DB){db.exec(SECURITY_SCHEMA);}
 private cleanupSessions(nowISO:string) {
  this.db.prepare('DELETE FROM admin_sessions WHERE token_hash IN (SELECT token_hash FROM admin_sessions WHERE expires_at<=? ORDER BY expires_at LIMIT 500)').run(nowISO);
 }
 async consumeRateLimit(keyHash:string,limit:number,windowSeconds:number,nowISO=new Date().toISOString()):Promise<RateLimitResult> {
  const time=rateLimitWindow(keyHash,limit,windowSeconds,nowISO);
  return this.db.transaction(()=>{
   this.db.prepare('DELETE FROM security_rate_limits WHERE rowid IN (SELECT rowid FROM security_rate_limits WHERE expires_at_ms<=? ORDER BY expires_at_ms LIMIT 500)').run(time.now);
   this.db.prepare(`INSERT INTO security_rate_limits(key_hash,window_seconds,window_start_ms,expires_at_ms,count) VALUES(?,?,?,?,1)
    ON CONFLICT(key_hash,window_seconds,window_start_ms) DO UPDATE SET count=min(security_rate_limits.count+1,10001)`).run(keyHash,windowSeconds,time.start,time.expires);
   const {count}=this.db.prepare('SELECT count FROM security_rate_limits WHERE key_hash=? AND window_seconds=? AND window_start_ms=?').get(keyHash,windowSeconds,time.start) as {count:number};
   return {allowed:count<=limit,retryAfterSeconds:count<=limit?0:Math.max(1,Math.ceil((time.expires-time.now)/1000))};
  }).immediate();
 }
 async createAdminSession(value:AdminSession):Promise<void> {
  validateAdminSession(value);
  this.db.transaction(()=>{
   // Never upsert: possession of a guessed hash must not extend/replace a session.
   this.db.prepare('INSERT INTO admin_sessions(token_hash,secret_version,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?)').run(value.tokenHash,value.secretVersion,value.createdAt,value.expiresAt,value.revokedAt);
   this.cleanupSessions(new Date().toISOString());
  }).immediate();
 }
 async getAdminSession(tokenHash:string):Promise<AdminSession|null> {
  validateSecurityHash(tokenHash);
  return this.db.transaction(()=>{
   const now=new Date().toISOString();this.cleanupSessions(now);
   const row=this.db.prepare('SELECT * FROM admin_sessions WHERE token_hash=? AND expires_at>?').get(tokenHash,now) as SessionRow|undefined;
   return row?session(row):null;
  }).immediate();
 }
 async revokeAdminSession(tokenHash:string,nowISO:string):Promise<boolean> {
  validateSecurityHash(tokenHash);securityTimestamp(nowISO);
  return this.db.transaction(()=>{
   this.cleanupSessions(nowISO);
   const row=this.db.prepare('SELECT * FROM admin_sessions WHERE token_hash=? AND expires_at>?').get(tokenHash,nowISO) as SessionRow|undefined;
   if(!row)return false;
   if(nowISO<row.created_at)throw new Error('Admin session revoke time precedes creation.');
   if(row.revoked_at===null)this.db.prepare('UPDATE admin_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(nowISO,tokenHash);
   return true;
  }).immediate();
 }
}
