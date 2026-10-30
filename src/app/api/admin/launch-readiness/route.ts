import type {NextRequest} from 'next/server';
import {getLaunchReadiness} from '@/lib/launch-readiness';
import {json,requireAdmin} from '../../_helpers';
export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;return json(getLaunchReadiness());}
