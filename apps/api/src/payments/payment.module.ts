import { Module } from "@nestjs/common";
import { PaymentController, PaymentWebhookController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { SandboxPaymentProvider } from "./sandbox-payment.provider";
@Module({controllers:[PaymentController,PaymentWebhookController],providers:[PaymentService,SandboxPaymentProvider],exports:[PaymentService,SandboxPaymentProvider]})
export class PaymentModule{}
