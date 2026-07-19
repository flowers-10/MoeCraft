import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { AdminButtonPermission, AdminRoutePermission } from "@moecraft/shared";
import { ADMIN_BUTTON_KEYS, MERCHANT_STAFF_ROUTE_KEYS } from "../auth/admin-access";

export class ReturnAddressDto {
  @IsString() @Length(2, 120) recipient!: string;
  @IsString() @Length(6, 40) phone!: string;
  @IsString() @Length(2, 80) country!: string;
  @IsString() @Length(1, 80) province!: string;
  @IsString() @Length(1, 80) city!: string;
  @IsString() @Length(1, 80) district!: string;
  @IsString() @Length(3, 255) addressLine!: string;
  @IsOptional() @IsString() @Length(2, 20) postalCode?: string;
}

export class SaveStoreProfileDto {
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(3, 120) slug!: string;
  @IsOptional() @IsString() @Length(1, 191) logoFileId?: string;
  @IsOptional() @IsString() @Length(1, 191) bannerFileId?: string;
  @IsOptional() @IsString() @Length(0, 4000) description?: string;
  @IsOptional() @IsEmail() @Length(5, 160) customerServiceEmail?: string;
  @IsOptional() @IsString() @Length(6, 40) customerServicePhone?: string;
  @ValidateNested() @Type(() => ReturnAddressDto) returnAddress!: ReturnAddressDto;
  @IsBoolean() isOpen!: boolean;
}

export class CreateStaffAccountDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]+$/) @Length(3, 80) username!: string;
  @IsString() @Length(1, 120) displayName!: string;
  @IsString() @MinLength(12) password!: string;
  @IsArray() @ArrayUnique() @IsIn(MERCHANT_STAFF_ROUTE_KEYS, { each: true }) routePermissions!: AdminRoutePermission[];
  @IsArray() @ArrayUnique() @IsIn(ADMIN_BUTTON_KEYS, { each: true }) buttonPermissions!: AdminButtonPermission[];
}

export class UpdateMemberAccessDto {
  @IsArray() @ArrayUnique() @IsIn(MERCHANT_STAFF_ROUTE_KEYS, { each: true }) routePermissions!: AdminRoutePermission[];
  @IsArray() @ArrayUnique() @IsIn(ADMIN_BUTTON_KEYS, { each: true }) buttonPermissions!: AdminButtonPermission[];
}

export class SetMemberStatusDto { @IsBoolean() isActive!: boolean; }
