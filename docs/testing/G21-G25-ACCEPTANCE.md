# G21–G25 交易闭环验收手册

## 1. 验收范围与结论规则

本手册验收 G21 结算试算、G22 原子下单、G23 沙箱支付、G24 三端订单工作流和 G25 超时任务。首版运费统一为 `¥0.00`，但 quote 与订单均保存运费快照。

每个用例只有同时满足“接口/页面结果”和“数据不变量”才算通过。出现跨用户或跨商家数据、客户端金额覆盖服务端金额、重复订单/扣款、负库存、支付终态回退、死信可被普通运营重放，均直接判定该 G 不通过。

## 2. 准备工作

1. 使用 Node.js 20+、pnpm 10+ 和独立本地 MySQL。
2. 在 `apps/api/.env` 配置本地 `DATABASE_URL` 与至少 32 字符的 `JWT_ACCESS_SECRET`，`SERVICE_ENVIRONMENT=local`。
3. 执行：

   ```powershell
   pnpm --filter @moecraft/api db:deploy
   pnpm run dev
   ```

4. 准备以下安全测试数据（不要使用生产数据）：

   - 两个 CUSTOMER 账号 A/B；
   - 两个 ACTIVE 商家及各自商家账号；
   - 一个 PLATFORM_OPERATOR 和一个 PLATFORM_ADMIN；
   - 至少两个不同店铺的 ACTIVE 商品/SKU，每个库存至少 5；
   - 一个已领取且有效的优惠券。

5. 记录测试前各 SKU 的 `onHand`、`reserved` 和 `version`。

## 3. G21 结算试算

### G21-01 多店铺试算

操作：客户 A 将两个店铺的有效 SKU 加入购物车并选中，进入 `/checkout`，填写完整地址，点击“试算订单”。

验收标准：

- 页面按店铺分组展示商品；
- 每组及总计都有商品金额、运费、优惠、应付金额；
- 当前运费均为 `0.00`；
- 金额为两位小数字符串，且 `商品 + 运费 - 优惠 = 应付`；
- quote 返回 `version=g21.v1`、签名和约 10 分钟有效期；
- 试算不改变库存 `reserved`。

### G21-02 失效原因和优惠复核

操作：分别关闭店铺、停用 SKU、把库存降到低于购物车数量、输入不可用优惠码后重新试算。

验收标准：

- 对应商品返回稳定失效原因；
- 无效 quote 的 `valid=false`，不能提交；
- 不可用优惠券由 API 明确拒绝；
- 恢复数据后必须重新生成 quote。

### G21-03 防篡改

操作：在开发者工具中修改提交请求中的 quote id 或 signature，或等待 quote 过期后提交。

验收标准：

- API 返回 `409`，错误分别为签名无效、quote 不存在或已过期；
- 不创建订单、支付意图或库存锁；
- 客户端没有可提交的“最终金额”字段。

## 4. G22 原子订单

### G22-01 正常创建与拆单

操作：用有效 quote 提交订单，请求带唯一 `Idempotency-Key`。

验收标准：

- 创建一个总单、每店一个商家子单、订单项快照、每项库存锁和一个支付意图；
- 初始订单状态 `PENDING_PAYMENT`，支付状态 `PENDING`；
- `reserved` 按购买数增加，`onHand` 不变；
- 订单号匹配 `MC` 加 20 位随机大写十六进制字符，不能从数据库自增值推断；
- 下单后对应购物车项被移除。

### G22-02 幂等、超时与回滚

操作：用相同 key 和相同请求重复提交；再用相同 key 改 quote；另制造库存版本冲突后提交。

验收标准：

- 相同 key/请求返回同一个订单，不新增库存锁或支付意图；
- 相同 key/不同请求返回 `IDEMPOTENCY_KEY_CONFLICT`；
- 库存冲突时整个事务回滚，总单、子单、订单项、核销、支付意图和库存锁均不残留；
- 过期 quote 不产生任何写入。

### G22-03 数据域

操作：客户 B、商家 2、商家 1、平台运营分别查询客户 A 的订单。

验收标准：

