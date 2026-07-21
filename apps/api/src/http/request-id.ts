import { randomUUID } from "node:crypto";

type RequestWithId = {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type ResponseWithHeaders = {
  setHeader(name: string, value: string): void;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function ensureRequestId(request: RequestWithId, response: ResponseWithHeaders): string {
  const incoming = request.headers["x-request-id"];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId = request.requestId ?? (candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID());

  request.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  return requestId;
}
