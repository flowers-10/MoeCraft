import { Global, Module } from "@nestjs/common";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";
import { StructuredLogger } from "./structured-logger";

@Global()
@Module({
  providers: [StructuredLogger, RequestLoggingInterceptor],
  exports: [StructuredLogger, RequestLoggingInterceptor]
})
export class ObservabilityModule {}
