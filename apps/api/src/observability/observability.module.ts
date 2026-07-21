import { Global, Module } from "@nestjs/common";
import { ApiMetricsService } from "./api-metrics.service";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";
import { StructuredLogger } from "./structured-logger";

@Global()
@Module({
  providers: [StructuredLogger, ApiMetricsService, RequestLoggingInterceptor],
  exports: [StructuredLogger, ApiMetricsService, RequestLoggingInterceptor]
})
export class ObservabilityModule {}
