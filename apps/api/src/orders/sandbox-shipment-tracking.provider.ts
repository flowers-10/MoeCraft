import { Injectable } from "@nestjs/common";
import type { ShipmentTrackingEvent } from "@moecraft/shared";
import { sandboxTrackingEvents } from "./shipment-domain";
import type { ShipmentTrackingProvider, TrackingQuery } from "./shipment-tracking.provider";

@Injectable()
export class SandboxShipmentTrackingProvider implements ShipmentTrackingProvider {
  track(query: TrackingQuery): Promise<ShipmentTrackingEvent[]> {
    return Promise.resolve(sandboxTrackingEvents(query.carrier, query.trackingNumber, query.shippedAt));
  }
}
