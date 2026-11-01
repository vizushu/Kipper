import {createHash} from 'node:crypto';
import {getAdapter} from '@/lib/db';
import {dispatchOperatorAlerts,operatorAlertWorkerAuthorized} from '@/lib/operator-alerts';
import {apiError,json} from '../../_helpers';
export async function POST(req:Request){
 if(!operatorAlertWorkerAuthorized(req))return apiError('NOT_FOUND','Not found',404);
 try{const adapter=getAdapter();const budget=await adapter.consumeRateLimit(createHash('sha256').update('operator-alert-dispatch:v1').digest('hex'),12,900,new Date().toISOString());if(!budget.allowed)return apiError('RATE_LIMITED','Try later.',429);return json(await dispatchOperatorAlerts(adapter));}catch{return apiError('ALERT_DISPATCH_UNAVAILABLE','Operator alert dispatch needs review.',503);}
}
