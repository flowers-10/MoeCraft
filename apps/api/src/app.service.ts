import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { AppHealth, AppReadiness } from "@moecraft/shared";
import { PrismaService } from "./prisma/prisma.service";
import { ApiMetricsService, type ApiMetricsSnapshot } from "./observability/api-metrics.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService, private readonly metrics: ApiMetricsService) {}

  getHealth(): AppHealth {
    return {
      name: "MoeCraft API",
      status: "ok",
      time: new Date().toISOString()
    };
  }

  async getReadiness(): Promise<AppReadiness> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        name: "MoeCraft API",
        status: "ok",
        time: new Date().toISOString(),
        dependencies: { database: "ok" }
      };
    } catch {
      throw new ServiceUnavailableException("READINESS_FAILED");
    }
  }

  getMetrics(): ApiMetricsSnapshot {
    return this.metrics.snapshot();
  }
}
