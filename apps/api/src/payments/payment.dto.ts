import { IsIn } from "class-validator";
import type { SandboxPaymentResult } from "@moecraft/shared";
const results=["SUCCEEDED","FAILED","CANCELLED"] as const satisfies readonly SandboxPaymentResult[];
export class SimulatePaymentDto{@IsIn(results) result!:SandboxPaymentResult;}
