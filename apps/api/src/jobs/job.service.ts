import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { JobView } from "@moecraft/shared";
import { Prisma, type Job } from "@prisma/client";
import { hostname } from "node:os";
import { PrismaService } from "../prisma/prisma.service";
import { ApiMetricsService } from "../observability/api-metrics.service";
import { SandboxPaymentProvider } from "../payments/sandbox-payment.provider";
import { shouldReleaseCouponReservation } from "../orders/order-domain";
import { shouldAutoConfirmReceipt } from "../orders/shipment-domain";
import { nextRetryAt, resolveJobFailure, shouldCloseExpiredOrder } from "./job-domain";

@Injectable()
export class JobService{
  private readonly workerId=`${hostname()}:${process.pid}`;
  constructor(private readonly prisma:PrismaService,private readonly provider:SandboxPaymentProvider,private readonly metrics:ApiMetricsService){}

  async processDue(limit=20){
    let processed=0;
    for(let index=0;index<limit;index+=1){
      const job=await this.claim();
      if(!job)break;
      try{
        if(job.type==="CLOSE_EXPIRED_ORDER")await this.closeExpiredOrder(job);
        else if(job.type==="AUTO_CONFIRM_RECEIPT")await this.autoConfirmReceipt(job);
        await this.prisma.job.update({where:{id:job.id},data:{status:"COMPLETED",completedAt:new Date(),lockedAt:null,lockedBy:null,lastError:null}});
        this.metrics.recordCommerce("job_completed");processed+=1;
      }catch(error){await this.fail(job,error);}
    }
    await this.refreshGauges();
    return processed;
  }

  async listFailed():Promise<JobView[]>{
    const rows=await this.prisma.job.findMany({where:{status:{in:["RETRY","DEAD_LETTER"]}},orderBy:{updatedAt:"desc"},take:200});
    return rows.map((row)=>this.view(row));
  }

  async replay(id:string):Promise<JobView>{
    const job=await this.prisma.job.findUnique({where:{id}});
    if(!job)throw new NotFoundException("JOB_NOT_FOUND");
    if(job.status!=="DEAD_LETTER")throw new ConflictException("JOB_NOT_DEAD_LETTER");
    return this.view(await this.prisma.job.update({where:{id},data:{status:"PENDING",attempts:0,runAt:new Date(),lockedAt:null,lockedBy:null,lastError:null,deadLetterAt:null,completedAt:null}}));
  }

  private async claim():Promise<Job|null>{
    const candidate=await this.prisma.job.findFirst({where:{status:{in:["PENDING","RETRY"]},runAt:{lte:new Date()}},orderBy:[{runAt:"asc"},{createdAt:"asc"}]});
    if(!candidate)return null;
    const claimed=await this.prisma.job.updateMany({where:{id:candidate.id,status:candidate.status,attempts:candidate.attempts},data:{status:"RUNNING",attempts:{increment:1},lockedAt:new Date(),lockedBy:this.workerId}});
    if(!claimed.count)return this.claim();
    return this.prisma.job.findUniqueOrThrow({where:{id:candidate.id}});
  }

