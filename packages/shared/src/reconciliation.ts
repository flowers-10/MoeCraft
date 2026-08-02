import type { PaymentStatus } from "./statuses";

export const REFUND_STATUSES = ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export type RefundView = {
  id: string;
  paymentIntentId: string;
  idempotencyKey: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerRefundId: string | null;
  amount: string;
  currency: string;
  status: RefundStatus;
  errorReason: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
};

export const RECONCILIATION_STATUSES = ["PENDING", "REVIEWING", "RESOLVED"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export type ReconciliationDiscrepancy = {
  orderNumber: string;
  expectedAmount: string;
  actualAmount: string;
  difference: string;
  type: "MISSING" | "EXTRA" | "MISMATCH";
};

export type ReconciliationView = {
  id: string;
  date: string;
  source: string;
  fileName: string;
  totalExpected: string;
  totalMatched: string;
  unmatchedCount: number;
  discrepancies: ReconciliationDiscrepancy[];
  status: ReconciliationStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconciliationListItem = Pick<ReconciliationView,
  "id" | "date" | "source" | "fileName" | "totalExpected" | "totalMatched" | "unmatchedCount" | "status" | "createdAt"
>;
