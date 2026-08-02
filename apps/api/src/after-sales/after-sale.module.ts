import { Module } from "@nestjs/common";
import { PaymentModule } from "../payments/payment.module";
import { AdminAfterSaleController, BuyerAfterSaleController } from "./after-sale.controller";
import { AfterSaleService } from "./after-sale.service";

@Module({
  imports: [PaymentModule],
  controllers: [BuyerAfterSaleController, AdminAfterSaleController],
  providers: [AfterSaleService],
  exports: [AfterSaleService]
})
export class AfterSaleModule {}
