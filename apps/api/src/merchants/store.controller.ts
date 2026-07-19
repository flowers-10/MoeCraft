import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateStaffAccountDto, SaveStoreProfileDto, SetMemberStatusDto, UpdateMemberAccessDto } from "./store.dto";
import { StoreService } from "./store.service";

const MERCHANT_ROLES = ["MERCHANT_OWNER", "MERCHANT_STAFF"] as const;

@Controller()
export class StoreController {
  constructor(private readonly stores: StoreService) {}
  @Get("stores/:slug") publicStore(@Param("slug") slug:string){return this.stores.publicBySlug(slug);}
  @Get("merchant/store") @RequireRoles(...MERCHANT_ROLES) @RequireAdminRoute("merchant.store") mine(@Req() req:{user:RequestPrincipal}){return this.stores.mine(req.user.sub);}
  @Put("merchant/store") @RequireRoles(...MERCHANT_ROLES) @RequireAdminRoute("merchant.store") @RequireAdminButton("store.profile.edit") save(@Req() req:{user:RequestPrincipal},@Body() dto:SaveStoreProfileDto){return this.stores.save(req.user.sub,dto);}
  @Get("merchant/members") @RequireRoles(...MERCHANT_ROLES) @RequireAdminRoute("merchant.team") members(@Req() req:{user:RequestPrincipal}){return this.stores.members(req.user.sub);}
  @Post("merchant/staff-accounts") @RequireRoles("MERCHANT_OWNER") @RequireAdminButton("team.staff.create") createStaff(@Req() req:{user:RequestPrincipal},@Body() dto:CreateStaffAccountDto){return this.stores.createStaffAccount(req.user.sub,dto);}
  @Put("merchant/members/:id/access") @RequireRoles("MERCHANT_OWNER") @RequireAdminButton("team.staff.permissions") access(@Req() req:{user:RequestPrincipal},@Param("id") id:string,@Body() dto:UpdateMemberAccessDto){return this.stores.updateAccess(req.user.sub,id,dto);}
  @Patch("merchant/members/:id/status") @RequireRoles("MERCHANT_OWNER") @RequireAdminButton("team.staff.remove") status(@Req() req:{user:RequestPrincipal},@Param("id") id:string,@Body() dto:SetMemberStatusDto){return this.stores.setMemberStatus(req.user.sub,id,dto.isActive);}
  @Delete("merchant/members/:id") @RequireRoles("MERCHANT_OWNER") @RequireAdminButton("team.staff.remove") remove(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.stores.removeMember(req.user.sub,id);}
}
