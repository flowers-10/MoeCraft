import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ProductSkuDraftDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @Length(1, 160) nameZhCn!: string;
  @IsOptional() @IsString() @MaxLength(160) nameEnUs?: string;
  @IsOptional() @IsString() @MaxLength(80) barcode?: string;
  @IsObject() optionValues!: Record<string, string>;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) weightGrams?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) lengthMm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) widthMm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) heightMm?: number;
  @Type(() => Number) @IsInt() @Min(0) priceAmount!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000) initialStock!: number;
}

export class ProductMediaDraftDto {
  @IsOptional() @IsString() id?: string;
  @IsString() fileId!: string;
  @IsIn(["IMAGE", "VIDEO"]) kind!: "IMAGE" | "VIDEO";
  @IsOptional() @IsString() @MaxLength(200) altZhCn?: string;
  @IsOptional() @IsString() @MaxLength(200) altEnUs?: string;
  @Type(() => Number) @IsInt() @Min(0) sortOrder!: number;
  @IsBoolean() isCover!: boolean;
}

export class SaveProductDraftDto {
  @IsString() @Length(1, 200) titleZhCn!: string;
  @IsOptional() @IsString() @MaxLength(200) titleEnUs?: string;
  @IsOptional() @IsString() descriptionZhCn?: string;
  @IsOptional() @IsString() descriptionEnUs?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() franchiseId?: string;
  @IsOptional() @IsString() characterId?: string;
  @IsArray() @IsString({ each: true }) tagIds!: string[];
  @IsOptional() @IsString() @MaxLength(160) material?: string;
  @IsOptional() @IsString() @MaxLength(80) scale?: string;
  @IsOptional() @IsString() @MaxLength(160) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(500) copyrightNotice?: string;
  @IsOptional() @IsIn(["IN_STOCK", "PREORDER"]) saleType?: "IN_STOCK" | "PREORDER";
  @IsOptional() @IsString() @MaxLength(2000) presaleNotice?: string;
  @IsOptional() @IsDateString() shippingWindowStart?: string;
  @IsOptional() @IsDateString() shippingWindowEnd?: string;
  @IsOptional() @IsString() @MaxLength(1000) afterSalesSummary?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductSkuDraftDto) skus!: ProductSkuDraftDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductMediaDraftDto) media!: ProductMediaDraftDto[];
}

export class ProductFieldFeedbackDto {
  @IsString() @MinLength(1) @MaxLength(80) field!: string;
  @IsString() @MinLength(1) @MaxLength(500) message!: string;
}

export class ProductReviewDecisionDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductFieldFeedbackDto) fieldFeedback!: ProductFieldFeedbackDto[];
}
