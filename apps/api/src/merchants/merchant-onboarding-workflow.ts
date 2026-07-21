import type { MerchantApplicationStatus } from "@moecraft/shared";

export const MERCHANT_APPLICATION_TRANSITIONS: Readonly<Record<MerchantApplicationStatus, readonly MerchantApplicationStatus[]>> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["NEEDS_CHANGES", "APPROVED", "REJECTED", "WITHDRAWN"],
  NEEDS_CHANGES: ["SUBMITTED", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: []
};

export function canTransitionMerchantApplication(from: MerchantApplicationStatus, to: MerchantApplicationStatus): boolean {
  return MERCHANT_APPLICATION_TRANSITIONS[from].includes(to);
}
