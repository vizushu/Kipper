import {PaymentVerificationError} from './payment-verification';
/** All anonymous Stripe callbacks have a strict bound; the historical helper name is retained. No JSON parsing before signature verification. */
export async function stagingStripeBody(req:Request):Promise<string>{
 const limit=64*1024,length=req.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))throw new PaymentVerificationError('Webhook payload too large.',413);
 if(!req.body)return '';
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0,timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});},5000);
 try{
  while(true){const {done,value}=await reader.read();if(timedOut)throw new PaymentVerificationError('Webhook body timed out.',408);if(done)break;size+=value.byteLength;if(size>limit){void reader.cancel().catch(()=>{});throw new PaymentVerificationError('Webhook payload too large.',413);}chunks.push(value);}
  return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 }catch(error){if(error instanceof PaymentVerificationError)throw error;throw new PaymentVerificationError('Invalid webhook body.');}
 finally{clearTimeout(timer);reader.releaseLock();}
}
