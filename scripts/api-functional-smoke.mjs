const target = new URL(process.env.TARGET_URL ?? "http://127.0.0.1:3102");
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (!localHosts.has(target.hostname) && process.env.ALLOW_REMOTE_SMOKE !== "1") {
  console.error("Remote smoke checks require ALLOW_REMOTE_SMOKE=1");
  process.exit(1);
}

const checks = [
  ["health", "/health"],
  ["readiness", "/readiness"],
  ["public catalog", "/api/v1/catalog/public"],
  ["public product list", "/api/v1/catalog/products?page=1&pageSize=1"]
];

for (const [name, path] of checks) {
  const response = await fetch(new URL(path, target), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.code !== 0) {
    console.error(`FAIL ${name}: HTTP ${response.status} ${body?.message ?? "INVALID_RESPONSE"}`);
    process.exit(1);
  }
  console.log(`PASS ${name}: HTTP ${response.status}`);
}
