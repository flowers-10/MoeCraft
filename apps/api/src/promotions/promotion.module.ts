import { Module } from "@nestjs/common";
import { MerchantPromotionController, PromotionController, PublicPromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";

@Module({ controllers: [MerchantPromotionController, PromotionController, PublicPromotionController], providers: [PromotionService], exports: [PromotionService] })
export class PromotionModule {}
