import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from "class-validator";
import type { AfterSaleStatus, AfterSaleType } from "@moecraft/shared";
import { AFTER_SALE_STATUSES, AFTER_SALE_TYPES } from "@moecraft/shared";

export class CreateAfterSaleDto {
  @IsUUID() orderItemId!: string;
  @IsIn(AFTER_SALE_TYPES) type!: AfterSaleType;
  @IsString() @MinLength(1) @MaxLength(200) reason!: string;
  @IsString() @MaxLength(2000) description!: string;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AfterSaleEvidenceDto)
  evidence!: AfterSaleEvidenceDto[];
}

export class AfterSaleEvidenceDto {
  @IsUUID("all", { each: true }) @IsArray() fileIds!: string[];
  @IsString() @MaxLength(500) description!: string;
}

export class AfterSaleListQueryDto {
  @IsOptional() @IsIn(AFTER_SALE_STATUSES) status?: AfterSaleStatus;
}

export class AfterSaleReviewDto {
  @IsIn(["APPROVED", "REJECTED"] as const) decision!: "APPROVED" | "REJECTED";
  @IsString() @MaxLength(1000) note!: string;
}

export class AfterSaleShipReturnDto {
  @IsString() @MinLength(1) @MaxLength(40) carrier!: string;
  @IsString() @MinLength(4) @MaxLength(80) trackingNumber!: string;
}

export class AfterSaleRefundDto {
  @IsString() @MaxLength(1000) note!: string;
}
