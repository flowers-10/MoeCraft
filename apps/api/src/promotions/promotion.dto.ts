import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { COUPON_TYPES, type CouponType } from "@moecraft/shared";

export class CreateCouponDto {
  @IsString() @MinLength(3) @MaxLength(40) code!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(COUPON_TYPES) type!: CouponType;
  @IsNumberString() value!: string;
  @IsNumberString() minimumAmount!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) totalLimit!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000) perUserLimit!: number;
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) productIds: string[] = [];
}

export class SetCouponStatusDto {
  @IsIn(["ACTIVE", "PAUSED"]) status!: "ACTIVE" | "PAUSED";
}

export class ClaimCouponDto {
  @IsString() @MinLength(3) @MaxLength(40) code!: string;
}

export class PromotionQuoteDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items!: QuoteItemDto[];
  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
}

export class QuoteItemDto {
  @IsString() skuId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity!: number;
}
