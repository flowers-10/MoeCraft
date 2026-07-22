import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, NotEquals } from "class-validator";

export class AdjustInventoryDto {
  @Type(() => Number) @IsInt() @NotEquals(0) @Min(-1000000) @Max(1000000) delta!: number;
  @IsString() @MinLength(2) @MaxLength(500) reason!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) expectedVersion?: number;
}

export class SetLowStockThresholdDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000) lowStockThreshold!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) expectedVersion?: number;
}
