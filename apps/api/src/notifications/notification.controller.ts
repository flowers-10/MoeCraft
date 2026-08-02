import { Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { NotificationService } from "./notification.service";

@Controller("notifications")
@RequireRoles("CUSTOMER", "MERCHANT_OWNER", "MERCHANT_STAFF", "PLATFORM_OPERATOR", "PLATFORM_ADMIN")
export class NotificationController {
  constructor(private readonly service: NotificationService) {}
  @Get() list(@Req() req: { user: RequestPrincipal }, @Query("unread") unread?: string) {
    return this.service.list(req.user.sub, unread === "true");
  }
  @Get("unread-count") count(@Req() req: { user: RequestPrincipal }) {
    return this.service.unreadCount(req.user.sub);
  }
  @Patch(":id/read") markRead(@Req() req: { user: RequestPrincipal }, @Param("id") id: string) {
    return this.service.markRead(req.user.sub, id);
  }
  @Patch("read-all") markAllRead(@Req() req: { user: RequestPrincipal }) {
    return this.service.markAllRead(req.user.sub);
  }
}
