import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import type { OrderStatus } from "@moecraft/shared";
import { CARRIER_CODES } from "./carriers";
const orderStatuses = ["PENDING_PAYMENT","PAID","PARTIALLY_SHIPPED","SHIPPED","COMPLETED","CANCELLED","AFTER_SALE","CLOSED"] as const satisfies readonly OrderStatus[];
export class SubmitOrderDto {
  @IsUUID() quoteId!: string;
  @IsString() @MinLength(20) @MaxLength(100) signature!: string;
}
export class OrderListQueryDto {
  @IsOptional() @IsIn(orderStatuses) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}
export class MerchantOrderNoteDto{@IsString()@MinLength(1)@MaxLength(1000)note!:string;}
export class ShipmentLineDto {
  @IsUUID() orderItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) quantity!: number;
}
export class CreateShipmentDto {
  @IsIn(CARRIER_CODES) carrier!: string;
  @IsString() @Matches(/^[A-Za-z0-9-]{4,80}$/) trackingNumber!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => ShipmentLineDto) items!: ShipmentLineDto[];
}
