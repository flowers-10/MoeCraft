import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAddressDto {
  @IsString() @MinLength(2) @MaxLength(120) recipient!: string;
  @IsString() @MinLength(6) @MaxLength(40) phone!: string;
  @IsString() @MinLength(2) @MaxLength(80) country!: string;
  @IsString() @MinLength(1) @MaxLength(80) province!: string;
  @IsString() @MinLength(1) @MaxLength(80) city!: string;
  @IsString() @MinLength(1) @MaxLength(80) district!: string;
  @IsString() @MinLength(4) @MaxLength(240) addressLine!: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) recipient?: string;
  @IsOptional() @IsString() @MinLength(6) @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) district?: string;
  @IsOptional() @IsString() @MinLength(4) @MaxLength(240) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
