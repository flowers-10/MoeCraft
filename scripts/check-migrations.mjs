import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const apiDirectory = resolve(root, "apps/api");
const migrationsDirectory = resolve(apiDirectory, "prisma/migrations");
const schemaPath = resolve(apiDirectory, "prisma/schema.prisma");

if (!existsSync(schemaPath) || !existsSync(resolve(migrationsDirectory, "migration_lock.toml"))) {
  console.error("Prisma schema or migration lock is missing");
  process.exit(1);
}

const migrations = readdirSync(migrationsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(migrationsDirectory, entry.name, "migration.sql"));
if (migrations.length === 0 || migrations.some((file) => !existsSync(file) || readFileSync(file, "utf8").trim().length === 0)) {
  console.error("Every Prisma migration directory must contain a non-empty migration.sql");
  process.exit(1);
}

for (const file of migrations) {
  if (/\bDROP\s+(?:TABLE|COLUMN|DATABASE)\b|\bTRUNCATE\b/iu.test(readFileSync(file, "utf8"))) {
    console.error(`${file}: destructive SQL requires an explicit reviewed migration and is blocked by the default gate`);
    process.exit(1);
  }
}

const environment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "mysql://ci:ci@127.0.0.1:3306/moecraft"
};
execFileSync("pnpm", ["exec", "prisma", "validate", "--schema", "prisma/schema.prisma"], {
  cwd: apiDirectory,
  env: environment,
  stdio: "inherit"
});

if (!process.env.SHADOW_DATABASE_URL) {
  console.warn("SHADOW_DATABASE_URL is not set; live migration diff skipped after static compatibility checks");
  process.exit(0);
}

const diff = spawnSync("pnpm", [
  "exec", "prisma", "migrate", "diff",
  "--from-migrations", "prisma/migrations",
  "--to-schema-datamodel", "prisma/schema.prisma",
  "--shadow-database-url", process.env.SHADOW_DATABASE_URL,
  "--exit-code"
], { cwd: apiDirectory, env: environment, stdio: "inherit" });

if (diff.status !== 0) {
  console.error("Prisma migrations are not in sync with schema.prisma");
  process.exit(diff.status ?? 1);
}
console.log("Prisma migration history matches schema.prisma");
