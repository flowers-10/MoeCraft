import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";
import type { PrismaService } from "../prisma/prisma.service";
import type { SandboxPaymentProvider } from "./sandbox-payment.provider";
import { PaymentService } from "./payment.service";

test("duplicate provider event returns archived payment without applying side effects again", async () => {
  const event={eventId:"evt-duplicate",providerPaymentId:"sbx_payment-1",status:"SUCCEEDED" as const,amount:"10.00",currency:"CNY",occurredAt:new Date().toISOString()};
  const payment={
    id:"payment-1",orderId:"order-1",status:"SUCCEEDED",provider:"SANDBOX",providerPaymentId:event.providerPaymentId,
    amount:new Prisma.Decimal(10),currency:"CNY",expiresAt:new Date(Date.now()+60_000),paidAt:new Date(),closedAt:null,
    createdAt:new Date(),updatedAt:new Date(),order:{orderNumber:"MC0123456789ABCDEF0123",userId:"customer-1"}
  };
  let transactions=0;
  const duplicateError=new Prisma.PrismaClientKnownRequestError("duplicate",{code:"P2002",clientVersion:"test"});
  const prisma={
    paymentEvent:{
      create:async()=>{throw duplicateError;},
      findUnique:async()=>({paymentIntent:payment})
    },
    $transaction:async()=>{transactions+=1;}
  } as unknown as PrismaService;
  const provider={verifyWebhook:()=>event} as unknown as SandboxPaymentProvider;
  const config={} as ConfigService<AppEnvironment,true>;
  const result=await new PaymentService(prisma,provider,config).handleWebhook(Buffer.from("{}"),"signature");
  assert.equal(result.status,"SUCCEEDED");
  assert.equal(transactions,0);
});
