import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentView, SandboxPaymentResult } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import type { AppEnvironment } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { assertPaymentFacts, canApplyPaymentEvent, signSandboxWebhook } from "./payment-domain";
import type { ProviderWebhookEvent } from "./payment-provider";
import { SandboxPaymentProvider } from "./sandbox-payment.provider";

const paymentInclude=Prisma.validator<Prisma.PaymentIntentInclude>()({order:{select:{orderNumber:true,userId:true}}});
type PaymentRecord=Prisma.PaymentIntentGetPayload<{include:typeof paymentInclude}>;
const money=(value:Prisma.Decimal|string|number)=>new Prisma.Decimal(value).toFixed(2);

@Injectable()
export class PaymentService{
  constructor(private readonly prisma:PrismaService,private readonly provider:SandboxPaymentProvider,private readonly config:ConfigService<AppEnvironment,true>){}

  async start(userId:string,orderId:string):Promise<PaymentView>{
    const payment=await this.prisma.paymentIntent.findFirst({where:{orderId,order:{userId}},include:paymentInclude});
    if(!payment)throw new NotFoundException("PAYMENT_NOT_FOUND");
    if(["SUCCEEDED","CANCELLED","REFUNDED"].includes(payment.status))return this.view(payment);
    if(payment.expiresAt<=new Date())throw new ConflictException("PAYMENT_EXPIRED");
    if(payment.providerPaymentId&&payment.status==="PROCESSING")return this.view(payment);
    const created=await this.provider.create({paymentId:payment.id,orderNumber:payment.order.orderNumber,amount:money(payment.amount),currency:payment.currency,expiresAt:payment.expiresAt.toISOString()});
    return this.view(await this.prisma.paymentIntent.update({where:{id:payment.id},data:{providerPaymentId:created.providerPaymentId,status:"PROCESSING"},include:paymentInclude}));
  }

  async get(userId:string,orderId:string):Promise<PaymentView>{
    const payment=await this.prisma.paymentIntent.findFirst({where:{orderId,order:{userId}},include:paymentInclude});
    if(!payment)throw new NotFoundException("PAYMENT_NOT_FOUND");
    return this.view(payment);
  }

  async close(userId:string,orderId:string):Promise<PaymentView>{
    const payment=await this.prisma.paymentIntent.findFirst({where:{orderId,order:{userId}},include:paymentInclude});
    if(!payment)throw new NotFoundException("PAYMENT_NOT_FOUND");
    if(payment.status==="CANCELLED")return this.view(payment);
    if(payment.status==="SUCCEEDED")throw new ConflictException("PAYMENT_ALREADY_SUCCEEDED");
    if(payment.providerPaymentId)await this.provider.close(payment.providerPaymentId);
    return this.view(await this.prisma.paymentIntent.update({where:{id:payment.id},data:{status:"CANCELLED",closedAt:new Date()},include:paymentInclude}));
  }

