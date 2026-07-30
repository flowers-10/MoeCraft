import { Module } from "@nestjs/common";
import { PromotionModule } from "../promotions/promotion.module";
import { AdminOrderController, BuyerOrderController } from "./order.controller";
import { OrderService } from "./order.service";
@Module({imports:[PromotionModule],controllers:[BuyerOrderController,AdminOrderController],providers:[OrderService],exports:[OrderService]})
export class OrderModule {}
