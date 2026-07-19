import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from "@nestjs/common";
import type { ApiErrorResponse } from "@moecraft/shared";
import { randomUUID } from "node:crypto";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const response = host.switchToHttp().getResponse<{ status(code: number): { json(body: ApiErrorResponse): void }; setHeader(name: string, value: string): void }>();
    const incoming = request.headers["x-request-id"];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    const object = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const rawMessage = object.message ?? (error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR");
    const message = Array.isArray(rawMessage) ? rawMessage.join("; ") : String(rawMessage);
    const code = typeof object.error === "string" ? object.error.toUpperCase().replaceAll(" ", "_") : status === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
    response.setHeader("X-Request-Id", requestId);
    response.status(status).json({ code, message, resultData: null, requestId });
  }
}
