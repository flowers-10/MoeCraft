import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { AdjustInventoryDto, SetLowStockThresholdDto } from "./inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("merchant/inventory")
@RequireRoles("MERCHANT_OWNER", "MERCHANT_STAFF")
@RequireAdminRoute("commerce.inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Req() req: { user: RequestPrincipal }) { return this.inventory.list(req.user.sub); }

  @Get(":skuId/ledger")
  ledger(@Req() req: { user: RequestPrincipal }, @Param("skuId") skuId: string) { return this.inventory.ledger(req.user.sub, skuId); }

  @Post(":skuId/adjustments")
  @RequireAdminButton("inventory.adjust")
  adjust(@Req() req: { user: RequestPrincipal }, @Param("skuId") skuId: string, @Body() dto: AdjustInventoryDto) { return this.inventory.adjust(req.user.sub, skuId, dto); }

  @Patch(":skuId/low-stock-threshold")
  @RequireAdminButton("inventory.adjust")
  setThreshold(@Req() req: { user: RequestPrincipal }, @Param("skuId") skuId: string, @Body() dto: SetLowStockThresholdDto) { return this.inventory.setLowStockThreshold(req.user.sub, skuId, dto); }
}
