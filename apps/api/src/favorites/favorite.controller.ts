import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { FavoriteService } from "./favorite.service";

@Controller("favorites")
@RequireRoles("CUSTOMER")
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}
  @Post() toggle(@Req() req: { user: RequestPrincipal }, @Body() body: { targetType: string; targetId: string }) {
    return this.service.toggle(req.user.sub, body.targetType, body.targetId);
  }
  @Get() list(@Req() req: { user: RequestPrincipal }, @Query("type") type?: string) {
    return this.service.list(req.user.sub, type);
  }
  @Get("check/:targetType/:targetId") check(@Req() req: { user: RequestPrincipal }, @Param("targetType") targetType: string, @Param("targetId") targetId: string) {
    return this.service.check(req.user.sub, targetType, targetId);
  }
}
