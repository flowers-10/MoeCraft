import type { AfterSaleStatus, OrderStatus } from "./statuses";

export const AFTER_SALE_TYPES = ["REFUND_ONLY", "RETURN_REFUND"] as const;
export type AfterSaleType = (typeof AFTER_SALE_TYPES)[number];

export const AFTER_SALE_TRANSITIONS: Readonly<Record<AfterSaleStatus, readonly AfterSaleStatus[]>> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["AWAITING_RETURN", "REFUND_PROCESSING", "CANCELLED"],
  REJECTED: [],
  AWAITING_RETURN: ["RETURNED", "CANCELLED"],
  RETURNED: ["REFUND_PROCESSING", "CANCELLED"],
  REFUND_PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export function canTransitionAfterSale(from: AfterSaleStatus, to: AfterSaleStatus): boolean {
  return AFTER_SALE_TRANSITIONS[from].includes(to);
}

export const AFTER_SALE_ELIGIBLE_ORDER_STATUSES: readonly OrderStatus[] = [
  "PAID", "PARTIALLY_SHIPPED", "SHIPPED", "COMPLETED"
];

export type AfterSaleEvidence = {
  fileIds: string[];
  description: string;
};

export type AfterSaleView = {
  id: string;
  afterSaleNumber: string;
  userId: string;
  buyerDisplayName: string;
  type: AfterSaleType;
  status: AfterSaleStatus;
  reason: string;
  description: string;
  refundAmount: string;
  evidence: AfterSaleEvidence[];
  returnCarrier: string | null;
  returnTrackingNumber: string | null;
  returnShippedAt: string | null;
  merchantNote: string | null;
  platformNote: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  orderNumber: string;
  merchantOrderId: string;
  merchantId: string;
  storeId: string;
  storeName: string;
  orderItemId: string;
  productTitle: string;
  skuName: string;
  coverFileId: string | null;
  quantity: number;
  buyerActions: AfterSaleBuyerAction[];
  adminActions: AfterSaleAdminAction[];
};

export type AfterSaleBuyerAction = "CANCEL" | "SHIP_RETURN";
export type AfterSaleAdminAction = "APPROVE" | "REJECT" | "CONFIRM_RETURNED" | "REFUND"
  | "PLATFORM_APPROVE" | "PLATFORM_REJECT" | "PLATFORM_REFUND";

export type AfterSaleListItem = Pick<AfterSaleView,
  "id" | "afterSaleNumber" | "type" | "status" | "reason" | "refundAmount"
  | "storeName" | "productTitle" | "skuName" | "coverFileId" | "quantity"
  | "createdAt" | "updatedAt"
>;
