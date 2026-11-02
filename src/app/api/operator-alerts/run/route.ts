import {boundedBody} from '@/lib/email-webhook';
import {operatorRehearsalAuthorized} from '@/lib/operator-rehearsal-config';
import {runOperatorRehearsal,operatorRehearsalStatus} from '@/lib/operator-rehearsal';
import {createHash} from 'node:crypto';
import {getAdapter} from '@/lib/db';
import {dispatchOperatorAlerts,operatorAlertWorkerAuthorized} from '@/lib/operator-alerts';
import {apiError,json} from '../../_helpers';
export async function POST(req:Request){
 if(!operatorAlertWorkerAuthorized(req)&&!operatorRehearsalAuthorized(req,true))return apiError('NOT_FOUND','Not found',404);
 let action:unknown;try{const raw=(await boundedBody(req,128)).toString('utf8');const body=raw?JSON.parse(raw):{};if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>k!=='action'))return apiError('INVALID_REQUEST','Invalid request',400);action=body.action;}catch{return apiError('INVALID_REQUEST','Invalid request',400);}
 if(action==='operator-rehearsal'||action==='operator-rehearsal-status'){const config=operatorRehearsalAuthorized(req,action==='operator-rehearsal-status');if(!config)return apiError('NOT_FOUND','Not found',404);try{return json(await(action==='operator-rehearsal-status'?operatorRehearsalStatus(config):runOperatorRehearsal(config)));}catch{return apiError('REHEARSAL_UNAVAILABLE','Rehearsal needs review.',503);}}
 if(action!==undefined)return apiError('INVALID_REQUEST','Invalid request',400);
 if(!operatorAlertWorkerAuthorized(req))return apiError('NOT_FOUND','Not found',404);
 try{const adapter=getAdapter();const budget=await adapter.consumeRateLimit(createHash('sha256').update('operator-alert-dispatch:v1').digest('hex'),12,900,new Date().toISOString());if(!budget.allowed)return apiError('RATE_LIMITED','Try later.',429);return json(await dispatchOperatorAlerts(adapter));}catch{return apiError('ALERT_DISPATCH_UNAVAILABLE','Operator alert dispatch needs review.',503);}
}
