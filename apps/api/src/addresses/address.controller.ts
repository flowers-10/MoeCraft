import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateAddressDto, UpdateAddressDto } from "./address.dto";
import { AddressService } from "./address.service";

@Controller("addresses")
@RequireRoles("CUSTOMER")
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Get() list(@Req() request: { user: RequestPrincipal }) { return this.addresses.list(request.user.sub); }
  @Post() create(@Req() request: { user: RequestPrincipal }, @Body() dto: CreateAddressDto) { return this.addresses.create(request.user.sub, dto); }
  @Patch(":id") update(@Req() request: { user: RequestPrincipal }, @Param("id") id: string, @Body() dto: UpdateAddressDto) { return this.addresses.update(request.user.sub, id, dto); }
  @Delete(":id") remove(@Req() request: { user: RequestPrincipal }, @Param("id") id: string) { return this.addresses.remove(request.user.sub, id); }
}
