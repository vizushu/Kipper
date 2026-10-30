import type {NextRequest} from 'next/server';
import {getAdapter} from '@/lib/db';
import {runMaintenance,maintenanceSummary} from '@/lib/maintenance';
import {json,requireAdmin,apiError} from '../../_helpers';
export async function GET(req:NextRequest){const denied=requireAdmin(req);if(denied)return denied;try{return json(await maintenanceSummary(getAdapter()));}catch{return apiError('MAINTENANCE_FAILED','Maintenance status unavailable; review server health.',503);}}
export async function POST(req:NextRequest){const denied=requireAdmin(req);if(denied)return denied;try{return json(await runMaintenance(getAdapter()));}catch{return apiError('MAINTENANCE_FAILED','Maintenance step failed; review server health before retrying.',503);}}
