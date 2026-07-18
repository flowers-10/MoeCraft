import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { MerchantApplicationStatus, MerchantApplicationView } from "@moecraft/shared";
import { Prisma, type MerchantApplication } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ReviewMerchantApplicationDto, SaveMerchantApplicationDto, SetMerchantStatusDto } from "./merchant-onboarding.dto";

const TRANSITIONS: Record<MerchantApplicationStatus, readonly MerchantApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"], SUBMITTED: ["NEEDS_CHANGES", "APPROVED", "REJECTED", "WITHDRAWN"],
  NEEDS_CHANGES: ["SUBMITTED", "WITHDRAWN"], APPROVED: [], REJECTED: [], WITHDRAWN: []
};
const canTransition = (from: MerchantApplicationStatus, to: MerchantApplicationStatus) => TRANSITIONS[from].includes(to);

@Injectable()
export class MerchantOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(applicantId: string): Promise<MerchantApplicationView | null> {
    const application = await this.prisma.merchantApplication.findFirst({
      where: { applicantId }, orderBy: { createdAt: "desc" }, include: { timeline: { orderBy: { createdAt: "asc" } } }
    });
    if (!application) return null;
    const merchant = await this.prisma.merchant.findUnique({ where: { ownerId: applicantId } });
    return this.toView(application, merchant?.status ?? null);
  }

  async saveDraft(applicantId: string, dto: SaveMerchantApplicationDto): Promise<MerchantApplicationView> {
    const current = await this.prisma.merchantApplication.findFirst({ where: { applicantId }, orderBy: { createdAt: "desc" } });
    if (current && !["DRAFT", "NEEDS_CHANGES", "REJECTED", "WITHDRAWN"].includes(current.status)) {
      throw new ConflictException("MERCHANT_APPLICATION_ALREADY_ACTIVE");
    }
    if (current?.status === "APPROVED") throw new ConflictException("MERCHANT_ALREADY_APPROVED");
    await this.validateFiles(applicantId, dto.qualificationFileIds);
    const data = { ...dto, qualificationFileIds: dto.qualificationFileIds as Prisma.InputJsonValue, reviewComment: null };
    const application = current && ["DRAFT", "NEEDS_CHANGES"].includes(current.status)
      ? await this.prisma.merchantApplication.update({ where: { id: current.id }, data, include: { timeline: { orderBy: { createdAt: "asc" } } } })
      : await this.prisma.merchantApplication.create({
          data: { ...data, applicantId, timeline: { create: { actorId: applicantId, toStatus: "DRAFT", comment: "Application created" } } },
          include: { timeline: { orderBy: { createdAt: "asc" } } }
        });
    return this.toView(application);
  }

  async submit(applicantId: string): Promise<MerchantApplicationView> {
    const application = await this.latestOwned(applicantId);
    if (!canTransition(application.status, "SUBMITTED")) throw new BadRequestException("INVALID_APPLICATION_TRANSITION");
    if (!application.agreementAccepted || this.fileIds(application).length === 0) throw new BadRequestException("APPLICATION_INCOMPLETE");
    await this.validateFiles(applicantId, this.fileIds(application));
    return this.transition(application, applicantId, "SUBMITTED", "Application submitted", { submittedAt: new Date(), reviewComment: null });
  }

  async withdraw(applicantId: string): Promise<MerchantApplicationView> {
    const application = await this.latestOwned(applicantId);
    if (!canTransition(application.status, "WITHDRAWN")) throw new BadRequestException("INVALID_APPLICATION_TRANSITION");
    return this.transition(application, applicantId, "WITHDRAWN", "Application withdrawn");
  }

  async queue(status?: MerchantApplicationStatus): Promise<MerchantApplicationView[]> {
    const applications = await this.prisma.merchantApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }], include: { timeline: { orderBy: { createdAt: "asc" } } }
    });
    const merchants = await this.prisma.merchant.findMany({ where: { ownerId: { in: applications.map((item) => item.applicantId) } } });
    const merchantStatuses = new Map(merchants.map((merchant) => [merchant.ownerId, merchant.status]));
    return applications.map((item) => this.toView(item, merchantStatuses.get(item.applicantId) ?? null));
  }

  async review(id: string, reviewerId: string, dto: ReviewMerchantApplicationDto): Promise<MerchantApplicationView> {
    const application = await this.prisma.merchantApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException("MERCHANT_APPLICATION_NOT_FOUND");
    const target: MerchantApplicationStatus = dto.decision === "APPROVE" ? "APPROVED" : dto.decision === "REJECT" ? "REJECTED" : "NEEDS_CHANGES";
    if (!canTransition(application.status, target)) throw new BadRequestException("INVALID_APPLICATION_TRANSITION");
    if (target !== "APPROVED" && !dto.comment?.trim()) throw new BadRequestException("REVIEW_COMMENT_REQUIRED");

    const result = await this.prisma.$transaction(async (tx) => {
      if (target === "APPROVED") {
        const existing = await tx.merchant.findUnique({ where: { ownerId: application.applicantId } });
        if (existing) throw new ConflictException("MERCHANT_ALREADY_APPROVED");
        await tx.merchant.create({ data: { ownerId: application.applicantId, name: application.companyName, members: { create: { userId: application.applicantId, role: "OWNER" } } } });
        await tx.userRole.upsert({
          where: { userId_role: { userId: application.applicantId, role: "MERCHANT_OWNER" } },
          update: {}, create: { userId: application.applicantId, role: "MERCHANT_OWNER" }
        });
      }
      const updated = await tx.merchantApplication.update({
        where: { id }, data: { status: target, reviewerId, reviewComment: dto.comment?.trim() || null, reviewedAt: new Date() },
        include: { timeline: { orderBy: { createdAt: "asc" } } }
      });
      await tx.merchantApplicationTimeline.create({ data: { applicationId: id, actorId: reviewerId, fromStatus: application.status, toStatus: target, comment: dto.comment?.trim() || null } });
      await tx.auditLog.create({ data: { actorId: reviewerId, action: `merchant.application.${target.toLowerCase()}`, targetType: "MerchantApplication", targetId: id, metadata: { from: application.status, to: target } } });
      return tx.merchantApplication.findUniqueOrThrow({ where: { id: updated.id }, include: { timeline: { orderBy: { createdAt: "asc" } } } });
    });
    return this.toView(result, target === "APPROVED" ? "ACTIVE" : null);
  }

  async setMerchantStatus(id: string, actorId: string, dto: SetMerchantStatusDto): Promise<{ status: "ACTIVE" | "SUSPENDED" }> {
    const application = await this.prisma.merchantApplication.findUnique({ where: { id } });
    if (!application || application.status !== "APPROVED") throw new NotFoundException("APPROVED_MERCHANT_NOT_FOUND");
    const merchant = await this.prisma.merchant.findUnique({ where: { ownerId: application.applicantId } });
    if (!merchant) throw new NotFoundException("APPROVED_MERCHANT_NOT_FOUND");
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.merchant.update({ where: { id: merchant.id }, data: { status: dto.status } });
      await tx.auditLog.create({ data: { actorId, action: `merchant.${dto.status.toLowerCase()}`, targetType: "Merchant", targetId: merchant.id, metadata: { reason: dto.reason } } });
      return result;
    });
    return { status: dto.status };
  }

  private async transition(application: MerchantApplication, actorId: string, toStatus: MerchantApplicationStatus, comment: string, data: Record<string, unknown> = {}) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.merchantApplication.update({ where: { id: application.id }, data: { ...data, status: toStatus } });
      await tx.merchantApplicationTimeline.create({ data: { applicationId: application.id, actorId, fromStatus: application.status, toStatus, comment } });
      await tx.auditLog.create({ data: { actorId, action: `merchant.application.${toStatus.toLowerCase()}`, targetType: "MerchantApplication", targetId: application.id, metadata: { from: application.status, to: toStatus } } });
      return tx.merchantApplication.findUniqueOrThrow({ where: { id: application.id }, include: { timeline: { orderBy: { createdAt: "asc" } } } });
    });
    return this.toView(result);
  }

  private async latestOwned(applicantId: string) {
    const application = await this.prisma.merchantApplication.findFirst({ where: { applicantId }, orderBy: { createdAt: "desc" } });
    if (!application) throw new NotFoundException("MERCHANT_APPLICATION_NOT_FOUND");
    return application;
  }

  private async validateFiles(ownerId: string, ids: string[]) {
    if (new Set(ids).size !== ids.length) throw new BadRequestException("DUPLICATE_QUALIFICATION_FILE");
    if (!ids.length) return;
    const count = await this.prisma.fileAsset.count({ where: { id: { in: ids }, ownerId, purpose: "merchant-qualification", status: { notIn: ["QUARANTINED", "DELETED"] } } });
    if (count !== ids.length) throw new BadRequestException("INVALID_QUALIFICATION_FILE");
  }

  private fileIds(application: MerchantApplication): string[] {
    return Array.isArray(application.qualificationFileIds) ? application.qualificationFileIds.filter((id): id is string => typeof id === "string") : [];
  }

  private toView(application: MerchantApplication & { timeline: Array<{ id: string; actorId: string; fromStatus: MerchantApplicationStatus | null; toStatus: MerchantApplicationStatus; comment: string | null; createdAt: Date }> }, merchantStatus: "ACTIVE" | "SUSPENDED" | "CLOSED" | null = null): MerchantApplicationView {
    return { ...application, merchantStatus, qualificationFileIds: this.fileIds(application), submittedAt: application.submittedAt?.toISOString() ?? null, reviewedAt: application.reviewedAt?.toISOString() ?? null, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString(), timeline: application.timeline.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) };
  }
}
