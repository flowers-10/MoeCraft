# G27 售后验收手册

## 1. 验收范围与结论规则

本手册验收 G27 售后：按订单项申请仅退款/退货退款、商家审核、买家退货物流、平台仲裁、售后与订单/支付状态联动、退款金额上限。

每个用例同时满足"接口/页面结果"和"数据不变量"才算通过。出现未支付订单可发起售后、退款超过可退金额、仅退款的订单要求退货物流、商家审核非自己店铺的售后、平台运营无仲裁权限、重复对同一订单项发起未结售后，均直接判定不通过。

关键约定：

- `AfterSaleAfterSaleStatus` 八状态机：`REQUESTED → APPROVED/REJECTED/CANCELLED`；仅退款：`APPROVED → REFUND_PROCESSING → COMPLETED`；退货退款：`APPROVED → AWAITING_RETURN → RETURNED → REFUND_PROCESSING → COMPLETED`。
- 可退金额 = 订单项实付 - 该订单项已完成售后退款总和，上限为实付金额。
- 仅允许在 `PAID/PARTIALLY_SHIPPED/SHIPPED/COMPLETED` 状态发起售后。
- 售后触发退款后，订单状态联动为 `AFTER_SALE`，支付状态联动为 `PARTIALLY_REFUNDED` 或 `REFUNDED`。

## 2. 准备工作

1. 在 `apps/api/.env` 配置本地 `DATABASE_URL` 与 `JWT_ACCESS_SECRET`。
2. 执行 `pnpm --filter @moecraft/api db:deploy`，确认迁移 `20260802135227_g27_after_sales` 已应用（`AfterSale` 表存在）。
3. `pnpm run dev` 启动 API。
4. 准备测试数据：
   - 两个 CUSTOMER 账号 A/B；
   - 两个 ACTIVE 商家（商家 1、商家 2）及各自商家账号；
   - 一个 PLATFORM_OPERATOR 和一个 PLATFORM_ADMIN；
   - 客户 A 已支付订单（状态 `PAID` 或 `SHIPPED` 或 `COMPLETED`），至少含两个订单项。
5. 记录测试前 `PaymentIntent.status` 和订单项 `payableAmount`。

## 3. G27-01 发起仅退款申请

操作：客户 A 在 storefront 订单详情页对某个已完成订单项发起售后，选择"仅退款"，填写原因和描述。

验收标准：

- `POST /api/v1/after-sales` 返回 201，售后记录 `status=REQUESTED`、`type=REFUND_ONLY`；
- `refundAmount` 等于该订单项实付金额（首次申请）；
- `afterSaleNumber` 匹配 `AS` + 20 位大写十六进制；
- 买家在 `/account/after-sales` 列表看到该记录，详情页显示"取消售后"按钮；
- 对同一订单项再次创建返回 `409 AFTER_SALE_DUPLICATE`；
- 客户 B 对 A 的订单项发起售后返回 `404 ORDER_ITEM_NOT_FOUND`；
- 未支付订单发起售后返回 `409 AFTER_SALE_ORDER_STATUS_INELIGIBLE`。

## 4. G27-02 商家审核与仅退款执行

操作：商家 1 在管理端 `/commerce/after-sales` 打开待处理售后，选择"同意"并填写审核备注。

验收标准：

- `PATCH /api/v1/admin/after-sales/:id/review` 返回 `status=REFUND_PROCESSING`（仅退款自动推进）；
- 退款执行后 `status=COMPLETED`、`completedAt` 非空；
- `PaymentIntent.status` 变为 `PARTIALLY_REFUNDED` 或 `REFUNDED`；
- `Order.status` 变为 `AFTER_SALE`；
- `RefundRecord` 新增一条幂等退款记录，含 `providerRefundId`、金额、状态 `SUCCEEDED`；
- 拒绝操作：`status=REJECTED`，不触发退款；
- 商家 2 审核商家 1 的售后返回 `403 PERMISSION_DENIED`；
- 无 `afterSales.manage` 按钮权限的商家员工看不到审核按钮。

## 5. G27-03 退货退款流程

操作：客户 B 对另一个订单项发起"退货退款"。

验收标准：

- 商家同意后 `status=APPROVED`（不自动退款）；
- 买家详情页出现"退货物流"输入框和"提交退货物流"按钮；
- 填写物流公司+单号后 `status=AWAITING_RETURN`，`returnCarrier` 与 `returnTrackingNumber` 已保存；
- 商家点击"确认收到退货"后 `status=RETURNED`，随后可点击"执行退款"进入 `REFUND_PROCESSING → COMPLETED`；
- 仅退款类型在商家同意后直接进入退款流程，不出现退货物流输入；
- 买家在 `AWAITING_RETURN` 前可取消售后。

## 6. G27-04 买家取消与权限

操作：客户 A 对状态为 `REQUESTED` 的售后点击"取消售后"。

验收标准：

- `PATCH /api/v1/after-sales/:id/cancel` 返回 `status=CANCELLED`、`cancelledAt` 非空；
- 已进入 `REFUND_PROCESSING` 或 `COMPLETED` 的售后不可取消，返回 `409 AFTER_SALE_STATUS_CONFLICT`；
- 客户 B 取消客户 A 的售后返回 404。

## 7. G27-05 平台仲裁

操作：PLATFORM_ADMIN 在管理端售后详情中看到"平台同意"/"平台拒绝"按钮，对商家已拒绝的售后执行平台同意。

验收标准：

- `PATCH /api/v1/admin/after-sales/:id/platform-review` 接受 `APPROVED/REJECTED` 决策；
- 平台同意后售后按类型推进状态（仅退款进入 `REFUND_PROCESSING`，退货退款进入 `APPROVED`）；
- `platformNote` 已保存；
- PLATFORM_OPERATOR 也可执行仲裁；
- 普通商家调用平台仲裁接口返回 403；
- 平台在售后任何非终态（`REQUESTED/REJECTED`）均可介入。

## 8. 自动化回归命令

```powershell
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/api build
pnpm --filter @moecraft/storefront build
pnpm --filter @moecraft/admin build
pnpm typecheck
pnpm build
pnpm check:migrations
pnpm secrets:check
```

全部命令退出码为 0，且 `git status` 不出现 `.env`、构建产物、本地数据库或凭据，方可签署验收。
