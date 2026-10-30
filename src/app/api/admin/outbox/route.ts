import type {NextRequest} from 'next/server';
import {getAdapter} from '@/lib/db';
import {processOutbox} from '@/lib/outbox';
import {json,requireAdmin} from '../../_helpers';
export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const jobs=await getAdapter().listOutbox();return json({jobs:jobs.map(({payload:_payload,envelope:_envelope,leaseToken:_lease,...safe})=>safe)});}
/** Authenticated bounded drain. No cron/provider is provisioned by this implementation. */
export async function POST(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;return json(await processOutbox(getAdapter(),{limit:10}));}
