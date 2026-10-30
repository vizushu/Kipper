import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {getAdapter} from '@/lib/db';
import {apiError,json,notFound,parseBody,requireAdmin} from '../../_helpers';
const reviewSchema=z.object({id:z.string().min(1).max(200),note:z.string().trim().min(10).max(1000),idempotencyKey:z.string().min(8).max(128)});
export async function GET(req:NextRequest){
 const denied=await requireAdmin(req);if(denied)return denied;
 try{return json({cases:await getAdapter().listPaymentExceptions()});}catch{return apiError('REVIEW_UNAVAILABLE','Payment review is temporarily unavailable.',503);}
}
/** Records an operator's review only. Never issues refunds or changes a reservation. */
export async function POST(req:NextRequest){
 const denied=await requireAdmin(req);if(denied)return denied;
 const parsed=await parseBody(req,reviewSchema);if(!parsed.ok)return parsed.response;
 try{const result=await getAdapter().reviewPaymentException(parsed.data.id,parsed.data.note,parsed.data.idempotencyKey);return result?json({case:result,financialActionPerformed:false}):notFound();}
 catch{return apiError('REVIEW_NOT_RECORDED','Review was not recorded. Refresh the case before retrying; no financial action was performed.',409);}
}
