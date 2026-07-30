import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";
import { verifySandboxWebhookSignature } from "./payment-domain";
import type { PaymentProvider, ProviderPaymentRequest, ProviderPaymentResult, ProviderWebhookEvent } from "./payment-provider";

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  constructor(private readonly config:ConfigService<AppEnvironment,true>){}
  async create(request:ProviderPaymentRequest):Promise<ProviderPaymentResult>{return{providerPaymentId:`sbx_${request.paymentId}`,status:"PROCESSING",checkoutUrl:null};}
  async query(providerPaymentId:string):Promise<ProviderPaymentResult>{return{providerPaymentId,status:"PROCESSING",checkoutUrl:null};}
  async close(providerPaymentId:string):Promise<ProviderPaymentResult>{return{providerPaymentId,status:"CANCELLED",checkoutUrl:null};}
  async refund(providerPaymentId:string,_amount:string,_currency:string):Promise<ProviderPaymentResult>{return{providerPaymentId,status:"REFUNDED",checkoutUrl:null};}
  verifyWebhook(rawBody:Buffer,signature:string):ProviderWebhookEvent{
    if(!verifySandboxWebhookSignature(rawBody,signature,this.config.get("JWT_ACCESS_SECRET",{infer:true})))throw new UnauthorizedException("PAYMENT_WEBHOOK_SIGNATURE_INVALID");
    let value:unknown;
    try{value=JSON.parse(rawBody.toString("utf8"));}catch{throw new UnauthorizedException("PAYMENT_WEBHOOK_PAYLOAD_INVALID");}
    const event=value as Partial<ProviderWebhookEvent>;
    if(!event.eventId||!event.providerPaymentId||!event.status||!event.amount||!event.currency||!event.occurredAt)throw new UnauthorizedException("PAYMENT_WEBHOOK_PAYLOAD_INVALID");
    if(!["SUCCEEDED","FAILED","CANCELLED"].includes(event.status))throw new UnauthorizedException("PAYMENT_WEBHOOK_PAYLOAD_INVALID");
    return event as ProviderWebhookEvent;
  }
}
