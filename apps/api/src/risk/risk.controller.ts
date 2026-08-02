import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { RiskService } from "./risk.service";

@Controller("admin/risk")
@RequireRoles("PLATFORM_OPERATOR", "PLATFORM_ADMIN")
export class RiskController {
  constructor(private readonly service: RiskService) {}
  @Get("flags")
  flags(@Req() req: { user: RequestPrincipal }, @Query("type") type?: string, @Query("resolved") resolved?: string) {
    return this.service.listFlags(req.user, type, resolved === "true" ? true : resolved === "false" ? false : undefined);
  }
  @Patch("flags/:id/resolve")
  resolveFlag(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.service.resolveFlag(req.user, id);
  }
  @Get("reports")
  reports(@Req() req: { user: RequestPrincipal }, @Query("status") status?: string) {
    return this.service.listReports(req.user, status);
  }
  @Patch("reports/:id")
  handleReport(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() body: { decision: string; notes: string }) {
    return this.service.handleReport(req.user, id, body.decision, body.notes);
  }
}

@Controller("reports")
@RequireRoles("CUSTOMER")
export class ReportController {
  constructor(private readonly service: RiskService) {}
  @Post()
  create(@Req() req: { user: RequestPrincipal }, @Body() body: { targetType: string; targetId: string; reason: string; description: string }) {
    return this.service.createReport(req.user.sub, body.targetType, body.targetId, body.reason, body.description);
  }
}
