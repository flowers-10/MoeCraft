import { Global, Module } from "@nestjs/common";
import { ApiMetricsService } from "./api-metrics.service";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";
import { StructuredLogger } from "./structured-logger";
import { TelemetryExporter } from "./telemetry-exporter";

@Global()
@Module({
  providers: [StructuredLogger, ApiMetricsService, TelemetryExporter, RequestLoggingInterceptor],
  exports: [StructuredLogger, ApiMetricsService, TelemetryExporter, RequestLoggingInterceptor]
})
export class ObservabilityModule {}
