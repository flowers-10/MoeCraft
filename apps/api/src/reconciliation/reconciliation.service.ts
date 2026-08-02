import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ReconciliationDiscrepancy, ReconciliationListItem, ReconciliationView } from "@moecraft/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { RequestPrincipal } from "../auth/authorization";

const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);

type CsvRow = { orderNumber: string; expectedAmount: string };

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(principal: RequestPrincipal): Promise<ReconciliationListItem[]> {
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const rows = await this.prisma.reconciliation.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => ({
      id: row.id, date: row.date, source: row.source, fileName: row.fileName,
      totalExpected: money(row.totalExpected), totalMatched: money(row.totalMatched),
      unmatchedCount: row.unmatchedCount, status: row.status as ReconciliationListItem["status"],
      createdAt: row.createdAt.toISOString()
    }));
  }

  async get(principal: RequestPrincipal, id: string): Promise<ReconciliationView> {
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const row = await this.prisma.reconciliation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("RECONCILIATION_NOT_FOUND");
    return {
      id: row.id, date: row.date, source: row.source, fileName: row.fileName,
      totalExpected: money(row.totalExpected), totalMatched: money(row.totalMatched),
      unmatchedCount: row.unmatchedCount, discrepancies: row.discrepancies as unknown as ReconciliationView["discrepancies"] ?? [],
      status: row.status as ReconciliationView["status"], resolvedBy: row.resolvedBy,
      resolvedAt: row.resolvedAt?.toISOString() ?? null, notes: row.notes,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
    };
  }

  async import(principal: RequestPrincipal, date: string, fileName: string, csvRows: CsvRow[]): Promise<ReconciliationView> {
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const existing = await this.prisma.reconciliation.findFirst({ where: { date, source: "PAYMENT_PROVIDER" } });
    if (existing) throw new ConflictException("RECONCILIATION_DUPLICATE");
    const paymentIntents = await this.prisma.paymentIntent.findMany({
      where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } },
      select: { id: true, order: { select: { orderNumber: true } }, amount: true }
    });
    const intentMap = new Map(paymentIntents.map((pi) => [pi.order.orderNumber, pi.amount]));
    const totalExpected = csvRows.reduce((sum, row) => sum.plus(new Prisma.Decimal(row.expectedAmount)), new Prisma.Decimal(0));
    const discrepancies: ReconciliationDiscrepancy[] = [];
    let matchedSum = new Prisma.Decimal(0), matchedCount = 0;
    for (const row of csvRows) {
      const actual = intentMap.get(row.orderNumber);
      if (!actual) {
        discrepancies.push({ orderNumber: row.orderNumber, expectedAmount: row.expectedAmount, actualAmount: "0.00", difference: "-" + row.expectedAmount, type: "MISSING" });
        continue;
      }
      if (!actual.equals(new Prisma.Decimal(row.expectedAmount))) {
        const diff = money(actual.minus(new Prisma.Decimal(row.expectedAmount)));
        if (new Prisma.Decimal(diff).greaterThan(0)) {
          discrepancies.push({ orderNumber: row.orderNumber, expectedAmount: row.expectedAmount, actualAmount: money(actual), difference: "+" + diff, type: "MISMATCH" });
        } else {
          discrepancies.push({ orderNumber: row.orderNumber, expectedAmount: row.expectedAmount, actualAmount: money(actual), difference: diff, type: "MISMATCH" });
        }
      } else {
        matchedSum = matchedSum.plus(actual);
        matchedCount++;
      }
    }
    const row = await this.prisma.reconciliation.create({
      data: { date, source: "PAYMENT_PROVIDER", fileName, totalExpected, totalMatched: matchedSum, matchedCount, unmatchedCount: discrepancies.length, discrepancies: discrepancies as unknown as Prisma.InputJsonValue, status: "PENDING" }
    });
    await this.audit.write(principal.sub, "reconciliation.imported", "Reconciliation", row.id, { fileName, date });
    return this.get(principal, row.id);
  }

  async resolve(principal: RequestPrincipal, id: string, notes: string): Promise<ReconciliationView> {
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN")) throw new ForbiddenException("PERMISSION_DENIED");
    const row = await this.prisma.reconciliation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("RECONCILIATION_NOT_FOUND");
    if (row.status === "RESOLVED") throw new ConflictException("RECONCILIATION_ALREADY_RESOLVED");
    const updated = await this.prisma.reconciliation.update({
      where: { id }, data: { status: "RESOLVED", resolvedBy: principal.sub, resolvedAt: new Date(), notes }
    });
    await this.audit.write(principal.sub, "reconciliation.resolved", "Reconciliation", row.id, { notes });
    return this.get(principal, updated.id);
  }
}
