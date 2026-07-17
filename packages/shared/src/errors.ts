export const ERROR_CODES = {
  authenticationRequired: "AUTHENTICATION_REQUIRED",
  invalidCredentials: "INVALID_CREDENTIALS",
  permissionDenied: "PERMISSION_DENIED",
  resourceNotFound: "RESOURCE_NOT_FOUND",
  validationFailed: "VALIDATION_FAILED",
  conflict: "CONFLICT",
  rateLimited: "RATE_LIMITED",
  idempotencyConflict: "IDEMPOTENCY_CONFLICT",
  inventoryUnavailable: "INVENTORY_UNAVAILABLE",
  invalidStateTransition: "INVALID_STATE_TRANSITION",
  internalError: "INTERNAL_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
