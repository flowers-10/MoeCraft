import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { ReconciliationService } from "./reconciliation.service";

class ImportReconciliationDto {
  date!: string;
  fileName!: string;
  rows!: Array<{ orderNumber: string; expectedAmount: string }>;
}

class ResolveReconciliationDto {
  notes!: string;
}

@Controller("admin/reconciliation")
@RequireRoles("PLATFORM_OPERATOR", "PLATFORM_ADMIN")
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}
  @Get() list(@Req() req: { user: RequestPrincipal }) { return this.service.list(req.user); }
  @Get(":id") get(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) { return this.service.get(req.user, id); }
  @Post("import") import(@Req() req: { user: RequestPrincipal }, @Body() dto: ImportReconciliationDto) { return this.service.import(req.user, dto.date, dto.fileName, dto.rows); }
  @Patch(":id/resolve") @RequireRoles("PLATFORM_ADMIN")
  resolve(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: ResolveReconciliationDto) { return this.service.resolve(req.user, id, dto.notes); }
}
