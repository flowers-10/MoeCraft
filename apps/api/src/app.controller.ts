import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { RequirePermissions } from "./auth/authorization";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getIndex() {
    return this.appService.getHealth();
  }

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Get("readiness")
  getReadiness() {
    return this.appService.getReadiness();
  }

  @Get("metrics")
  @RequirePermissions("system:manage")
  getMetrics() {
    return this.appService.getMetrics();
  }
}
