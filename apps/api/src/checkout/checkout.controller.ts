import { Body, Controller, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateCheckoutQuoteDto } from "./checkout.dto";
import { CheckoutService } from "./checkout.service";

@Controller("checkout")
@RequireRoles("CUSTOMER")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("quotes")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(@Req() request: { user: RequestPrincipal }, @Body() dto: CreateCheckoutQuoteDto) {
    return this.checkout.createQuote(request.user.sub, dto);
  }
}

