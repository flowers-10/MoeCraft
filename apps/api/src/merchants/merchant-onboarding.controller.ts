import { Body, Controller, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import type { MerchantApplicationStatus, UserRole } from "@moecraft/shared";
import { RequirePermissions, RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { ReviewMerchantApplicationDto, SaveMerchantApplicationDto, SetMerchantStatusDto } from "./merchant-onboarding.dto";
import { MerchantOnboardingService } from "./merchant-onboarding.service";

const APPLICANT_ROLES: UserRole[] = ["CUSTOMER", "MERCHANT_OWNER"];
const REVIEW_QUEUE_STATUSES: MerchantApplicationStatus[] = ["SUBMITTED", "NEEDS_CHANGES", "APPROVED", "REJECTED"];

@Controller("merchant-applications")
export class MerchantOnboardingController {
  constructor(private readonly onboarding: MerchantOnboardingService) {}

  @Get("mine") @RequireRoles(...APPLICANT_ROLES)
  mine(@Req() request: { user: RequestPrincipal }) { return this.onboarding.mine(request.user.sub); }

  @Put("mine") @RequireRoles(...APPLICANT_ROLES)
  save(@Req() request: { user: RequestPrincipal }, @Body() dto: SaveMerchantApplicationDto) { return this.onboarding.saveDraft(request.user.sub, dto); }

  @Post("mine/submit") @RequireRoles(...APPLICANT_ROLES)
  submit(@Req() request: { user: RequestPrincipal }) { return this.onboarding.submit(request.user.sub); }

  @Post("mine/withdraw") @RequireRoles(...APPLICANT_ROLES)
  withdraw(@Req() request: { user: RequestPrincipal }) { return this.onboarding.withdraw(request.user.sub); }

  @Get() @RequirePermissions("merchant:review")
  queue(@Query("status") rawStatus?: string, @Query("page") rawPage = "1", @Query("pageSize") rawPageSize = "20") {
    const status = REVIEW_QUEUE_STATUSES.find((item) => item === rawStatus);
    const page = Math.max(Number.parseInt(rawPage, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(rawPageSize, 10) || 20, 1), 100);
    return this.onboarding.queue(status, page, pageSize);
  }

  @Post(":id/review") @RequirePermissions("merchant:review")
  review(@Param("id") id: string, @Req() request: { user: RequestPrincipal }, @Body() dto: ReviewMerchantApplicationDto) {
    return this.onboarding.review(id, request.user.sub, dto);
  }

  @Post(":id/merchant-status") @RequirePermissions("merchant:manage")
  setMerchantStatus(@Param("id") id: string, @Req() request: { user: RequestPrincipal }, @Body() dto: SetMerchantStatusDto) {
    return this.onboarding.setMerchantStatus(id, request.user.sub, dto);
  }
}
