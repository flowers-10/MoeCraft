import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AfterSaleStatus, AfterSaleType } from "@moecraft/shared";
import { canTransitionAfterSale } from "@moecraft/shared";

export { canTransitionAfterSale };

export function createAfterSaleNumber(_now = new Date()) {
  return "AS" + randomBytes(10).toString("hex").toUpperCase();
}

export function maxRefundableAmount(
  payableAmount: Prisma.Decimal | string | number,
  completedRefundTotal: Prisma.Decimal | string | number
): Prisma.Decimal {
  const paid = new Prisma.Decimal(payableAmount);
  const refunded = new Prisma.Decimal(completedRefundTotal);
  return Prisma.Decimal.max(new Prisma.Decimal(0), paid.minus(refunded));
}

export function buyerActions(status: AfterSaleStatus, type: AfterSaleType): string[] {
  const actions: string[] = [];
  if (status === "REQUESTED" || status === "APPROVED" || status === "AWAITING_RETURN") {
    actions.push("CANCEL");
  }
  if (status === "APPROVED" && type === "RETURN_REFUND") {
    actions.push("SHIP_RETURN");
  }
  return actions;
}

export function adminActions(status: AfterSaleStatus, type: AfterSaleType, isPlatform: boolean): string[] {
  const actions: string[] = [];
  if (status === "REQUESTED") {
    actions.push("APPROVE", "REJECT");
  }
  if (status === "AWAITING_RETURN" && type === "RETURN_REFUND") {
    actions.push("CONFIRM_RETURNED");
  }
  if (status === "APPROVED" && type === "REFUND_ONLY") {
    actions.push("REFUND");
  }
  if (status === "RETURNED" && type === "RETURN_REFUND") {
    actions.push("REFUND");
  }
  if (isPlatform && (status === "REQUESTED" || status === "REJECTED")) {
    actions.push("PLATFORM_APPROVE", "PLATFORM_REJECT");
  }
  if (isPlatform && status === "APPROVED" && type === "REFUND_ONLY") {
    actions.push("PLATFORM_REFUND");
  }
  return actions;
}
