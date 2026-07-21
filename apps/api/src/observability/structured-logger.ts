import { Injectable } from "@nestjs/common";

type LogFields = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token|credential|api[-_]?key|private[-_]?key)/i;

@Injectable()
export class StructuredLogger {
  info(event: string, fields: LogFields = {}): void {
    this.write("info", event, fields);
  }

  warn(event: string, fields: LogFields = {}): void {
    this.write("warn", event, fields);
  }

  error(event: string, fields: LogFields = {}): void {
    this.write("error", event, fields);
  }

  private write(level: LogLevel, event: string, fields: LogFields): void {
    const safeFields = this.sanitize(fields) as LogFields;
    const record = {
      ...safeFields,
      timestamp: new Date().toISOString(),
      level,
      service: "moecraft-api",
      environment: process.env.NODE_ENV ?? "development",
      event
    };
    const line = `${JSON.stringify(record)}\n`;
    if (level === "error") process.stderr.write(line);
    else process.stdout.write(line);
  }

  private sanitize(value: unknown, key?: string): unknown {
    if (key && SENSITIVE_KEY_PATTERN.test(key)) return "[REDACTED]";
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return value.toString();
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [entryKey, this.sanitize(entryValue, entryKey)])
    );
  }
}
