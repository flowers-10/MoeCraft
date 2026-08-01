import { Module } from "@nestjs/common";
import { PromotionModule } from "../promotions/promotion.module";
import { AdminOrderController, BuyerOrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { SandboxShipmentTrackingProvider } from "./sandbox-shipment-tracking.provider";
@Module({imports:[PromotionModule],controllers:[BuyerOrderController,AdminOrderController],providers:[OrderService,SandboxShipmentTrackingProvider],exports:[OrderService]})
export class OrderModule {}
