const DEFAULT_PORT = 3102;
const DEFAULT_CORS_ORIGINS = ["http://localhost:3100", "http://localhost:3101"];

export type AppEnvironment = {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  PORT: number;
  CORS_ORIGINS: string[];
  SERVICE_ENVIRONMENT: string;
  TELEMETRY_EXPORT_URL: string | null;
  TELEMETRY_EXPORT_TOKEN: string | null;
};

function requireValue(environment: Record<string, unknown>, key: string): string {
  const value = environment[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value.trim();
}

function parsePort(value: unknown): number {
  if (value === undefined || value === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Environment variable PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parseOrigins(value: unknown): string[] {
  if (value === undefined || value === "") {
    return DEFAULT_CORS_ORIGINS;
  }

  if (typeof value !== "string") {
    throw new Error("Environment variable CORS_ORIGINS must be a comma-separated string");
  }

  const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);

  if (origins.length === 0 || origins.some((origin) => !URL.canParse(origin))) {
    throw new Error("Environment variable CORS_ORIGINS contains an invalid URL");
  }

  return origins;
}

function parseJwtDuration(environment: Record<string, unknown>): string {
  const value = requireValue(environment, "JWT_ACCESS_EXPIRES_IN");
  if (!/^\d+(?:ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error("Environment variable JWT_ACCESS_EXPIRES_IN must be a duration such as 15m or 8h");
  }
  return value;
}

function optionalValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalUrl(value: unknown): string | null {
  const url = optionalValue(value);
  if (url && !URL.canParse(url)) throw new Error("Environment variable TELEMETRY_EXPORT_URL must be a valid URL");
  return url;
}

export function validateEnvironment(environment: Record<string, unknown>): AppEnvironment {
  const databaseUrl = requireValue(environment, "DATABASE_URL");
  const jwtAccessSecret = requireValue(environment, "JWT_ACCESS_SECRET");

  if (!databaseUrl.startsWith("mysql://")) {
    throw new Error("Environment variable DATABASE_URL must use the mysql:// protocol");
  }

  if (jwtAccessSecret.length < 32 || jwtAccessSecret.startsWith("<")) {
    throw new Error("Environment variable JWT_ACCESS_SECRET must contain at least 32 non-placeholder characters");
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_EXPIRES_IN: parseJwtDuration(environment),
    PORT: parsePort(environment.PORT),
    CORS_ORIGINS: parseOrigins(environment.CORS_ORIGINS),
    SERVICE_ENVIRONMENT: optionalValue(environment.SERVICE_ENVIRONMENT) ?? "local",
    TELEMETRY_EXPORT_URL: parseOptionalUrl(environment.TELEMETRY_EXPORT_URL),
    TELEMETRY_EXPORT_TOKEN: optionalValue(environment.TELEMETRY_EXPORT_TOKEN)
  };
}
