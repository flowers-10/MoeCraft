import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AddCartItemDto, SelectCartItemsDto, UpdateCartItemDto } from "./cart.dto";
import { CartService } from "./cart.service";

@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@Headers("authorization") authorization?: string, @Headers("x-guest-token") guestToken?: string) {
    return this.cart.getCart(authorization, guestToken);
  }

  @Post("items")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  add(
    @Body() dto: AddCartItemDto,
    @Headers("authorization") authorization?: string,
    @Headers("x-guest-token") guestToken?: string
  ) {
    return this.cart.addItem(dto, authorization, guestToken);
  }

  @Patch("items/:itemId")
  update(
    @Param("itemId") itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers("authorization") authorization?: string,
    @Headers("x-guest-token") guestToken?: string
  ) {
    return this.cart.updateItem(itemId, dto, authorization, guestToken);
  }

  @Delete("items/:itemId")
  remove(
    @Param("itemId") itemId: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-guest-token") guestToken?: string
  ) {
    return this.cart.removeItem(itemId, authorization, guestToken);
  }

  @Put("items/selection")
  select(
    @Body() dto: SelectCartItemsDto,
    @Headers("authorization") authorization?: string,
    @Headers("x-guest-token") guestToken?: string
  ) {
    return this.cart.selectItems(dto, authorization, guestToken);
  }

  @Delete("items")
  clearInvalid(@Headers("authorization") authorization?: string, @Headers("x-guest-token") guestToken?: string) {
    return this.cart.clearInvalid(authorization, guestToken);
  }

  @Post("merge-guest")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  mergeGuest(@Headers("authorization") authorization?: string, @Headers("x-guest-token") guestToken?: string) {
    return this.cart.mergeGuest(authorization, guestToken);
  }
}
