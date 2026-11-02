import {afterEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/operator-alerts/run/route';
import {GET} from '../src/app/api/admin/operator-alerts/route';
afterEach(()=>vi.unstubAllEnvs());
describe('operator alert authorization boundaries',()=>{
 it('public preview blocks delivery despite contradictory flags and credentials',async()=>{vi.stubEnv('SITE_PREVIEW_MODE','true');for(const flag of ['OPERATOR_ALERTS_APPROVED','OPERATOR_ALERT_DELIVERY_QA_APPROVED','EMAIL_LIVE_APPROVED'])vi.stubEnv(flag,'true');vi.stubEnv('EMAIL_DELIVERY_MODE','live');vi.stubEnv('RESEND_API_KEY','synthetic');vi.stubEnv('BOOKING_FROM_EMAIL','sender@example.test');vi.stubEnv('HOST_NOTIFY_EMAIL','operator@example.test');vi.stubEnv('OPERATOR_ALERT_WORKER_SECRET','a'.repeat(43));const response=await POST(new Request('https://innkipper.com/api/operator-alerts/run',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(43)}}));expect(response.status).toBe(404);expect(response.headers.get('cache-control')).toContain('no-store');});
 it('preview admin cannot read internal incidents even with synthetic secret',async()=>{vi.stubEnv('SITE_PREVIEW_MODE','true');vi.stubEnv('ADMIN_SECRET','synthetic');const response=await GET(new NextRequest('https://innkipper.com/api/admin/operator-alerts',{headers:{'x-admin-secret':'synthetic'}}));expect(response.status).toBe(401);});
});
