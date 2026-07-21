# MoeCraft

面向同人手办与周边交易的多商家商城 Monorepo。项目目前处于工程基线阶段，完整产品路线见 [HARNESS.md](./HARNESS.md)。

## 工作区

| 包 | 技术栈 | 本地地址 | 职责 |
|---|---|---|---|
| `@moecraft/storefront` | Nuxt 3 | <http://localhost:3100> | 消费者商城前台 |
| `@moecraft/admin` | Vue 3 + Vite | <http://localhost:3101> | 商家与平台运营后台 |
| `@moecraft/api` | NestJS | <http://localhost:3102> | 业务 API 与健康检查 |
| `@moecraft/shared` | TypeScript | - | 跨端类型、常量与契约 |

## 环境要求

- Node.js 20 或更高版本
- pnpm 10 或更高版本
- MySQL 8.4 LTS（数据库功能接入后使用）

项目固定使用 pnpm workspace 与 Turborepo，请勿使用 npm 或 Yarn 安装依赖。

## 首次启动

```bash
pnpm install
pnpm dev
```

三个应用会并行启动。API 健康检查：

```text
GET http://localhost:3102/health
```

预期返回 `status: "ok"` 和当前 ISO 时间。健康检查不依赖数据库等重量级外部服务。

运行与契约入口：

- `GET http://localhost:3102/readiness`：数据库就绪检查。
- `GET http://localhost:3102/api/docs`：Swagger UI。
- `GET http://localhost:3102/api/openapi.json`：运行时 OpenAPI JSON。
- `GET http://localhost:3102/api/v1/metrics`：平台管理员可读的基础请求指标。

## 环境配置

API 示例配置位于 `apps/api/.env.example`：

```bash
cp apps/api/.env.example apps/api/.env
```

Windows PowerShell 可使用：

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

`.env` 与 `.env.*` 已被 Git 忽略；任何真实密码、令牌和连接串都不得提交。`/health` 不执行数据库查询，但 API 启动仍会校验数据库和 JWT 配置。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm build

pnpm --filter @moecraft/storefront dev
pnpm --filter @moecraft/admin dev
pnpm --filter @moecraft/api dev
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/api openapi:check
```

修改单个应用时应运行最小范围的 `typecheck` 或 `build`；跨包改动在根目录运行 `pnpm typecheck`，交付前按改动风险运行 `pnpm build`。

## 数据库工作流

数据库命令在 API 包中执行，并读取未跟踪的 `apps/api/.env`：

```bash
pnpm --filter @moecraft/api db:generate
pnpm --filter @moecraft/api db:migrate -- --name describe_change
pnpm --filter @moecraft/api db:deploy
pnpm --filter @moecraft/api db:seed
```

本地首次迁移前先创建 `moecraft` 数据库。Seed 是幂等的，但必须在本地 `.env` 中显式设置至少 12 位的 `SEED_ADMIN_PASSWORD`；仓库不提供默认管理员密码。`db:migrate` 只用于本地开发，部署环境使用已提交迁移的 `db:deploy`。

## 当前边界

- Storefront 仍是基础商城首页和目录聚合骨架，交易页面尚未实现。
- Admin 已接入认证、商家入驻、店铺成员、目录和商品审核等 API，订单与结算仍是演示/占位流程。
- API 已完成认证会话、RBAC、审计、文件元数据、商家入驻、店铺、目录和商品审核上架；库存流水、购物车、订单、支付、履约和售后尚未接入。
- 生产化工程能力按 [HARNESS.md](./HARNESS.md) 的工程任务推进，业务交易模块在工程门禁完成前暂缓。
