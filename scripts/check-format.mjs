import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const textExtensions = /\.(css|html|js|json|md|mjs|prisma|scss|sh|sql|ts|tsx|vue|yml|yaml)$/u;
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file && textExtensions.test(file));
const errors = [];

for (const file of files) {
  const contents = readFileSync(file);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch {
    errors.push(`${file}: invalid UTF-8`);
    continue;
  }

  if (/\r\n/u.test(text)) errors.push(`${file}: CRLF line endings`);
  if (/^[ \t]+$/mu.test(text)) errors.push(`${file}: trailing whitespace`);
  if (contents.length > 0 && !text.endsWith("\n")) errors.push(`${file}: missing final newline`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`format check passed (${files.length} tracked text files)`);
}
