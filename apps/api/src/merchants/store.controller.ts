import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { InviteStaffDto, SaveStoreProfileDto, UpdateMemberRoleDto } from "./store.dto";
import { StoreService } from "./store.service";

const MERCHANT_ROLES = ["MERCHANT_OWNER", "MERCHANT_STAFF"] as const;

@Controller()
export class StoreController {
  constructor(private readonly stores: StoreService) {}
  @Get("stores/:slug") publicStore(@Param("slug") slug:string){return this.stores.publicBySlug(slug);}
  @Get("merchant/store") @RequireRoles(...MERCHANT_ROLES) mine(@Req() req:{user:RequestPrincipal}){return this.stores.mine(req.user.sub);}
  @Put("merchant/store") @RequireRoles("MERCHANT_OWNER") save(@Req() req:{user:RequestPrincipal},@Body() dto:SaveStoreProfileDto){return this.stores.save(req.user.sub,dto);}
  @Get("merchant/members") @RequireRoles(...MERCHANT_ROLES) members(@Req() req:{user:RequestPrincipal}){return this.stores.members(req.user.sub);}
  @Post("merchant/invitations") @RequireRoles("MERCHANT_OWNER") invite(@Req() req:{user:RequestPrincipal},@Body() dto:InviteStaffDto){return this.stores.invite(req.user.sub,dto);}
  @Get("staff-invitations/mine") @RequireRoles("CUSTOMER","MERCHANT_OWNER","MERCHANT_STAFF") invitations(@Req() req:{user:RequestPrincipal}){return this.stores.invitationsMine(req.user.sub);}
  @Post("staff-invitations/:id/accept") @RequireRoles("CUSTOMER","MERCHANT_OWNER","MERCHANT_STAFF") accept(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.stores.acceptInvitation(req.user.sub,id);}
  @Patch("merchant/members/:id") @RequireRoles("MERCHANT_OWNER") role(@Req() req:{user:RequestPrincipal},@Param("id") id:string,@Body() dto:UpdateMemberRoleDto){return this.stores.updateRole(req.user.sub,id,dto);}
  @Delete("merchant/members/:id") @RequireRoles("MERCHANT_OWNER") remove(@Req() req:{user:RequestPrincipal},@Param("id") id:string){return this.stores.removeMember(req.user.sub,id);}
}
