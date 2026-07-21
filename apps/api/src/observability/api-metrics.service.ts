import { Injectable } from "@nestjs/common";

export type ApiMetricsSnapshot = Readonly<{
  requestsTotal: number;
  errorsTotal: number;
  averageDurationMs: number;
  statusBuckets: Readonly<Record<string, number>>;
  uptimeSeconds: number;
}>;

@Injectable()
export class ApiMetricsService {
  private readonly startedAt = Date.now();
  private requestsTotal = 0;
  private errorsTotal = 0;
  private durationTotalMs = 0;
  private readonly statusBuckets = new Map<string, number>();

  recordRequest(statusCode: number, durationMs: number): void {
    const bucket = `${Math.floor(statusCode / 100)}xx`;
    this.requestsTotal += 1;
    this.durationTotalMs += durationMs;
    if (statusCode >= 500) this.errorsTotal += 1;
    this.statusBuckets.set(bucket, (this.statusBuckets.get(bucket) ?? 0) + 1);
  }

  snapshot(): ApiMetricsSnapshot {
    return {
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      averageDurationMs: this.requestsTotal === 0 ? 0 : Math.round((this.durationTotalMs / this.requestsTotal) * 100) / 100,
      statusBuckets: Object.fromEntries(this.statusBuckets),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000)
    };
  }
}
