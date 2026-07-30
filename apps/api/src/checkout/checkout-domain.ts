import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";

export const CHECKOUT_QUOTE_VERSION = "g21.v1" as const;
export const CHECKOUT_QUOTE_TTL_MS = 10 * 60_000;

export type QuoteSignatureInput = {
  quoteId: string;
  userId: string;
  version: string;
  expiresAt: string;
  payableAmount: string;
};

function payload(input: QuoteSignatureInput) {
  return [input.quoteId, input.userId, input.version, input.expiresAt, input.payableAmount].join(".");
}

export function createQuoteSignature(input: QuoteSignatureInput, secret: string) {
  return createHmac("sha256", secret).update(payload(input)).digest("base64url");
}

export function assertQuoteSignature(input: QuoteSignatureInput, signature: string, secret: string) {
  const expected = Buffer.from(createQuoteSignature(input, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function summarizeQuoteGroups(groups: ReadonlyArray<{
  originalAmount: string;
  discountAmount: string;
  invalidCount: number;
}>) {
  const original = groups.reduce((sum, group) => sum.plus(group.originalAmount), new Prisma.Decimal(0));
  const discount = groups.reduce((sum, group) => sum.plus(group.discountAmount), new Prisma.Decimal(0));
  return {
    originalAmount: original.toFixed(2),
    shippingAmount: "0.00",
    discountAmount: discount.toFixed(2),
    payableAmount: original.minus(discount).toFixed(2),
    invalidCount: groups.reduce((sum, group) => sum + group.invalidCount, 0)
  };
}

