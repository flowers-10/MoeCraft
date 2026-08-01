import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { MerchantOrderNoteDto, OrderListQueryDto, SubmitOrderDto } from "./order.dto";
import { OrderService } from "./order.service";

@Controller("orders")
@RequireRoles("CUSTOMER")
export class BuyerOrderController {
  constructor(private readonly orders: OrderService) {}
  @Post() @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Req() req:{user:RequestPrincipal},@Headers("idempotency-key") key:string|undefined,@Body() dto:SubmitOrderDto){return this.orders.create(req.user.sub,key,dto);}
  @Get() list(@Req() req:{user:RequestPrincipal},@Query() query:OrderListQueryDto){return this.orders.list(req.user,query,"buyer");}
  @Get(":id") get(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.orders.get(req.user,id,"buyer");}
  @Patch(":id/cancel") cancel(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.orders.cancel(req.user.sub,id);}
  @Patch(":id/confirm-receipt") confirm(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.orders.confirmReceipt(req.user.sub,id);}
}

@Controller("admin/orders")
@RequireRoles("MERCHANT_OWNER","MERCHANT_STAFF","PLATFORM_OPERATOR","PLATFORM_ADMIN")
@RequireAdminRoute("commerce.orders")
export class AdminOrderController {
  constructor(private readonly orders:OrderService){}
  @Get() list(@Req() req:{user:RequestPrincipal},@Query() query:OrderListQueryDto){return this.orders.list(req.user,query,"admin");}
  @Get(":id") get(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.orders.get(req.user,id,"admin");}
  @Patch(":id/merchant-orders/:merchantOrderId/note")@RequireAdminButton("orders.manage")
  note(@Req()req:{user:RequestPrincipal},@Param("id")id:string,@Param("merchantOrderId")merchantOrderId:string,@Body()dto:MerchantOrderNoteDto){return this.orders.addMerchantNote(req.user,id,merchantOrderId,dto.note);}
  @Post("exports")export(@Req()req:{user:RequestPrincipal},@Body()query:OrderListQueryDto){return this.orders.createExport(req.user,query);}
}
