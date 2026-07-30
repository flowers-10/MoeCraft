import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nextRetryAt, resolveJobFailure, shouldCloseExpiredOrder } from "./job-domain";

test("job retries use bounded exponential backoff", () => {
  const now=new Date("2026-07-30T00:00:00.000Z");
  assert.equal(nextRetryAt(1,now).toISOString(),"2026-07-30T00:00:05.000Z");
  assert.equal(nextRetryAt(3,now).toISOString(),"2026-07-30T00:00:20.000Z");
  assert.equal(nextRetryAt(20,now).toISOString(),"2026-07-30T00:15:00.000Z");
});

test("exhausted jobs become dead letters instead of retrying forever", () => {
  assert.deepEqual(resolveJobFailure(1,3),{deadLetter:false});
  assert.deepEqual(resolveJobFailure(3,3),{deadLetter:true});
});

test("timeout close is idempotent for already terminal orders", () => {
  const now=new Date("2026-07-30T10:00:00.000Z");
  assert.equal(shouldCloseExpiredOrder("PENDING_PAYMENT",new Date("2026-07-30T09:59:00.000Z"),now),true);
  assert.equal(shouldCloseExpiredOrder("PENDING_PAYMENT",new Date("2026-07-30T10:01:00.000Z"),now),false);
  assert.equal(shouldCloseExpiredOrder("CLOSED",new Date("2026-07-30T09:59:00.000Z"),now),false);
  assert.equal(shouldCloseExpiredOrder("PAID",new Date("2026-07-30T09:59:00.000Z"),now),false);
});
