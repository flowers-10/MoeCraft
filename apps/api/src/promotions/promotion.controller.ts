import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { ClaimCouponDto, CreateCouponDto, PromotionQuoteDto, SetCouponStatusDto } from "./promotion.dto";
import { PromotionService } from "./promotion.service";

@Controller("merchant/promotions")
@RequireRoles("MERCHANT_OWNER", "MERCHANT_STAFF")
@RequireAdminRoute("commerce.promotions")
export class MerchantPromotionController {
  constructor(private readonly promotions: PromotionService) {}
  @Get() list(@Req() req: { user: RequestPrincipal }) { return this.promotions.list(req.user.sub); }
  @Post() @RequireAdminButton("promotions.manage")
  create(@Req() req: { user: RequestPrincipal }, @Body() dto: CreateCouponDto) { return this.promotions.create(req.user.sub, dto); }
  @Patch(":id/status") @RequireAdminButton("promotions.manage")
  setStatus(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: SetCouponStatusDto) { return this.promotions.setStatus(req.user.sub, id, dto.status); }
}

@Controller("promotions")
@RequireRoles("CUSTOMER")
export class PromotionController {
  constructor(private readonly promotions: PromotionService) {}
  @Post("claim") claim(@Req() req: { user: RequestPrincipal }, @Body() dto: ClaimCouponDto) { return this.promotions.claim(req.user.sub, dto.code); }
  @Post("quote") quote(@Req() req: { user: RequestPrincipal }, @Body() dto: PromotionQuoteDto) { return this.promotions.quote(req.user.sub, dto); }
}
