import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { finalize, tap, type Observable } from "rxjs";
import { ensureRequestId } from "../http/request-id";
import { ApiMetricsService } from "./api-metrics.service";
import { StructuredLogger } from "./structured-logger";
import { TelemetryExporter } from "./telemetry-exporter";
import { ensureTraceContext } from "./trace-context";

type HttpRequest = {
  method: string;
  path?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
  traceId?: string;
  user?: { sub?: string };
};

type HttpResponse = {
  statusCode?: number;
  setHeader(name: string, value: string): void;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly metrics: ApiMetricsService,
    private readonly telemetry: TelemetryExporter
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<HttpResponse>();
    const requestId = ensureRequestId(request, response);
    const traceId = ensureTraceContext(request, response);
    const startedAt = performance.now();
    let errorStatus: number | undefined;

    return next.handle().pipe(
      tap({ error: (error: unknown) => { errorStatus = error instanceof HttpException ? error.getStatus() : 500; } }),
      finalize(() => {
        const statusCode = errorStatus ?? response.statusCode ?? 200;
        const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
        const fields = {
          requestId,
          traceId,
          method: request.method,
          path: request.path ?? request.url?.split("?", 1)[0] ?? "",
          statusCode,
          durationMs,
          userId: request.user?.sub
        };
        this.metrics.recordRequest(statusCode, durationMs);
        void this.telemetry.export({
          type: "http.request",
          timestamp: new Date().toISOString(),
          service: "moecraft-api",
          environment: process.env.SERVICE_ENVIRONMENT ?? "local",
          traceId,
          requestId,
          method: request.method,
          path: request.path ?? request.url?.split("?", 1)[0] ?? "",
          statusCode,
          durationMs
        });
        if (statusCode >= 500) this.logger.error("http.request", fields);
        else if (statusCode >= 400) this.logger.warn("http.request", fields);
        else this.logger.info("http.request", fields);
      })
    );
  }
}
