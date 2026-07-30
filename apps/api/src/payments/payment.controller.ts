import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { SimulatePaymentDto } from "./payment.dto";
import { PaymentService } from "./payment.service";

@Controller("payments")
@RequireRoles("CUSTOMER")
export class PaymentController{
  constructor(private readonly payments:PaymentService){}
  @Post(":orderId/start")start(@Req()req:{user:RequestPrincipal},@Param("orderId")orderId:string){return this.payments.start(req.user.sub,orderId);}
  @Get(":orderId")get(@Req()req:{user:RequestPrincipal},@Param("orderId")orderId:string){return this.payments.get(req.user.sub,orderId);}
  @Post(":orderId/close")close(@Req()req:{user:RequestPrincipal},@Param("orderId")orderId:string){return this.payments.close(req.user.sub,orderId);}
  @Post(":orderId/simulate")simulate(@Req()req:{user:RequestPrincipal},@Param("orderId")orderId:string,@Body()dto:SimulatePaymentDto){return this.payments.simulate(req.user.sub,orderId,dto.result);}
}

@Controller("payment-webhooks")
export class PaymentWebhookController{
  constructor(private readonly payments:PaymentService){}
  @Post("sandbox")
  webhook(@Req()req:{rawBody?:Buffer},@Headers("x-sandbox-signature")signature:string|undefined,@Body()body:unknown){
    const raw=req.rawBody??Buffer.from(JSON.stringify(body));
    return this.payments.handleWebhook(raw,signature??"");
  }
}
