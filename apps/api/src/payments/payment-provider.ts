import type { PaymentStatus } from "@moecraft/shared";
export type ProviderPaymentRequest={paymentId:string;orderNumber:string;amount:string;currency:string;expiresAt:string};
export type ProviderPaymentResult={providerPaymentId:string;status:PaymentStatus;checkoutUrl:string|null};
export type ProviderWebhookEvent={eventId:string;providerPaymentId:string;status:"SUCCEEDED"|"FAILED"|"CANCELLED";amount:string;currency:string;occurredAt:string};
export interface PaymentProvider {
  create(request:ProviderPaymentRequest):Promise<ProviderPaymentResult>;
  query(providerPaymentId:string):Promise<ProviderPaymentResult>;
  close(providerPaymentId:string):Promise<ProviderPaymentResult>;
  refund(providerPaymentId:string,amount:string,currency:string):Promise<ProviderPaymentResult>;
  verifyWebhook(rawBody:Buffer,signature:string):ProviderWebhookEvent;
}
