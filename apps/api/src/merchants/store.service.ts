import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MerchantMemberView, StoreProfileView, StoreReturnAddress } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { ADMIN_BUTTON_KEYS, ADMIN_ROUTE_KEYS } from "../auth/admin-access";
import type { CreateStaffAccountDto, SaveStoreProfileDto, UpdateMemberAccessDto } from "./store.dto";

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(userId: string): Promise<StoreProfileView> {
    const merchant = await this.requireMerchant(userId);
    const store = await this.prisma.store.upsert({
      where: { merchantId: merchant.id },
      update: {},
      create: { merchantId: merchant.id, name: merchant.name, slug: `merchant-${(merchant.ownerId ?? merchant.id).toLowerCase()}` }
    });
    return this.storeView(store, merchant.status);
  }
  async save(userId: string, dto: SaveStoreProfileDto): Promise<StoreProfileView> {
    const merchant = await this.requireMerchant(userId); await this.validateMedia(userId, [dto.logoFileId, dto.bannerFileId].filter((id): id is string => Boolean(id)));
    const returnAddress: Prisma.InputJsonObject = { ...dto.returnAddress };
    const data = { name: dto.name, slug: dto.slug, logoFileId: dto.logoFileId ?? null, bannerFileId: dto.bannerFileId ?? null, description: dto.description ?? null, customerServiceEmail: dto.customerServiceEmail ?? null, customerServicePhone: dto.customerServicePhone ?? null, returnAddress, isOpen: dto.isOpen };
    try { const store = await this.prisma.$transaction(async (tx) => { const saved = await tx.store.upsert({ where: { merchantId: merchant.id }, update: data, create: { ...data, merchantId: merchant.id } }); await tx.auditLog.create({ data: { actorId: userId, action: "store.profile.updated", targetType: "Store", targetId: saved.id } }); return saved; }); return this.storeView(store, merchant.status); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("STORE_SLUG_ALREADY_USED"); throw error; }
  }
  async publicBySlug(slug: string): Promise<StoreProfileView> { const store = await this.prisma.store.findFirst({ where: { slug, isOpen: true, merchant: { status: "ACTIVE" } }, include: { merchant: true } }); if (!store) throw new NotFoundException("STORE_NOT_FOUND"); return this.storeView(store, store.merchant.status); }

  async members(userId: string): Promise<MerchantMemberView[]> { const merchant = await this.requireMerchant(userId); const members = await this.prisma.merchantMember.findMany({ where: { merchantId: merchant.id }, include: { user: true }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }); return members.map((item) => this.memberView(item)); }
  async createStaffAccount(ownerId:string,dto:CreateStaffAccountDto):Promise<MerchantMemberView>{
    const merchant=await this.requireMerchant(ownerId,true);
    if(await this.prisma.user.findUnique({where:{username:dto.username}}))throw new ConflictException("ACCOUNT_ALREADY_EXISTS");
    const member=await this.prisma.$transaction(async(tx)=>{
      const user=await tx.user.create({data:{username:dto.username,displayName:dto.displayName,passwordHash:await bcrypt.hash(dto.password,12),roles:{create:{role:"MERCHANT_STAFF"}}}});
      const created=await tx.merchantMember.create({data:{merchantId:merchant.id,userId:user.id,role:"STAFF",routePermissions:dto.routePermissions as Prisma.InputJsonValue,buttonPermissions:dto.buttonPermissions as Prisma.InputJsonValue},include:{user:true}});
      await tx.auditLog.create({data:{actorId:ownerId,action:"merchant.staff.created",targetType:"User",targetId:user.id,metadata:{merchantId:merchant.id,routePermissions:dto.routePermissions,buttonPermissions:dto.buttonPermissions}}});
      return created;
    });
    return this.memberView(member);
  }
  async updateAccess(ownerId:string,memberId:string,dto:UpdateMemberAccessDto):Promise<MerchantMemberView>{
    const merchant=await this.requireMerchant(ownerId,true);const current=await this.member(merchant.id,memberId);
    if(current.role==="OWNER")throw new BadRequestException("OWNER_ACCESS_IS_IMPLICIT");
    const updated=await this.prisma.$transaction(async(tx)=>{const saved=await tx.merchantMember.update({where:{id:memberId},data:{routePermissions:dto.routePermissions as Prisma.InputJsonValue,buttonPermissions:dto.buttonPermissions as Prisma.InputJsonValue},include:{user:true}});await tx.auditLog.create({data:{actorId:ownerId,action:"merchant.staff.access.updated",targetType:"MerchantMember",targetId:memberId,metadata:{routePermissions:dto.routePermissions,buttonPermissions:dto.buttonPermissions}}});return saved;});
    return this.memberView(updated);
  }
  async setMemberStatus(userId:string,memberId:string,isActive:boolean){const merchant=await this.requireMerchant(userId,true);const member=await this.member(merchant.id,memberId);if(member.role==="OWNER")throw new BadRequestException("OWNER_STATUS_CANNOT_BE_CHANGED");await this.prisma.$transaction([this.prisma.user.update({where:{id:member.userId},data:{isActive}}),...(!isActive?[this.prisma.session.updateMany({where:{userId:member.userId,revokedAt:null},data:{revokedAt:new Date()}})]:[]),this.prisma.auditLog.create({data:{actorId:userId,action:isActive?"merchant.staff.activated":"merchant.staff.deactivated",targetType:"User",targetId:member.userId}})]);return {isActive};}
  async removeMember(userId:string,memberId:string){const merchant=await this.requireMerchant(userId,true);const member=await this.member(merchant.id,memberId);if(member.role==="OWNER")throw new BadRequestException("OWNER_CANNOT_BE_REMOVED");await this.prisma.$transaction([this.prisma.merchantMember.delete({where:{id:member.id}}),this.prisma.userRole.deleteMany({where:{userId:member.userId,role:"MERCHANT_STAFF"}}),this.prisma.session.updateMany({where:{userId:member.userId,revokedAt:null},data:{revokedAt:new Date()}}),this.prisma.user.update({where:{id:member.userId},data:{isActive:false}}),this.prisma.auditLog.create({data:{actorId:userId,action:"merchant.staff.deleted",targetType:"User",targetId:member.userId}})]);return {removed:true};}

  private async requireMerchant(userId:string,owner=false){const membership=await this.prisma.merchantMember.findFirst({where:{userId,...(owner?{role:"OWNER"}:{})},include:{merchant:true}});if(!membership)throw new ForbiddenException("MERCHANT_ACCESS_REQUIRED");return membership.merchant;}
  private async member(merchantId:string,id:string){const item=await this.prisma.merchantMember.findFirst({where:{id,merchantId}});if(!item)throw new NotFoundException("MERCHANT_MEMBER_NOT_FOUND");return item;}
  private async validateMedia(ownerId:string,ids:string[]){if(!ids.length)return;const count=await this.prisma.fileAsset.count({where:{id:{in:ids},ownerId,purpose:"store-media",status:{notIn:["DELETED","QUARANTINED"]}}});if(count!==ids.length)throw new BadRequestException("INVALID_STORE_MEDIA");}
  private storeView(store:{id:string;merchantId:string;name:string;slug:string;logoFileId:string|null;bannerFileId:string|null;description:string|null;customerServiceEmail:string|null;customerServicePhone:string|null;returnAddress:Prisma.JsonValue|null;isOpen:boolean;updatedAt:Date},merchantStatus:"ACTIVE"|"SUSPENDED"|"CLOSED"):StoreProfileView{return{...store,returnAddress:store.returnAddress as StoreReturnAddress|null,merchantStatus,updatedAt:store.updatedAt.toISOString()};}
  private memberView(item:{id:string;userId:string;role:"OWNER"|"STAFF";routePermissions:Prisma.JsonValue|null;buttonPermissions:Prisma.JsonValue|null;createdAt:Date;user:{username:string;displayName:string;isActive:boolean}}):MerchantMemberView{return{id:item.id,userId:item.userId,username:item.user.username,displayName:item.user.displayName,isActive:item.user.isActive,role:item.role,routePermissions:item.role==="OWNER"?[...ADMIN_ROUTE_KEYS]:this.permissionList(item.routePermissions,ADMIN_ROUTE_KEYS),buttonPermissions:item.role==="OWNER"?[...ADMIN_BUTTON_KEYS]:this.permissionList(item.buttonPermissions,ADMIN_BUTTON_KEYS),createdAt:item.createdAt.toISOString()};}
  private permissionList<T extends string>(value:Prisma.JsonValue|null,allowed:readonly T[]):T[]{return Array.isArray(value)?value.filter((item):item is T=>typeof item==="string"&&allowed.includes(item as T)):[];}
}
