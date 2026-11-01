/** Private operational alerts. No guest data, feed URLs or provider credentials. */
export type OperatorAlertKind='calendar_conflict'|'payment_exception'|'calendar_health'|'payment_setup';
export type OperatorAlertStatus='pending'|'processing'|'sent'|'simulated'|'suppressed'|'dead';
export interface OperatorAlertEnvelope {from:string;to:string;subject:string;text:string}
export interface OperatorAlert {
 id:string;kind:OperatorAlertKind;incidentId:string;episode:number;paymentMode:'test'|'live';
 dedupeKey:string;status:OperatorAlertStatus;attempts:number;createdAt:string;nextAttemptAt:string;
 firstAttemptAt?:string;leaseToken?:string;leaseUntil?:string;lastError?:string;envelope?:OperatorAlertEnvelope;
}
export interface OperatorAlertReadiness {ready:boolean;lastSuccessAt:string|null;deadCount:number;overdueCount:number}
export interface PaymentSetupFailure {id:string;bookingId:string;paymentIntentId:string;createdAt:string;status:'open'|'reviewed';reviewNote?:string;reviewedAt?:string;reviewKey?:string}
export interface OperatorAlertStore {
 recordCalendarHealthAlert(propertyId:string,healthy:boolean,nowISO:string):Promise<void>;
 completeOperatorAlertRun(nowISO:string):Promise<void>;
 getOperatorAlertReadiness(nowISO:string):Promise<OperatorAlertReadiness>;
 recordPaymentSetupFailure(bookingId:string,paymentIntentId:string,nowISO:string):Promise<{id:string;created:boolean}>;
 reviewPaymentSetupFailure(id:string,note:string,key:string,nowISO:string):Promise<PaymentSetupFailure|null>;
 listPaymentSetupFailures():Promise<PaymentSetupFailure[]>;
 listOperatorAlerts():Promise<OperatorAlert[]>;
 claimOperatorAlerts(nowISO:string,limit:number,alertId?:string):Promise<OperatorAlert[]>;
 prepareOperatorAlertMessage(id:string,leaseToken:string,envelope:OperatorAlertEnvelope,nowISO:string):Promise<OperatorAlertEnvelope|null>;
 finishOperatorAlert(id:string,leaseToken:string,outcome:'sent'|'simulated'|'failed',nowISO:string):Promise<boolean>;
}
