import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDirectory = resolve(root, "apps/api");
const migrationsDirectory = resolve(apiDirectory, "prisma/migrations");
const schemaPath = resolve(apiDirectory, "prisma/schema.prisma");
const schemaVersionPath = resolve(apiDirectory, "src/prisma/schema-version.ts");

if (!existsSync(schemaPath) || !existsSync(schemaVersionPath) || !existsSync(resolve(migrationsDirectory, "migration_lock.toml"))) {
  console.error("Prisma schema, schema version contract, or migration lock is missing");
  process.exit(1);
}

const migrationNames = readdirSync(migrationsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const migrations = migrationNames.map((name) => resolve(migrationsDirectory, name, "migration.sql"));
if (migrations.length === 0 || migrations.some((file) => !existsSync(file) || readFileSync(file, "utf8").trim().length === 0)) {
  console.error("Every Prisma migration directory must contain a non-empty migration.sql");
  process.exit(1);
}

const schemaVersionSource = readFileSync(schemaVersionPath, "utf8");
const versionMatches = [...schemaVersionSource.matchAll(/export const REQUIRED_DATABASE_MIGRATION\s*=\s*"([^"]+)"\s*;/gu)];
const latestMigration = migrationNames.at(-1);
if (versionMatches.length !== 1 || versionMatches[0][1] !== latestMigration) {
  console.error(`REQUIRED_DATABASE_MIGRATION must match latest Prisma migration: ${latestMigration}`);
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
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
execFileSync(pnpmCommand, ["exec", "prisma", "validate", "--schema", "prisma/schema.prisma"], {
  cwd: apiDirectory,
  env: environment,
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (!process.env.SHADOW_DATABASE_URL) {
  console.warn("SHADOW_DATABASE_URL is not set; live migration diff skipped after static compatibility checks");
  process.exit(0);
}

const diff = spawnSync(pnpmCommand, [
  "exec", "prisma", "migrate", "diff",
  "--from-migrations", "prisma/migrations",
  "--to-schema-datamodel", "prisma/schema.prisma",
  "--shadow-database-url", process.env.SHADOW_DATABASE_URL,
  "--exit-code"
], { cwd: apiDirectory, env: environment, shell: process.platform === "win32", stdio: "inherit" });

if (diff.status !== 0) {
  console.error("Prisma migrations are not in sync with schema.prisma");
  process.exit(diff.status ?? 1);
}
console.log("Prisma migration history matches schema.prisma");
