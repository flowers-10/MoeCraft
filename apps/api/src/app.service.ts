import type { AppHealth } from "@moecraft/shared";

export class AppService {
  getHealth(): AppHealth {
    return {
      name: "MoeCraft API",
      status: "ok",
      time: new Date().toISOString()
    };
  }
}
  