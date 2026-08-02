import { Module } from "@nestjs/common";
import { ReportController, RiskController } from "./risk.controller";
import { RiskService } from "./risk.service";
@Module({ controllers: [RiskController, ReportController], providers: [RiskService] })
export class RiskModule {}