- 客户 B 得到 404；
- 商家只能看到属于自己的子单所在订单；
- 平台运营可跨店查看；
- 商家/平台页面电话号码脱敏，且不返回认证或支付敏感数据。

## 5. G23 沙箱支付

### G23-01 页面恢复

操作：从待支付订单进入 `/payments/{orderId}`，刷新页面三次。

验收标准：

- 始终复用同一个 `PaymentIntent` 和 `providerPaymentId`；
- 页面显示处理中并每 2 秒轮询；
- 刷新不创建第二个支付意图或渠道支付号。

### G23-02 成功回调

操作：点击“模拟成功”。

验收标准：

- 支付变为 `SUCCEEDED`，订单和子单变为 `PAID`；
- 库存锁变为 `COMMITTED`，`onHand` 与 `reserved` 同时减去购买数量；
- 原始事件、provider event id、验签结果和处理时间已留档；
- 页面轮询恢复为“支付成功”。

### G23-03 失败、取消、重复与乱序

操作：对新订单分别模拟失败和取消；对成功事件使用同一 event id 重放，并在成功后发送 FAILED 事件。

验收标准：

- 页面显示对应失败/取消状态；
- 重复 event id 不产生第二次扣库存或状态事件；
- 成功支付不能被晚到的 FAILED 回退；
- 金额或币种不一致的事件被拒绝并在事件记录中保存错误码；
- 错误签名返回 401，且不能改变支付/订单/库存事实。

## 6. G24 买家、商家与平台页面

### G24-01 买家订单操作

验收标准：

- `/account/orders` 有加载、空、错误和列表状态；
- 详情展示订单快照和店铺分组；
- 待支付订单可继续支付和取消；
- 已发货订单可确认收货；
- 已支付至已完成订单展示售后入口；
- 其他客户无法打开详情。

### G24-02 商家订单

验收标准：

- `/commerce/orders` 使用真实 API 数据，支持订单号和状态筛选；
- 详情只包含当前商家有权查看的订单，联系方式最小展示；
- 有 `orders.manage` 权限的商家可保存内部备注；无按钮权限的员工不能保存；
- 点击异步导出后返回持久化任务 id，任务最终为 COMPLETED 或明确 FAILED。

### G24-03 平台监察

验收标准：

- 平台运营可查看跨店订单，并按异常状态筛选；
- 页面只展示支付 provider/status/amount，不存在修改支付事实按钮或 API；
- 平台运营不能调用死信重放（该能力属于 G25 管理员）。

## 7. G25 超时任务、死信与指标

### G25-01 自动关闭

操作：创建待支付订单，将执行时间调整到当前时间以前，等待 worker（最多 15 秒）。

验收标准：

- provider 支付单关闭；
- 订单和子单变为 `CLOSED`，支付变为 `CANCELLED`；
- ACTIVE 库存锁变为 `EXPIRED`，`reserved` 恢复且 `onHand` 不变；
- 再次执行同一 job 不产生额外库存变更或事件。

### G25-02 重试、死信和权限

操作：暂时制造可恢复失败并观察重试；连续失败达到 `maxAttempts`；分别用平台运营和平台管理员访问 `/system/jobs`。

验收标准：

- 重试间隔从 5 秒指数增加，最大 15 分钟；
- 达到上限后状态为 `DEAD_LETTER` 并保留最后错误；
- 平台运营能查看但看不到重放按钮，调用重放 API 返回 403；
- PLATFORM_ADMIN 可重放，任务回到 `PENDING` 且尝试次数重置。

### G25-03 指标与告警

操作：平台管理员请求 `/api/v1/metrics`，并各制造一次成功 quote、成功下单、支付成功、库存锁失败、未处理回调和死信。

验收标准：

- `commerce.counters` 包含 quote、订单、库存锁、支付、重复回调、任务完成/死信计数；
- `commerce.gauges` 包含 webhook 积压、到期任务和死信数量；
- 积压、死信或库存锁失败大于 0 时 `commerce.alerts` 出现对应 warning/critical；
- 指标标签和告警不包含用户、地址、token 或支付原始数据。

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
