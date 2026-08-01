import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import type { CouponType } from "@moecraft/shared";

const couponTypes = ["FIXED", "PERCENTAGE"] as const satisfies readonly CouponType[];

export class CreateCouponDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(couponTypes) type!: CouponType;
  @Transform(({ value }) => typeof value === "number" ? String(value) : value) @IsNumberString() value!: string;
  @Transform(({ value }) => typeof value === "number" ? String(value) : value) @IsNumberString() minimumAmount!: string;
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
  @IsString() couponId!: string;
}

export class PromotionQuoteDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items!: QuoteItemDto[];
  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
  @IsOptional() @IsString() couponId?: string;
}

export class QuoteItemDto {
  @IsString() skuId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity!: number;
}
