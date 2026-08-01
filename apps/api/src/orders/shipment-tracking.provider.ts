import type { ShipmentTrackingEvent } from "@moecraft/shared";

export type TrackingQuery = { carrier: string; trackingNumber: string; shippedAt: Date };

/** 物流轨迹查询适配器：沙箱环境使用确定性本地轨迹，生产可替换为真实物流商 API。 */
export interface ShipmentTrackingProvider {
  track(query: TrackingQuery): Promise<ShipmentTrackingEvent[]>;
}
