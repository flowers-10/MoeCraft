import type { OrderStatus } from "@moecraft/shared";
export function nextRetryAt(attempt:number,now=new Date()){
  const delay=Math.min(900_000,5_000*2**Math.max(0,attempt-1));
  return new Date(now.getTime()+delay);
}
export function resolveJobFailure(attempts:number,maxAttempts:number){return{deadLetter:attempts>=maxAttempts};}
export function shouldCloseExpiredOrder(status:OrderStatus,expiresAt:Date,now=new Date()){return status==="PENDING_PAYMENT"&&expiresAt<=now;}
