import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { ApiResponse } from "@moecraft/shared";
import { map, type Observable } from "rxjs";
import { randomUUID } from "node:crypto";

@Injectable()
export class ApiResponseInterceptor<Data> implements NestInterceptor<Data, ApiResponse<Data>> {
  intercept(context: ExecutionContext, next: CallHandler<Data>): Observable<ApiResponse<Data>> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    const incoming = request.headers["x-request-id"];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    response.setHeader("X-Request-Id", requestId);
    return next.handle().pipe(map((resultData) => ({ code: 0, message: "OK", resultData, requestId })));
  }
}
