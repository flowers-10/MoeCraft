import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import type { OrderStatus } from "@moecraft/shared";
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
