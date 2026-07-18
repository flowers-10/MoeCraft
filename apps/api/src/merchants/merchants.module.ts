import { Module } from "@nestjs/common";
import { MerchantOnboardingController } from "./merchant-onboarding.controller";
import { MerchantOnboardingService } from "./merchant-onboarding.service";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";

@Module({ controllers: [MerchantOnboardingController, StoreController], providers: [MerchantOnboardingService, StoreService] })
export class MerchantsModule {}
