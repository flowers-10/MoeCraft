import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file && !file.endsWith(".env.example") && !file.endsWith("/openapi/api-v1.json"));
const rules = [
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u, label: "private key" },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/u, label: "AWS access key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/iu, label: "GitHub token" },
  { pattern: /\bsk-[A-Za-z0-9]{20,}\b/u, label: "API secret token" },
  { pattern: /(?:JWT_ACCESS_SECRET|TELEMETRY_EXPORT_TOKEN)\s*[:=]\s*["'](?!<|\$\{|$)[^"']{16,}["']/u, label: "environment secret" }
];
const errors = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const rule of rules) {
    if (rule.pattern.test(text)) errors.push(`${file}: possible ${rule.label}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`secret scan passed (${files.length} tracked files)`);
}
