import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermissions } from "../auth/authorization";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
@RequirePermissions("audit:read")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query("page") page = "1", @Query("pageSize") pageSize = "50") {
    return this.audit.list(page, pageSize);
  }
}
