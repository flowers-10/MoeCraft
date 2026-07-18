import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

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

export class InviteStaffDto { @IsString() @Length(3, 80) username!: string; @IsIn(["OWNER", "STAFF"]) role!: "OWNER" | "STAFF"; }
export class UpdateMemberRoleDto { @IsIn(["OWNER", "STAFF"]) role!: "OWNER" | "STAFF"; }
