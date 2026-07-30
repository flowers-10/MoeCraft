import { Type } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

export class ShippingAddressDto {
  @IsString() @MinLength(2) @MaxLength(120) recipient!: string;
  @IsString() @MinLength(6) @MaxLength(40) phone!: string;
  @IsString() @MinLength(2) @MaxLength(80) country!: string;
  @IsString() @MinLength(1) @MaxLength(80) province!: string;
  @IsString() @MinLength(1) @MaxLength(80) city!: string;
  @IsString() @MinLength(1) @MaxLength(80) district!: string;
  @IsString() @MinLength(4) @MaxLength(240) addressLine!: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
}

export class CreateCheckoutQuoteDto {
  @ValidateNested() @Type(() => ShippingAddressDto) address!: ShippingAddressDto;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(40) couponCode?: string;
}

