import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { ReviewService } from "./review.service";

@Controller("reviews")
export class ReviewController {
  constructor(private readonly service: ReviewService) {}
  @Post()
  @RequireRoles("CUSTOMER")
  create(@Req() req: { user: RequestPrincipal }, @Body() body: { orderItemId: string; rating: number; content: string; images?: string[] }) {
    return this.service.create(req.user.sub, body.orderItemId, body.rating, body.content, body.images ?? []);
  }
  @Get("product/:productId")
  list(@Param("productId") productId: string, @Query("page") page: string) {
    return this.service.getProductReviews(productId, parseInt(page ?? "1") || 1);
  }
  @Get("product/:productId/rating")
  rating(@Param("productId") productId: string) {
    return this.service.getRatingSummary(productId);
  }
}

@Controller("admin/reviews")
@RequireRoles("MERCHANT_OWNER", "MERCHANT_STAFF", "PLATFORM_OPERATOR", "PLATFORM_ADMIN")
export class AdminReviewController {
  constructor(private readonly service: ReviewService) {}
  @Get()
  list(@Req() req: { user: RequestPrincipal }, @Query("hidden") hidden: string) {
    return this.service.listAdmin(req.user, hidden === "true");
  }
  @Patch(":id/reply")
  reply(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() body: { content: string }) {
    return this.service.reply(req.user, id, body.content);
  }
  @Patch(":id/hide")
  @RequireRoles("PLATFORM_OPERATOR", "PLATFORM_ADMIN")
  hide(@Req() req: { user: RequestPrincipal }, @Param("id") id: string, @Body() body: { hide: boolean; note: string }) {
    return this.service.hide(req.user, id, body.hide, body.note);
  }
}
