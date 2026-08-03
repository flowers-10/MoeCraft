import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { AppModule } from "./app.module";
import { FavoriteModule } from "./favorites/favorite.module";
import { NotificationModule } from "./notifications/notification.module";
import { ReconciliationModule } from "./reconciliation/reconciliation.module";
import { ReviewModule } from "./reviews/review.module";
import { RiskModule } from "./risk/risk.module";

test("G28-G31 feature modules are mounted in the API application", () => {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
  for (const featureModule of [ReconciliationModule, ReviewModule, FavoriteModule, NotificationModule, RiskModule]) {
    assert.ok(imports.includes(featureModule), `${featureModule.name} is not mounted`);
  }
});
