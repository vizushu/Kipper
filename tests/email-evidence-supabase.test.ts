import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {SupabaseAdapter} from '../src/lib/db/supabase';
import type {EmailProviderEvent} from '../src/lib/db/email-evidence';
const fetcher=vi.fn();let adapter:SupabaseAdapter;
const now='2026-11-01T01:20:00.000Z';
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://database.example.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-service-key');vi.stubGlobal('fetch',fetcher);fetcher.mockReset();adapter=new SupabaseAdapter();});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function response(value:unknown){fetcher.mockResolvedValueOnce(new Response(JSON.stringify(value)));}
function last(){const [url,options]=fetcher.mock.calls.at(-1)!;return {url,options,body:JSON.parse(options.body)};}
it('records acceptance with exact job lease/provider ID through one atomic RPC',async()=>{
 response(true);expect(await adapter.recordOutboxAcceptance('mail_fixture','lease_fixture','11111111-2222-3333-4444-555555555555',now)).toBe(true);
 expect(last().url).toContain('/rpc/record_outbox_acceptance');
 expect(last().body).toEqual({p_job_id:'mail_fixture',p_lease_token:'lease_fixture',p_provider_message_id:'11111111-2222-3333-4444-555555555555',p_now:now});
 response(false);expect(await adapter.recordOutboxAcceptance('mail_fixture','expired_lease','11111111-2222-3333-4444-555555555555',now)).toBe(false);
});
it.each(['recorded','duplicate','unknown','conflict'] as const)('preserves atomic event result %s without additional mutation',async result=>{
 const event:EmailProviderEvent={eventId:'msg_fixture',providerMessageId:'11111111-2222-3333-4444-555555555555',type:'delivered',occurredAt:now,receivedAt:now,payloadHash:'a'.repeat(64)};
 response(result);expect(await adapter.recordEmailProviderEvent(event)).toBe(result);
 expect(last().url).toContain('/rpc/record_email_provider_event');expect(last().body).toEqual({p_event:event});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('returns camel-case redacted evidence only and handles absent evidence',async()=>{
 const evidence={providerMessageId:'11111111-2222-3333-4444-555555555555',jobId:'mail_fixture',acceptedAt:now,status:'delivered',statusAt:now};
 response(evidence);expect(await adapter.getEmailDeliveryEvidence('mail_fixture')).toEqual(evidence);
 expect(last().url).toContain('/rpc/get_email_delivery_evidence');expect(last().body).toEqual({p_job_id:'mail_fixture'});
 response(null);expect(await adapter.getEmailDeliveryEvidence('mail_missing')).toBeNull();
});
it('fails visibly when migration is absent instead of pretending evidence was stored',async()=>{
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({message:'RPC not installed'}),{status:404}));
 await expect(adapter.recordOutboxAcceptance('mail_fixture','lease_fixture','11111111-2222-3333-4444-555555555555',now)).rejects.toThrow('RPC not installed');
});

it('invalid acceptance and malformed event fail closed without an RPC',async()=>{
 expect(await adapter.recordOutboxAcceptance('mail_fixture','lease_fixture','malformed',now)).toBe(false);
 expect(await adapter.recordEmailProviderEvent({eventId:'msg_fixture',providerMessageId:'malformed',type:'delivered',occurredAt:now,receivedAt:now,payloadHash:'a'.repeat(64)})).toBe('conflict');
 expect(fetcher).not.toHaveBeenCalled();
});
