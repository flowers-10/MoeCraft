import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { AfterSaleListQueryDto, AfterSaleRefundDto, AfterSaleReviewDto, AfterSaleShipReturnDto, CreateAfterSaleDto } from "./after-sale.dto";
import { AfterSaleService } from "./after-sale.service";

@Controller("after-sales")
@RequireRoles("CUSTOMER")
export class BuyerAfterSaleController {
  constructor(private readonly afterSales: AfterSaleService) {}
  @Post() create(@Req() req: { user: RequestPrincipal }, @Body() dto: CreateAfterSaleDto) {
    return this.afterSales.create(req.user.sub, dto);
  }
  @Get() list(@Req() req: { user: RequestPrincipal }, @Query() query: AfterSaleListQueryDto) {
    return this.afterSales.listBuyer(req.user.sub, query);
  }
  @Get(":id") get(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.afterSales.getBuyer(req.user.sub, id);
  }
  @Patch(":id/cancel") cancel(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.afterSales.cancel(req.user.sub, id);
  }
  @Patch(":id/ship-return") shipReturn(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: AfterSaleShipReturnDto) {
    return this.afterSales.shipReturn(req.user.sub, id, dto);
  }
}

@Controller("admin/after-sales")
@RequireRoles("MERCHANT_OWNER", "MERCHANT_STAFF", "PLATFORM_OPERATOR", "PLATFORM_ADMIN")
@RequireAdminRoute("commerce.afterSales")
export class AdminAfterSaleController {
  constructor(private readonly afterSales: AfterSaleService) {}
  @Get() list(@Req() req: { user: RequestPrincipal }, @Query() query: AfterSaleListQueryDto) {
    return this.afterSales.listAdmin(req.user, query);
  }
  @Get(":id") get(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.afterSales.getAdmin(req.user, id);
  }
  @Patch(":id/review") @RequireAdminButton("afterSales.manage")
  review(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: AfterSaleReviewDto) {
    return this.afterSales.review(req.user, id, dto);
  }
  @Patch(":id/confirm-returned") @RequireAdminButton("afterSales.manage")
  confirmReturned(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.afterSales.confirmReturned(req.user, id);
  }
  @Patch(":id/refund") @RequireAdminButton("afterSales.manage")
  refund(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: AfterSaleRefundDto) {
    return this.afterSales.executeRefundOp(req.user, id, dto);
  }
  @Patch(":id/platform-review")
  @RequireRoles("PLATFORM_OPERATOR", "PLATFORM_ADMIN")
  platformReview(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: AfterSaleReviewDto) {
    return this.afterSales.platformReview(req.user, id, dto);
  }
}
