import type { OrderStatus, PaymentStatus } from "./statuses";
import type { ShippingAddressSnapshot } from "./checkout";

export type OrderItemView = {
  id: string; merchantOrderId: string; storeId: string; skuId: string; productId: string;
  productTitle: string; skuName: string; coverFileId: string | null; quantity: number; currency: string;
  unitPrice: string; originalAmount: string; discountAmount: string; payableAmount: string;
};
export type MerchantOrderView = {
  id: string; merchantId: string; storeId: string; storeName: string; status: OrderStatus;
  originalAmount: string; shippingAmount: string; discountAmount: string; payableAmount: string; merchantNote: string | null; items: OrderItemView[];
};
export type OrderPaymentSummary = {
  id: string; status: PaymentStatus; provider: string; amount: string; currency: string; expiresAt: string;
};
export type OrderView = {
  id: string; orderNumber: string; userId: string; buyerDisplayName: string; buyerMaskedPhone: string;
  status: OrderStatus; currency: string; originalAmount: string; shippingAmount: string;
  discountAmount: string; payableAmount: string; address: ShippingAddressSnapshot;
  merchantOrders: MerchantOrderView[]; payment: OrderPaymentSummary; createdAt: string; updatedAt: string;
};
export type OrderListItem = Omit<OrderView, "address" | "merchantOrders"> & {
  storeNames: string[]; itemCount: number;
};
export type OrderExportTaskView = {
  id: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  downloadName: string | null; createdAt: string; completedAt: string | null; error: string | null;
};
