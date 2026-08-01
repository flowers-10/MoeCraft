export const CARRIERS = [
  { code: "SF", name: "顺丰速运" },
  { code: "ZTO", name: "中通快递" },
  { code: "YTO", name: "圆通速递" },
  { code: "STO", name: "申通快递" },
  { code: "YD", name: "韵达快递" },
  { code: "JD", name: "京东物流" },
  { code: "EMS", name: "中国邮政 EMS" }
] as const;

export type CarrierCode = (typeof CARRIERS)[number]["code"];

export function carrierName(code: string): string {
  return CARRIERS.find((carrier) => carrier.code === code)?.name ?? code;
}

export type ShipmentStatus = "SHIPPED" | "DELIVERED";

export type ShipmentItemView = {
  id: string;
  orderItemId: string;
  quantity: number;
};

export type ShipmentView = {
  id: string;
  merchantOrderId: string;
  carrier: string;
  carrierName: string;
  trackingNumber: string;
  status: ShipmentStatus;
  note: string | null;
  shippedAt: string;
  deliveredAt: string | null;
  items: ShipmentItemView[];
};

export type ShipmentTrackingEvent = {
  status: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED";
  description: string;
  occurredAt: string;
};

export type ShipmentTrackingView = ShipmentView & {
  events: ShipmentTrackingEvent[];
};
