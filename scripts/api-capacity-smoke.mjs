import { randomUUID } from "node:crypto";

const target = new URL(process.env.TARGET_URL ?? "http://127.0.0.1:3102/health");
const requests = parseInteger("REQUESTS", 50, 1, 10_000);
const concurrency = parseInteger("CONCURRENCY", 10, 1, 200);
const timeoutMs = parseInteger("REQUEST_TIMEOUT_MS", 2_000, 100, 30_000);
const p95LimitMs = parseInteger("P95_LIMIT_MS", 500, 1, 60_000);
const loopback = new Set(["127.0.0.1", "localhost", "::1"]);

if (!loopback.has(target.hostname) && process.env.ALLOW_REMOTE_LOAD !== "true") {
  throw new Error("capacity smoke only permits loopback targets; set ALLOW_REMOTE_LOAD=true for an explicitly approved environment");
}

function parseInteger(name, fallback, min, max) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return value;
}

async function request() {
  const startedAt = performance.now();
  try {
    const response = await fetch(target, { headers: { "X-Request-Id": randomUUID() }, signal: AbortSignal.timeout(timeoutMs) });
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status, durationMs: performance.now() - startedAt };
  } catch (error) {
    return { ok: false, status: 0, durationMs: performance.now() - startedAt, error: error instanceof Error ? error.name : "UnknownError" };
  }
}

const durations = [];
const failures = [];
let nextRequest = 0;
let totalFailures = 0;
async function worker() {
  while (nextRequest < requests) {
    const index = nextRequest;
    nextRequest += 1;
    const result = await request();
    durations.push(result.durationMs);
    if (!result.ok) {
      totalFailures += 1;
      if (failures.length < 10) failures.push({ index, status: result.status, error: result.error });
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
const elapsedMs = performance.now() - startedAt;
durations.sort((left, right) => left - right);
const percentile = (ratio) => durations[Math.max(0, Math.ceil(durations.length * ratio) - 1)] ?? 0;
const result = {
  target: target.toString(),
  requests,
  concurrency: Math.min(concurrency, requests),
  failures: totalFailures,
  p50Ms: Math.round(percentile(0.5) * 100) / 100,
  p95Ms: Math.round(percentile(0.95) * 100) / 100,
  p99Ms: Math.round(percentile(0.99) * 100) / 100,
  throughputPerSecond: Math.round((requests / (elapsedMs / 1_000)) * 100) / 100,
  elapsedMs: Math.round(elapsedMs * 100) / 100,
  failureSamples: failures
};
console.log(JSON.stringify(result, null, 2));
if (result.failures > 0 || result.p95Ms > p95LimitMs) process.exitCode = 1;
