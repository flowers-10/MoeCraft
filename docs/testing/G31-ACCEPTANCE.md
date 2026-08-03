# G31 风控验收手册

## 1. 验收范围与结论规则

本手册验收 G31 风控：异常标记（RiskFlag）记录与处理、举报（Report）创建与处理时间线。

每个用例同时满足"接口/页面结果"和"数据不变量"才算通过。出现普通用户可查看/处理风控标记、举报人可自己处理举报、处理操作不记录时间线，均直接判定不通过。

关键约定：

- `RiskFlag` 记录异常行为（登录异常、交易异常、重复下单、优惠滥用等），按 `userId` 或 `ipAddress` 关联，支持"已处理/未处理"状态。
- `Report` 记录用户举报（商品、店铺、评价等），状态：`PENDING → RESOLVED/DISMISSED`。
- 风控管理仅限 `PLATFORM_OPERATOR` 和 `PLATFORM_ADMIN`。
- 举报创建仅限已登录用户（`CUSTOMER` 角色）。

## 2. 准备工作

1. 迁移 `20260802155722_g31_risk_controls` 已应用（`RiskFlag`、`Report` 表存在）。
2. `pnpm run dev` 启动 API。
3. 准备测试数据：
   - 两个 CUSTOMER 账号 A/B；
   - 一个 PLATFORM_OPERATOR 和一个 PLATFORM_ADMIN；
   - 在 RiskFlag 表中预先插入几条未处理标记（指定不同 type 和 severity）。

## 3. G31-01 异常标记查询与处理

操作：PLATFORM_ADMIN 访问管理端 `/system/risk`，在"异常标记"标签页查看未处理标记。

验收标准：

- `GET /api/v1/admin/risk/flags?resolved=false` 返回未处理标记列表，含 `type`、`severity`、`userId`、`ipAddress`、`metadata`、`createdAt`；
- `?type=xxx` 可按类型筛选；
- `?resolved=true` 返回已处理标记；
- 标记按 `createdAt` 降序排列；
- 普通商家调用返回 403。

## 4. G31-02 标记处理

操作：在管理端对一条标记点击"处理"。

验收标准：

- `PATCH /api/v1/admin/risk/flags/:id/resolve` 将 `resolved` 设为 `true`，`resolvedBy` 为操作人 ID，`resolvedAt` 非空；
- 未认证用户调用返回 401；
- PLATFORM_OPERATOR 也可以处理标记；
- 普通 CUSTOMER 调用返回 403。

## 5. G31-03 创建举报

操作：客户 A 在 storefront 对某商品发起举报（`targetType=PRODUCT`）。

验收标准：

- `POST /api/v1/reports`（`targetType=PRODUCT, targetId=xxx, reason=描述不符, description=详细说明`）返回 201；
- `Report` 表新增一条 `status=PENDING` 记录，含 `reporterId`、`targetType`、`targetId`、`reason`、`description`；
- 客户 B 可对同一目标发起独立举报（不同 `reporterId`）；
- 未登录调用返回 401。

## 6. G31-04 举报处理

操作：PLATFORM_ADMIN 在管理端风控页"举报管理"标签页查看待处理举报，点击"解决"或"驳回"。

验收标准：

- `GET /api/v1/admin/risk/reports?status=PENDING` 返回待处理举报列表；
- `PATCH /api/v1/admin/risk/reports/:id`（`decision=RESOLVED, notes=已处理`）返回 `status=RESOLVED`，`handledBy` 和 `handledAt` 非空；
- 驳回操作（`decision=DISMISSED`）同理；
- 处理后列表不再显示该举报（不再 `PENDING`），筛选 `?status=RESOLVED` 可见；
- 客户 A 不能调用处理接口（返回 403），但可看到自己的举报（如已实现）；
- PLATFORM_OPERATOR 也可处理举报。

## 7. G31-05 时间线与审计完整性

验收标准：

- 每条 RiskFlag 完整记录从创建到 `resolved` 的时间线（`createdAt → resolvedAt`）；
- 每条 Report 完整记录从 `PENDING` 到 `RESOLVED/DISMISSED` 的时间线（`createdAt → handledAt`）；
- `handledBy` 记录处理人 ID，可追溯；
- `notes` 保存处理备注，不可为空时需填写。

## 8. 自动化回归命令

```powershell
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api build
pnpm --filter @moecraft/admin build
pnpm --filter @moecraft/storefront build
pnpm typecheck
pnpm build
pnpm check:migrations
pnpm secrets:check
```
