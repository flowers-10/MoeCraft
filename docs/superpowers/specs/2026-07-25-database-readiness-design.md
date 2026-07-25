# 数据库迁移就绪防护设计

## 背景

G16、G17 的 Prisma schema 和 Client 已更新，但本地 MySQL 未应用对应迁移。API 可以正常启动，`/health` 和 `/readiness` 也返回 200，直到目录、商品和库存接口查询新字段时才返回 500。

真实 HTTP 验收首次运行出现公共目录、后台目录和商品创建 500；应用缺失迁移后，同一套 98 项验收全部通过。因此需要同时解决“本地遗漏迁移”和“就绪探针误报”。

## 目标

- 本地开发启动自动应用仓库中已有的迁移。
- 生产环境继续在发布阶段显式执行迁移，不允许每个应用副本启动时迁移。
- readiness 只有在数据库可连接且 API 要求的最新迁移已成功应用时才返回 200。
- CI 使用真实 MySQL 验证迁移可部署且 schema 与迁移历史一致。
- 新增迁移后，如果未同步 API 要求的 schema 版本，静态检查必须失败。
- 保留可重复执行的关键接口 smoke 验收入口，且默认禁止对非本机目标写入数据。

## 非目标

- 不修改历史迁移。
- 不自动 reset、清空或回滚数据库。
- 不在生产应用启动命令中执行 `prisma migrate deploy`。
- 不引入新的测试框架、数据库服务或依赖。
- 不把 98 个手工场景逐字复制为脆弱的端到端测试套件。

## 方案

### 本地开发准备

API 新增 `db:prepare`，顺序执行：

1. `prisma generate`
2. `prisma migrate deploy`

`predev` 调用 `db:prepare`，使 `pnpm dev` 和单独启动 API 时自动同步已有迁移。`prebuild`、`pretypecheck` 仍只生成 Prisma Client，保证构建和类型检查不依赖可用数据库。

### 生产发布

生产继续遵守现有 `docs/operations/release.md`：发布流程在应用 rollout 前单独执行 `pnpm --filter @moecraft/api db:deploy`。Docker 镜像启动命令不迁移数据库，避免多副本并发迁移。

### Schema 版本契约

新增 `apps/api/src/prisma/schema-version.ts`，导出 `REQUIRED_DATABASE_MIGRATION`，值为最新迁移目录名。

`scripts/check-migrations.mjs` 读取迁移目录并校验：

- 迁移目录按名称排序后的最后一项必须等于 `REQUIRED_DATABASE_MIGRATION`。
- 常量缺失、重复或落后时检查失败，并输出明确修复提示。

这使“新增迁移但忘记更新 readiness 契约”在 CI 阶段失败。

### Readiness

`AppService.getReadiness()` 执行两层探针：

1. `SELECT 1` 验证数据库连通性。
2. 查询 `_prisma_migrations`，确认 `REQUIRED_DATABASE_MIGRATION` 存在、`finished_at` 非空且 `rolled_back_at` 为空。

两层均通过时返回：

```json
{
  "status": "ok",
  "dependencies": {
    "database": "ok",
    "migrations": "ok"
  }
}
```

数据库不可用、迁移表不存在、最新迁移缺失、迁移未完成或已回滚时统一返回 `503 READINESS_FAILED`。`/health` 保持轻量，不访问数据库。

### CI

CI MySQL 服务创建主测试库，并在检查步骤创建独立 shadow 数据库。之后：

1. 生成 Prisma Client。
2. 执行 `prisma migrate deploy`。
3. 执行 `prisma migrate status`。
4. 运行现有格式、静态、类型、测试、构建和迁移一致性检查。

CI 不运行开发迁移命令，也不 reset 数据库。

### Smoke 验收

新增 `scripts/api-functional-smoke.mjs`，覆盖本次事故最关键的真实边界：

- `/health`
- `/readiness`
- 公共目录
- 公共商品列表

默认目标为 `http://127.0.0.1:3102`。如果目标主机不是 `127.0.0.1` 或 `localhost`，脚本必须要求显式设置 `ALLOW_REMOTE_SMOKE=1`；默认 smoke 为只读，不创建测试数据。完整有状态业务验收继续按需执行，避免 CI 污染数据库。

## 测试策略

- AppService 单元测试：
  - 数据库与迁移均正常时返回两项 `ok`。
  - 数据库探针失败时返回 503。
  - 最新迁移缺失时返回 503。
- 迁移静态检查：
  - 当前最新目录与常量一致时通过。
  - 使用独立纯函数测试目录排序和常量比较，避免依赖真实数据库。
- 真实验证：
  - `db:deploy`
  - `prisma migrate status`
  - API build 与 typecheck
  - 现有 API 测试
  - functional smoke

## 错误处理与运维

- readiness 不向客户端泄露数据库错误或迁移名称，只返回稳定的 `READINESS_FAILED`。
- 服务端结构化日志保留错误类型和 requestId；不记录数据库连接串。
- 发布文档明确：readiness 失败时先执行 `prisma migrate status`，不得通过修改历史迁移或 reset 生产库解决。

## 验收标准

- 已创建的空白本地数据库执行 API `dev` 时自动应用已有迁移后启动。
- 有待应用迁移的数据库在迁移前 readiness 返回 503。
- 完整迁移数据库 readiness 返回 200，并报告 `database`、`migrations` 均为 `ok`。
- 新增迁移但未更新 `REQUIRED_DATABASE_MIGRATION` 时 `pnpm check:migrations` 失败。
- 生产文档和 Docker 启动路径不自动执行迁移。
- 所有现有 API 测试、API build、typecheck 与迁移检查通过。
