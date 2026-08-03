import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ReportView, RiskFlagView } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestPrincipal } from "../auth/authorization";

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  async listFlags(principal: RequestPrincipal, type?: string, resolved?: boolean): Promise<RiskFlagView[]> {
    if (!principal.roles.some(r => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const where: Prisma.RiskFlagWhereInput = {};
    if (type) where.type = type;
    if (resolved !== undefined) where.resolved = resolved;
    const rows = await this.prisma.riskFlag.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map(r => ({ id: r.id, userId: r.userId, ipAddress: r.ipAddress, type: r.type, severity: r.severity, metadata: r.metadata as RiskFlagView["metadata"], resolved: r.resolved, resolvedBy: r.resolvedBy, resolvedAt: r.resolvedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }));
  }

  async resolveFlag(principal: RequestPrincipal, id: string): Promise<RiskFlagView> {
    const flag = await this.prisma.riskFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException("RISK_FLAG_NOT_FOUND");
    const updated = await this.prisma.riskFlag.update({ where: { id }, data: { resolved: true, resolvedBy: principal.sub, resolvedAt: new Date() } });
    return { id: updated.id, userId: updated.userId, ipAddress: updated.ipAddress, type: updated.type, severity: updated.severity, metadata: updated.metadata as RiskFlagView["metadata"], resolved: updated.resolved, resolvedBy: updated.resolvedBy, resolvedAt: updated.resolvedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() };
  }

  async listReports(principal: RequestPrincipal, status?: string): Promise<ReportView[]> {
    if (!principal.roles.some(r => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status;
    const rows = await this.prisma.report.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map(r => ({ id: r.id, reporterId: r.reporterId, targetType: r.targetType, targetId: r.targetId, reason: r.reason, description: r.description, status: r.status as ReportView["status"], handledBy: r.handledBy, handledAt: r.handledAt?.toISOString() ?? null, notes: r.notes, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  }

  async createReport(reporterId: string, targetType: string, targetId: string, reason: string, description: string): Promise<ReportView> {
    const r = await this.prisma.report.create({ data: { reporterId, targetType, targetId, reason, description } });
    return { id: r.id, reporterId: r.reporterId, targetType: r.targetType, targetId: r.targetId, reason: r.reason, description: r.description, status: r.status as ReportView["status"], handledBy: r.handledBy, handledAt: r.handledAt?.toISOString() ?? null, notes: r.notes, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async handleReport(principal: RequestPrincipal, id: string, decision: string, notes: string): Promise<ReportView> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("REPORT_NOT_FOUND");
    const updated = await this.prisma.report.update({ where: { id }, data: { status: decision, handledBy: principal.sub, handledAt: new Date(), notes } });
    return { id: updated.id, reporterId: updated.reporterId, targetType: updated.targetType, targetId: updated.targetId, reason: updated.reason, description: updated.description, status: updated.status as ReportView["status"], handledBy: updated.handledBy, handledAt: updated.handledAt?.toISOString() ?? null, notes: updated.notes, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  }
}
