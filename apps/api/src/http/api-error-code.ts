import { HttpStatus } from "@nestjs/common";

const DOMAIN_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

function domainCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.split(":", 1)[0];
  return DOMAIN_CODE_PATTERN.test(code) ? code : undefined;
}

export function resolveApiErrorCode(status: number, response: unknown): string {
  const directCode = domainCode(response);
  if (directCode) return directCode;
  const object = typeof response === "object" && response !== null ? response as Record<string, unknown> : {};
  const explicitCode = domainCode(object.code);
  if (explicitCode) return explicitCode;
  const messageCode = domainCode(object.message);
  if (messageCode) return messageCode;

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "VALIDATION_FAILED";
    case HttpStatus.UNAUTHORIZED:
      return "AUTHENTICATION_REQUIRED";
    case HttpStatus.FORBIDDEN:
      return "PERMISSION_DENIED";
    case HttpStatus.NOT_FOUND:
      return "RESOURCE_NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return "INTERNAL_ERROR";
    default:
      return "REQUEST_FAILED";
  }
}
