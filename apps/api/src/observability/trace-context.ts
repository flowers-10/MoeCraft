import { randomBytes } from "node:crypto";

type TraceRequest = {
  headers: Record<string, string | string[] | undefined>;
  traceId?: string;
};

type TraceResponse = {
  setHeader(name: string, value: string): void;
};

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export function ensureTraceContext(request: TraceRequest, response: TraceResponse): string {
  const incoming = request.headers.traceparent;
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const match = candidate?.match(TRACEPARENT_PATTERN);
  const incomingTraceId = match?.[1];
  const traceId = request.traceId ?? (incomingTraceId && !/^0+$/.test(incomingTraceId) ? incomingTraceId : randomBytes(16).toString("hex"));
  const spanId = randomBytes(8).toString("hex");

  request.traceId = traceId;
  response.setHeader("traceparent", `00-${traceId}-${spanId}-01`);
  return traceId;
}
