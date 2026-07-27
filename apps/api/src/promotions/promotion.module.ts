import { Module } from "@nestjs/common";
import { MerchantPromotionController, PromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";

@Module({ controllers: [MerchantPromotionController, PromotionController], providers: [PromotionService], exports: [PromotionService] })
export class PromotionModule {}
