# G26 发货与履约验收手册

## 1. 验收范围与结论规则

本手册验收 G26 发货与履约：商家发货前状态复核、一个子单多包裹与部分发货、物流公司与轨迹查询适配器、手工补录审计、买家查看物流并确认收货、可配置的自动确认策略。

每个用例只有同时满足"接口/页面结果"和"数据不变量"才算通过。出现跨商家发货或轨迹泄露、超发（累计发货数 > 订单数）、未支付订单被发货、状态机逆行、自动确认重复完成订单，均直接判定该 G 不通过。

关键约定：

- 发货以**商家子单**为粒度；一个子单可创建多个包裹（Shipment），每个包裹按订单项（OrderItem）记录本次数量。
- 子单状态：`PAID` →（任一包裹）`PARTIALLY_SHIPPED` →（全部订单项发满）`SHIPPED`；总单状态取所有子单的并集语义：全部子单 `SHIPPED` 才算 `SHIPPED`，否则 `PARTIALLY_SHIPPED`。
- 沙箱轨迹适配器按**分钟级**推进便于验收：揽收 0 分钟、发出约 2 分钟、到达转运中心约 5 分钟、派送约 8 分钟、签收约 10 分钟（按单号有 0–2 分钟确定性抖动）；发货后约 12 分钟内可看到完整轨迹。
- 自动确认天数由 `ORDER_AUTO_CONFIRM_DAYS` 配置（1–365，默认 15），自**总单发满**时刻起算。

## 2. 准备工作

1. 在 `apps/api/.env` 配置本地 `DATABASE_URL` 与 `JWT_ACCESS_SECRET`，按需设置 `ORDER_AUTO_CONFIRM_DAYS`（缺省 15）。
2. 执行：

   ```powershell
   pnpm --filter @moecraft/api db:deploy
   pnpm run dev
   ```

   确认迁移 `20260801160000_g26_shipment_fulfillment` 已应用（`Shipment`、`ShipmentItem` 两表存在，`Job.type` 枚举含 `AUTO_CONFIRM_RECEIPT`）。
3. 准备测试数据（不要使用生产数据）：

   - 两个 CUSTOMER 账号 A/B；
   - 两个 ACTIVE 商家（商家 1、商家 2）及各自商家账号，各有 ACTIVE 商品且库存充足；
   - 一个 PLATFORM_OPERATOR；
   - 客户 A 下两笔订单：订单一同时包含商家 1 和商家 2 的商品（跨店），订单二只含商家 1 的商品且同一 SKU 数量 ≥ 3；两笔均完成沙箱支付（状态 `PAID`）。
4. 记录两笔订单的 id、商家子单 id（详情接口 `merchantOrders[].id`）和各订单项 id（`merchantOrders[].items[].id`）。

## 3. G26-01 商家发货与状态复核

操作：商家 1 在管理端 `/commerce/orders` 打开订单二详情，在"包裹与物流"面板只把该 SKU 的数量填 1（小于购买数 3），选择物流公司并填写单号，确认发货；随后再发第二个包裹（数量 2）。

验收标准：

- 第一次发货后子单与总单变为 `PARTIALLY_SHIPPED`，第二次后变为 `SHIPPED`；
- 每次发货生成一条 Shipment 与对应 ShipmentItem，包裹列表展示公司、单号、发货时间、内含商品与数量；
- `OrderEvent` 新增 `SHIPMENT_CREATED`（含 shipmentId、公司、单号、明细）；
- `AuditLog` 新增 `order.shipment.created`（操作人、单号、明细、备注留档）——手工补录必须可审计；
- 总单变为 `SHIPPED` 时创建 `Job`：`type=AUTO_CONFIRM_RECEIPT`、`uniqueKey=auto-confirm:{orderId}`、`runAt = 发满时刻 + ORDER_AUTO_CONFIRM_DAYS 天`，且只创建一次；
- 无 `orders.manage` 按钮权限的商家员工看不到发货表单，直接调 API 返回 403。

## 4. G26-02 发货约束与幂等

操作：

