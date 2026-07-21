import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const sourceExtensions = /\.(js|mjs|ts|tsx|vue)$/u;
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file && /^(?:apps|packages)\//u.test(file) && sourceExtensions.test(file) && !file.includes("/dist/") && !file.includes("/openapi/"));
const rules = [
  { pattern: /\bdebugger\b/u, label: "debugger statement" },
  { pattern: /console\.log\s*\(/u, label: "console.log" },
  { pattern: /:\s*any\b|\bas\s+any\b/u, label: "implicit any escape" }
];
const errors = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const rule of rules) {
    if (rule.pattern.test(text)) errors.push(`${file}: ${rule.label}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`static check passed (${files.length} source files)`);
}
