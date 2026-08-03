# G28 退款与对账验收手册

## 1. 验收范围与结论规则

本手册验收 G28 退款幂等记录与每日对账：`RefundRecord` 幂等写库、`handleRefund` 幂等调用 PaymentProvider.refund、`Reconciliation` 对账导入、差异匹配与标记、人工确认解决。

每个用例同时满足"接口/页面结果"和"数据不变量"才算通过。出现同一退款请求产生多条 RefundRecord、对账自动静默改账、未确认差异自动解决、普通商家访问对账 API，均直接判定不通过。

关键约定：

- 退款以 `paymentIntentId + idempotencyKey` 唯一约束保证幂等；重复退款请求返回已有记录不重复调用 provider。
- 对账导入仅匹配 `SUCCEEDED/PARTIALLY_REFUNDED/REFUNDED` 的 `PaymentIntent`。
- 差异类型：`MISSING`（CSV 有但系统无）、`EXTRA`（系统有但 CSV 无）、`MISMATCH`（金额不一致）。
- 对账状态：`PENDING → REVIEWING → RESOLVED`；解决需 PLATFORM_ADMIN 角色（双重确认）。

## 2. 准备工作

1. 迁移 `20260802150419_g28_refund_reconciliation` 已应用（`RefundRecord`、`Reconciliation` 表存在，枚举 `RefundStatus`、`ReconciliationStatus` 已定义）。
2. `pnpm run dev` 启动 API。
3. 准备测试数据：
   - 一个 PLATFORM_ADMIN 和一个 PLATFORM_OPERATOR；
   - 至少 3 笔已支付订单（含精确金额），记录订单号和支付金额；
   - 至少有 1 笔已退款订单。

## 3. G28-01 退款幂等记录

操作：通过售后触发一笔退款（或直接调用 `PaymentService.handleRefund`）。

验收标准：

- `RefundRecord` 中新增一条记录，`status=SUCCEEDED`，含 `providerRefundId`、金额、币种、`creatorId`、`idempotencyKey`（格式 `refund:{orderId}:{8位随机}`）；
- 用相同 `idempotencyKey` 再次调用不产生新记录、不重复调用 provider；
- `PaymentIntent.status` 根据退款总额更新为 `PARTIALLY_REFUNDED` 或 `REFUNDED`；
- 未支付订单退款返回 `409 PAYMENT_NOT_SUCCEEDED`。

## 4. G28-02 对账导入与差异标记

操作：PLATFORM_ADMIN 在管理端 `/system/reports` 导入对账 CSV（含正确订单号、错误订单号、金额不匹配行）。

验收标准：

- `POST /api/v1/admin/reconciliation/import` 返回 201，`Reconciliation` 记录含 `totalExpected`、`totalMatched`、`matchedCount`、`unmatchedCount`；
- `discrepancies` JSON 数组正确标记三种差异：
  - CSV 中存在但数据库无支付记录 → `MISSING`
  - 金额不一致 → `MISMATCH`（差异金额带正负号）
- 对同一 `date + source` 重复导入返回 `409 RECONCILIATION_DUPLICATE`；
- 管理端抽屉可查看完整差异明细，每条含订单号、期望金额、实际金额、差异额和差异类型；
- PLATFORM_OPERATOR 可导入和查看，但不能解决；
- 非平台角色调用对账接口返回 403。

## 5. G28-03 差异确认解决

操作：PLATFORM_ADMIN 在对账详情抽屉点击"确认解决"并填写备注。

验收标准：

- `PATCH /api/v1/admin/reconciliation/:id/resolve` 返回 `status=RESOLVED`，`resolvedBy` 为操作人 ID，`resolvedAt` 和 `notes` 已保存；
- PLATFORM_OPERATOR 调用 resolve 返回 403；
- 已解决的记录再次 resolve 返回 `409 RECONCILIATION_ALREADY_RESOLVED`；
- 解决操作不自动修改 `PaymentIntent` 或 `RefundRecord` 数据（不静默改账）。

## 6. 自动化回归命令

```powershell
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api build
pnpm --filter @moecraft/admin build
pnpm typecheck
pnpm build
pnpm check:migrations
pnpm secrets:check
```

全部命令退出码为 0，且 `git status` 不出现 `.env`、构建产物、本地数据库或凭据，方可签署验收。
