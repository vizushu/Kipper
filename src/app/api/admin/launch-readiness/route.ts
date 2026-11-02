import type {NextRequest} from 'next/server';
import {getRuntimeLaunchReadiness} from '@/lib/launch-readiness';
import {getAdapter} from '@/lib/db';
import {json,requireAdmin} from '../../_helpers';
export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;return json(await getRuntimeLaunchReadiness(getAdapter()));}
