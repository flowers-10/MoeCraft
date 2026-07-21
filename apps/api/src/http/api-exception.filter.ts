import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from "@nestjs/common";
import type { ApiErrorResponse } from "@moecraft/shared";
import { resolveApiErrorCode } from "./api-error-code";
import { ensureRequestId } from "./request-id";
import { StructuredLogger } from "../observability/structured-logger";
import { TelemetryExporter } from "../observability/telemetry-exporter";
import { ensureTraceContext } from "../observability/trace-context";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger, private readonly telemetry: TelemetryExporter) {}

  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; requestId?: string; traceId?: string }>();
    const response = host.switchToHttp().getResponse<{ status(code: number): { json(body: ApiErrorResponse): void }; setHeader(name: string, value: string): void }>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    const object = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const requestId = ensureRequestId(request, response);
    const traceId = ensureTraceContext(request, response);
    const rawMessage = object.message ?? (typeof payload === "string" ? payload : undefined);
    const isInternal = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isInternal ? "INTERNAL_ERROR" : Array.isArray(rawMessage) ? rawMessage.join("; ") : String(rawMessage ?? "REQUEST_FAILED");
    const code = resolveApiErrorCode(status, payload);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const fields = { requestId, traceId, statusCode: status, code, errorName };
    if (isInternal) this.logger.error("http.exception", fields);
    else this.logger.warn("http.exception", fields);
    void this.telemetry.export({
      type: "http.exception",
      timestamp: new Date().toISOString(),
      service: "moecraft-api",
      environment: process.env.SERVICE_ENVIRONMENT ?? "local",
      traceId,
      requestId,
      statusCode: status,
      code,
      errorName
    });
    response.status(status).json({ code, message, resultData: null, requestId });
  }
}
