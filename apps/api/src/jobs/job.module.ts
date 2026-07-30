import { Module } from "@nestjs/common";
import { PaymentModule } from "../payments/payment.module";
import { JobController } from "./job.controller";
import { JobService } from "./job.service";
import { JobWorker } from "./job.worker";
@Module({imports:[PaymentModule],controllers:[JobController],providers:[JobService,JobWorker],exports:[JobService]})
export class JobModule{}
