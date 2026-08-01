/** API 运行时使用的物流商目录；@moecraft/shared 仅承载类型（API 为 CJS，不能值导入 ESM 源码）。 */
export const CARRIERS = [
  { code: "SF", name: "顺丰速运" },
  { code: "ZTO", name: "中通快递" },
  { code: "YTO", name: "圆通速递" },
  { code: "STO", name: "申通快递" },
  { code: "YD", name: "韵达快递" },
  { code: "JD", name: "京东物流" },
  { code: "EMS", name: "中国邮政 EMS" }
] as const;

export const CARRIER_CODES = CARRIERS.map((carrier) => carrier.code);

export function carrierName(code: string): string {
  return CARRIERS.find((carrier) => carrier.code === code)?.name ?? code;
}
