import { Injectable } from "@nestjs/common";

export type ApiMetricsSnapshot = Readonly<{
  requestsTotal: number;
  errorsTotal: number;
  averageDurationMs: number;
  statusBuckets: Readonly<Record<string, number>>;
  uptimeSeconds: number;
  commerce: Readonly<{
    counters: Readonly<Record<string, number>>;
    gauges: Readonly<Record<string, number>>;
    alerts: readonly Readonly<{ code: string; severity: "warning" | "critical"; value: number; threshold: number }>[];
  }>;
}>;

export type CommerceMetric =
  | "checkout_quote_success" | "checkout_quote_failure" | "order_create_success" | "order_create_failure"
  | "inventory_lock_failure" | "payment_success" | "payment_failure" | "payment_webhook_duplicate"
  | "shipment_created" | "job_completed" | "job_dead_letter";

@Injectable()
export class ApiMetricsService {
  private readonly startedAt = Date.now();
  private requestsTotal = 0;
  private errorsTotal = 0;
  private durationTotalMs = 0;
  private readonly statusBuckets = new Map<string, number>();
  private readonly commerceCounters = new Map<CommerceMetric, number>();
  private readonly commerceGauges = new Map<string, number>();

  recordRequest(statusCode: number, durationMs: number): void {
    const bucket = `${Math.floor(statusCode / 100)}xx`;
    this.requestsTotal += 1;
    this.durationTotalMs += durationMs;
    if (statusCode >= 500) this.errorsTotal += 1;
    this.statusBuckets.set(bucket, (this.statusBuckets.get(bucket) ?? 0) + 1);
  }

  recordCommerce(metric: CommerceMetric, amount = 1): void {
    this.commerceCounters.set(metric, (this.commerceCounters.get(metric) ?? 0) + amount);
  }

  setCommerceGauge(metric: "payment_webhook_backlog" | "jobs_due" | "jobs_dead_letter", value: number): void {
    this.commerceGauges.set(metric, Math.max(0, value));
  }

  snapshot(): ApiMetricsSnapshot {
    const counters=Object.fromEntries(this.commerceCounters);
    const gauges=Object.fromEntries(this.commerceGauges);
    const alerts:Array<{code:string;severity:"warning"|"critical";value:number;threshold:number}>=[];
    const backlog=gauges.payment_webhook_backlog??0,deadLetters=gauges.jobs_dead_letter??0,inventoryFailures=counters.inventory_lock_failure??0;
    if(backlog>0)alerts.push({code:"PAYMENT_WEBHOOK_BACKLOG",severity:"critical",value:backlog,threshold:0});
    if(deadLetters>0)alerts.push({code:"JOB_DEAD_LETTERS",severity:"warning",value:deadLetters,threshold:0});
    if(inventoryFailures>0)alerts.push({code:"INVENTORY_LOCK_FAILURES",severity:"warning",value:inventoryFailures,threshold:0});
    return {
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      averageDurationMs: this.requestsTotal === 0 ? 0 : Math.round((this.durationTotalMs / this.requestsTotal) * 100) / 100,
      statusBuckets: Object.fromEntries(this.statusBuckets),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      commerce:{counters,gauges,alerts}
    };
  }
}
