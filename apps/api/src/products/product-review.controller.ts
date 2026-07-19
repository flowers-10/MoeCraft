import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequirePermissions, type RequestPrincipal } from "../auth/authorization";
import { ProductReviewDecisionDto } from "./product.dto";
import { ProductService } from "./product.service";

@Controller("platform/product-reviews")
@RequirePermissions("product:review")
@RequireAdminRoute("platform.productReview")
export class ProductReviewController {
  constructor(private readonly products:ProductService){}
  @Get() list(@Query("status") status?:string){return this.products.reviewQueue(status);}
  @Get(":id") detail(@Param("id") id:string){return this.products.reviewDetail(id);}
  @Post(":id/decision") @RequireAdminButton("products.review") decide(@Req() req:{user:RequestPrincipal},@Param("id") id:string,@Body() dto:ProductReviewDecisionDto){return this.products.decide(req.user.sub,id,dto.approved,dto.reason,dto.fieldFeedback);}
}