  private async closeExpiredOrder(job:Job){
    const payload=job.payload as {orderId?:unknown};
    if(typeof payload.orderId!=="string")throw new Error("JOB_ORDER_ID_INVALID");
    const payment=await this.prisma.paymentIntent.findUnique({where:{orderId:payload.orderId}});
    if(payment?.providerPaymentId&&["PENDING","PROCESSING","FAILED"].includes(payment.status))await this.provider.close(payment.providerPaymentId);
    await this.prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({where:{id:payload.orderId as string},include:{items:true,paymentIntent:true}});
      if(!order)throw new NotFoundException("ORDER_NOT_FOUND");
      if(!shouldCloseExpiredOrder(order.status,order.expiresAt))return;
      const reservations=await tx.inventoryReservation.findMany({where:{referenceId:{in:order.items.map((item)=>item.id)},status:"ACTIVE"},include:{inventory:true}});
      for(const reservation of reservations){
        const changed=await tx.inventory.updateMany({where:{id:reservation.inventoryId,version:reservation.inventory.version},data:{reserved:{decrement:reservation.quantity},version:{increment:1}}});
        if(!changed.count)throw new ConflictException("JOB_INVENTORY_CONFLICT");
        await tx.inventoryLedgerEntry.create({data:{inventoryId:reservation.inventoryId,type:"RESERVATION_RELEASED",onHandDelta:0,reservedDelta:-reservation.quantity,
          onHandAfter:reservation.inventory.onHand,reservedAfter:reservation.inventory.reserved-reservation.quantity,reason:"订单支付超时自动释放库存",referenceType:"ORDER_ITEM",referenceId:reservation.referenceId}});
        await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:"EXPIRED",releasedAt:new Date(),releaseReason:"ORDER_PAYMENT_TIMEOUT"}});
      }
      if(shouldReleaseCouponReservation(order.status,"CLOSED"))await tx.couponRedemption.deleteMany({where:{orderId:order.id}});
      if(order.paymentIntent&&order.paymentIntent.status!=="SUCCEEDED")await tx.paymentIntent.update({where:{id:order.paymentIntent.id},data:{status:"CANCELLED",closedAt:new Date()}});
      await tx.merchantOrder.updateMany({where:{orderId:order.id,status:"PENDING_PAYMENT"},data:{status:"CLOSED"}});
      await tx.order.update({where:{id:order.id},data:{status:"CLOSED",cancelledAt:new Date()}});
      await tx.orderEvent.create({data:{orderId:order.id,fromStatus:"PENDING_PAYMENT",toStatus:"CLOSED",type:"PAYMENT_TIMEOUT"}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  /** 发货满 N 天（ORDER_AUTO_CONFIRM_DAYS）后买家仍未确认则自动完成；状态已变化则静默跳过，保证可重放。 */
  private async autoConfirmReceipt(job:Job){
    const payload=job.payload as {orderId?:unknown};
    if(typeof payload.orderId!=="string")throw new Error("JOB_ORDER_ID_INVALID");
    await this.prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({where:{id:payload.orderId as string}});
      if(!order)throw new NotFoundException("ORDER_NOT_FOUND");
      if(!shouldAutoConfirmReceipt(order.status))return;
      await tx.merchantOrder.updateMany({where:{orderId:order.id,status:"SHIPPED"},data:{status:"COMPLETED"}});
      await tx.order.update({where:{id:order.id},data:{status:"COMPLETED",completedAt:new Date()}});
      await tx.orderEvent.create({data:{orderId:order.id,fromStatus:"SHIPPED",toStatus:"COMPLETED",type:"AUTO_CONFIRMED",metadata:{jobId:job.id}}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  private async fail(job:Job,error:unknown){
    const message=(error instanceof Error?error.message:"JOB_FAILED").slice(0,1000);
    const {deadLetter}=resolveJobFailure(job.attempts,job.maxAttempts);
    await this.prisma.job.update({where:{id:job.id},data:deadLetter
      ?{status:"DEAD_LETTER",lastError:message,deadLetterAt:new Date(),lockedAt:null,lockedBy:null}
      :{status:"RETRY",lastError:message,runAt:nextRetryAt(job.attempts),lockedAt:null,lockedBy:null}});
    if(deadLetter)this.metrics.recordCommerce("job_dead_letter");
  }

  private async refreshGauges(){
    const [due,dead,webhooks]=await Promise.all([
      this.prisma.job.count({where:{status:{in:["PENDING","RETRY"]},runAt:{lte:new Date()}}}),
      this.prisma.job.count({where:{status:"DEAD_LETTER"}}),
      this.prisma.paymentEvent.count({where:{processedAt:null}})
    ]);
    this.metrics.setCommerceGauge("jobs_due",due);this.metrics.setCommerceGauge("jobs_dead_letter",dead);this.metrics.setCommerceGauge("payment_webhook_backlog",webhooks);
  }

  private view(row:Job):JobView{return{id:row.id,type:row.type,status:row.status,attempts:row.attempts,maxAttempts:row.maxAttempts,runAt:row.runAt.toISOString(),lastError:row.lastError,deadLetterAt:row.deadLetterAt?.toISOString()??null,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()};}
}
