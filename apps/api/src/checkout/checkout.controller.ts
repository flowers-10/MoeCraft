import { Body, Controller, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateCheckoutQuoteDto } from "./checkout.dto";
import { CheckoutService } from "./checkout.service";
import { ApiMetricsService } from "../observability/api-metrics.service";

@Controller("checkout")
@RequireRoles("CUSTOMER")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService,private readonly metrics:ApiMetricsService) {}

  @Post("quotes")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(@Req() request: { user: RequestPrincipal }, @Body() dto: CreateCheckoutQuoteDto) {
    try{return await this.checkout.createQuote(request.user.sub, dto);}catch(error){this.metrics.recordCommerce("checkout_quote_failure");throw error;}
  }
}