  async handleWebhook(rawBody:Buffer,signature:string):Promise<PaymentView>{
    const event=this.provider.verifyWebhook(rawBody,signature);
    let archive:{id:string};
    try{
      archive=await this.prisma.paymentEvent.create({data:{provider:"SANDBOX",providerEventId:event.eventId,eventType:event.status,rawBody:rawBody.toString("utf8"),eventData:event as unknown as Prisma.InputJsonValue,signatureValid:true}});
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
        const duplicate=await this.prisma.paymentEvent.findUnique({where:{providerEventId:event.eventId},include:{paymentIntent:{include:paymentInclude}}});
        if(duplicate?.paymentIntent)return this.view(duplicate.paymentIntent);
      }
      throw error;
    }
    const payment=await this.prisma.paymentIntent.findUnique({where:{providerPaymentId:event.providerPaymentId},include:paymentInclude});
    if(!payment){
      await this.prisma.paymentEvent.update({where:{id:archive.id},data:{errorCode:"PAYMENT_NOT_FOUND",processedAt:new Date()}});
      throw new NotFoundException("PAYMENT_NOT_FOUND");
    }
    try{assertPaymentFacts(money(payment.amount),payment.currency,event.amount,event.currency);}catch(error){
      const code=error instanceof Error?error.message:"PAYMENT_FACT_MISMATCH";
      await this.prisma.paymentEvent.update({where:{id:archive.id},data:{paymentIntentId:payment.id,errorCode:code,processedAt:new Date()}});
      throw new ConflictException(code);
    }
    if(!canApplyPaymentEvent(payment.status,event.status)){
      await this.prisma.paymentEvent.update({where:{id:archive.id},data:{paymentIntentId:payment.id,ignored:true,processedAt:new Date()}});
      return this.view(payment);
    }
    return this.prisma.$transaction(async(tx)=>{
      const current=await tx.paymentIntent.findUniqueOrThrow({where:{id:payment.id},include:{order:{include:{items:true}}}});
      if(event.status==="SUCCEEDED"){
        if(current.order.status!=="PENDING_PAYMENT")throw new ConflictException("PAYMENT_ORDER_NOT_PAYABLE");
        const reservations=await tx.inventoryReservation.findMany({where:{referenceId:{in:current.order.items.map((item)=>item.id)},status:"ACTIVE"},include:{inventory:true}});
        if(reservations.length!==current.order.items.length)throw new ConflictException("PAYMENT_RESERVATION_MISSING");
        for(const reservation of reservations){
          const changed=await tx.inventory.updateMany({where:{id:reservation.inventoryId,version:reservation.inventory.version},data:{onHand:{decrement:reservation.quantity},reserved:{decrement:reservation.quantity},version:{increment:1}}});
          if(!changed.count)throw new ConflictException("PAYMENT_INVENTORY_CONFLICT");
          await tx.inventoryLedgerEntry.create({data:{inventoryId:reservation.inventoryId,type:"RESERVATION_COMMITTED",onHandDelta:-reservation.quantity,reservedDelta:-reservation.quantity,
            onHandAfter:reservation.inventory.onHand-reservation.quantity,reservedAfter:reservation.inventory.reserved-reservation.quantity,reason:"沙箱支付成功扣减库存",referenceType:"ORDER_ITEM",referenceId:reservation.referenceId}});
          await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:"COMMITTED",committedAt:new Date()}});
        }
        await tx.paymentIntent.update({where:{id:payment.id},data:{status:"SUCCEEDED",paidAt:new Date(event.occurredAt)}});
        await tx.order.update({where:{id:current.orderId},data:{status:"PAID",paidAt:new Date(event.occurredAt)}});
        await tx.merchantOrder.updateMany({where:{orderId:current.orderId},data:{status:"PAID"}});
        await tx.orderEvent.create({data:{orderId:current.orderId,fromStatus:"PENDING_PAYMENT",toStatus:"PAID",type:"PAYMENT_SUCCEEDED",metadata:{providerEventId:event.eventId}}});
      }else{
        await tx.paymentIntent.update({where:{id:payment.id},data:{status:event.status,closedAt:event.status==="CANCELLED"?new Date():undefined}});
      }
      await tx.paymentEvent.update({where:{id:archive.id},data:{paymentIntentId:payment.id,processedAt:new Date()}});
      return this.view(await tx.paymentIntent.findUniqueOrThrow({where:{id:payment.id},include:paymentInclude}));
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async simulate(userId:string,orderId:string,result:SandboxPaymentResult):Promise<PaymentView>{
    if(this.config.get("SERVICE_ENVIRONMENT",{infer:true})!=="local")throw new ForbiddenException("SANDBOX_SIMULATION_DISABLED");
    const payment=await this.start(userId,orderId);
    if(!payment.providerPaymentId)throw new ConflictException("PAYMENT_PROVIDER_ID_MISSING");
    const event:ProviderWebhookEvent={eventId:`evt_${crypto.randomUUID()}`,providerPaymentId:payment.providerPaymentId,status:result,amount:payment.amount,currency:payment.currency,occurredAt:new Date().toISOString()};
    const raw=Buffer.from(JSON.stringify(event));
    return this.handleWebhook(raw,signSandboxWebhook(raw,this.config.get("JWT_ACCESS_SECRET",{infer:true})));
  }

  private view(payment:PaymentRecord):PaymentView{return{id:payment.id,orderId:payment.orderId,orderNumber:payment.order.orderNumber,status:payment.status,provider:payment.provider,providerPaymentId:payment.providerPaymentId,
    amount:money(payment.amount),currency:payment.currency,expiresAt:payment.expiresAt.toISOString(),paidAt:payment.paidAt?.toISOString()??null,updatedAt:payment.updatedAt.toISOString()};}
}
