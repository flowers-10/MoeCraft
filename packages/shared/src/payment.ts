import type { PaymentStatus } from "./statuses";
export type PaymentView = {
  id: string; orderId: string; orderNumber: string; status: PaymentStatus; provider: string;
  providerPaymentId: string | null; amount: string; currency: string; expiresAt: string;
  paidAt: string | null; updatedAt: string;
};
export type SandboxPaymentResult = "SUCCEEDED" | "FAILED" | "CANCELLED";
