import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { SaveProductDraftDto } from "./product.dto";
import { ProductService } from "./product.service";

@Controller("merchant/products")
@RequireRoles("MERCHANT_OWNER", "MERCHANT_STAFF")
@RequireAdminRoute("commerce.products")
export class ProductController {
  constructor(private readonly products:ProductService){}
  @Get() list(@Req() req:{user:RequestPrincipal}){return this.products.list(req.user.sub);}
  @Get(":id") detail(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.products.detail(req.user.sub,id);}
  @Post() @RequireAdminButton("products.manage") create(@Req() req:{user:RequestPrincipal},@Body() dto:SaveProductDraftDto){return this.products.create(req.user.sub,dto);}
  @Put(":id") @RequireAdminButton("products.manage") update(@Req() req:{user:RequestPrincipal},@Param("id") id:string,@Body() dto:SaveProductDraftDto){return this.products.update(req.user.sub,id,dto);}
  @Delete(":id") @RequireAdminButton("products.manage") archive(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.products.archive(req.user.sub,id);}
}
