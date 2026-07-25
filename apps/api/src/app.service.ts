import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { AppHealth, AppReadiness } from "@moecraft/shared";
import { PrismaService } from "./prisma/prisma.service";
import { REQUIRED_DATABASE_MIGRATION } from "./prisma/schema-version";
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
      const applied = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE migration_name = ${REQUIRED_DATABASE_MIGRATION}
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
        LIMIT 1
      `;
      if (applied.length !== 1) throw new ServiceUnavailableException("READINESS_FAILED");
      return {
        name: "MoeCraft API",
        status: "ok",
        time: new Date().toISOString(),
        dependencies: { database: "ok", migrations: "ok" }
      };
    } catch {
      throw new ServiceUnavailableException("READINESS_FAILED");
    }
  }

  getMetrics(): ApiMetricsSnapshot {
    return this.metrics.snapshot();
  }
}
