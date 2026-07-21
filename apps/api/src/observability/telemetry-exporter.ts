import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";

export type TelemetryEvent = Readonly<{
  type: "http.request" | "http.exception";
  timestamp: string;
  service: "moecraft-api";
  environment: string;
  traceId: string;
  requestId: string;
  method?: string;
  path?: string;
  statusCode: number;
  durationMs?: number;
  code?: string;
  errorName?: string;
}>;

@Injectable()
export class TelemetryExporter {
  constructor(private readonly config: ConfigService<AppEnvironment, true>) {}

  async export(event: TelemetryEvent): Promise<void> {
    const url = this.config.get("TELEMETRY_EXPORT_URL", { infer: true });
    if (!url) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    const token = this.config.get("TELEMETRY_EXPORT_TOKEN", { infer: true });
    try {
      await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(event)
      });
    } catch {
      // Telemetry delivery must never affect the request path.
    } finally {
      clearTimeout(timeout);
    }
  }
}
