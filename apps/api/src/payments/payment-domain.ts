import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@moecraft/shared";

export function signSandboxWebhook(rawBody: Buffer, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("base64url");
}
export function verifySandboxWebhookSignature(rawBody: Buffer, signature: string, secret: string) {
  const expected = Buffer.from(signSandboxWebhook(rawBody, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function assertPaymentFacts(expectedAmount:string,expectedCurrency:string,actualAmount:string,actualCurrency:string){
  if(!new Prisma.Decimal(expectedAmount).equals(actualAmount))throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if(expectedCurrency!==actualCurrency)throw new Error("PAYMENT_CURRENCY_MISMATCH");
}
export function canApplyPaymentEvent(current:PaymentStatus,next:PaymentStatus){
  if(current===next)return false;
  if(["SUCCEEDED","REFUNDED"].includes(current))return false;
  if(current==="CANCELLED"&&next!=="REFUNDED")return false;
  return ["PROCESSING","SUCCEEDED","FAILED","CANCELLED","REFUNDED"].includes(next);
}
export function paidOrderCartItemIds(items: Array<{ pricingSnapshot: unknown }>) {
  const ids = items.flatMap(({ pricingSnapshot }) => {
    if (!pricingSnapshot || typeof pricingSnapshot !== "object" || !("cartItemId" in pricingSnapshot)) return [];
    const id = (pricingSnapshot as { cartItemId?: unknown }).cartItemId;
    return typeof id === "string" && id ? [id] : [];
  });
  return [...new Set(ids)];
}