1. 对订单二尝试再次发货同一订单项（数量 1，已发满）；
2. 用与第一个包裹相同的`公司+单号`、相同明细重复提交（模拟网络重试）；
3. 用相同`公司+单号`但不同明细提交；
4. 商家 2 对商家 1 的子单发货；平台运营对任意子单发货；
5. 对一个尚未支付的新订单发货。

验收标准：

- 已发满订单项再发返回 `400 SHIPMENT_QUANTITY_EXCEEDED`；不发任何包裹、不写事件与审计；
- 相同单号+相同明细重复提交为幂等成功：不产生第二个包裹、不重复写事件/审计；
- 相同单号+不同明细返回 `409 SHIPMENT_TRACKING_CONFLICT`；
- 商家 2 得到 `404 MERCHANT_ORDER_NOT_FOUND`；平台运营得到 `403 MERCHANT_SCOPE_REQUIRED`（平台只读，不代发）；
- 未支付订单返回 `409`（`ORDER_STATUS_CONFLICT` 或 `ORDER_NOT_PAID`）——发货前必须复核订单与支付事实；
- 非法物流公司代码、单号少于 4 位分别返回 400。

## 5. G26-03 物流轨迹适配器

操作：发货后立即、约 3 分钟后、约 12 分钟后分别查看：

- 买家：`/account/orders/{id}` 订单详情（或 `GET /api/v1/orders/{id}/tracking`）；
- 商家/平台：管理端订单详情"包裹与物流"面板（或 `GET /api/v1/admin/orders/{id}/tracking`）。

验收标准：

- 轨迹来自适配器（沙箱 provider），按时间正序展示节点描述与时间；
- 立即查看只有"包裹已揽收"，约 3 分钟后出现运输节点，约 12 分钟后出现"已签收"；
- 出现签收节点后 Shipment 状态落库为 `DELIVERED` 并记录 `deliveredAt`（幂等，不重复更新）；
- 客户 B 调用客户 A 订单的轨迹接口返回 404；商家只能拿到自己子单的包裹，平台可跨店查看全部包裹。

## 6. G26-04 跨店订单的部分履约

操作：商家 1 对订单一（跨店）完成发货；商家 2 暂不发货。

验收标准：

- 商家 1 发满后其子单为 `SHIPPED`，但总单为 `PARTIALLY_SHIPPED`（商家 2 未发）；
- 此时不创建自动确认 Job；
- 商家 1 的详情页只能看到自己子单与包裹，看不到商家 2 的店铺、商品与包裹；
- 平台运营在同一订单详情看到两家子单与全部包裹，但页面不出现发货表单；
- 商家 2 随后发满，总单变为 `SHIPPED` 并创建自动确认 Job。

## 7. G26-05 买家确认与自动确认

操作：

1. 订单二发满后，客户 A 在 `/account/orders/{id}` 点击"确认收货"；
2. 订单一发满后不操作，直接修改数据库把自动确认 Job 的 `runAt` 改为当前时间以前，等待 worker（每 15 秒轮询）；
3. 观察同一 Job 被重放（如通过死信重放或重复执行）。

验收标准：

- 手动确认：总单与全部子单变为 `COMPLETED`，记录 `completedAt`，`OrderEvent` 为 `BUYER_CONFIRMED`；
- 自动确认：Job 完成后订单与子单变为 `COMPLETED`，`OrderEvent` 为 `AUTO_CONFIRMED`（metadata 含 jobId）；
- 买家已手动确认的订单，其自动确认 Job 到期后静默跳过（不产生第二个完成事件、状态不回退）；
- 进入 `AFTER_SALE`/`CANCELLED` 等状态的订单不会被自动确认；
- 修改 `ORDER_AUTO_CONFIRM_DAYS` 重启 API 后，新发满的订单按新天数生成 `runAt`（策略可配置）。

## 8. 自动化回归命令

```powershell
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/api build
pnpm --filter @moecraft/api openapi:check
pnpm --filter @moecraft/storefront build
pnpm --filter @moecraft/admin build
pnpm typecheck
pnpm check:migrations
pnpm secrets:check
```

全部命令退出码为 0，且 `git status` 不出现 `.env`、构建产物、本地数据库或凭据，方可签署验收。
