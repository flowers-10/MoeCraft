import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class AddCartItemDto {
  @IsString() @MinLength(1) @MaxLength(191) skuId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity!: number;
  @IsOptional() @IsBoolean() selected?: boolean;
}

export class UpdateCartItemDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity?: number;
  @IsOptional() @IsBoolean() selected?: boolean;
}

export class SelectCartItemsDto {
  @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) itemIds!: string[];
  @IsBoolean() selected!: boolean;
}
