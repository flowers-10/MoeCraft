import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { ApiResponse } from "@moecraft/shared";
import { map, type Observable } from "rxjs";
import { ensureRequestId } from "./request-id";

@Injectable()
export class ApiResponseInterceptor<Data> implements NestInterceptor<Data, ApiResponse<Data>> {
  intercept(context: ExecutionContext, next: CallHandler<Data>): Observable<ApiResponse<Data>> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; requestId?: string }>();
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    const requestId = ensureRequestId(request, response);
    return next.handle().pipe(map((resultData) => ({ code: 0, message: "OK", resultData, requestId })));
  }
}
