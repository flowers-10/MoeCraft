# MoeCraft

面向同人手办与周边交易的多商家商城 Monorepo。项目目前处于工程基线阶段，完整产品路线见 [HARNESS.md](./HARNESS.md)。

## 工作区

| 包 | 技术栈 | 本地地址 | 职责 |
|---|---|---|---|
| `@moecraft/storefront` | Nuxt 3 | <http://localhost:3000> | 消费者商城前台 |
| `@moecraft/admin` | Vue 3 + Vite | <http://localhost:3001> | 商家与平台运营后台 |
| `@moecraft/api` | NestJS | <http://localhost:3002> | 业务 API 与健康检查 |
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
GET http://localhost:3002/health
```

预期返回 `status: "ok"` 和当前 ISO 时间。健康检查不依赖数据库等重量级外部服务。

## 环境配置

API 示例配置位于 `apps/api/.env.example`：

```bash
cp apps/api/.env.example apps/api/.env
```

Windows PowerShell 可使用：

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

`.env` 与 `.env.*` 已被 Git 忽略；任何真实密码、令牌和连接串都不得提交。当前健康检查基线无需数据库即可运行。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm build

pnpm --filter @moecraft/storefront dev
pnpm --filter @moecraft/admin dev
pnpm --filter @moecraft/api dev
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

- Storefront 是基础商城首页骨架。
- Admin 是响应式运营仪表盘原型，数据仍为演示数据。
- API 当前只提供轻量健康检查。
- 认证、Prisma 数据模型和数据库迁移将在 Harness 对应单元中成套接入，避免保留不可运行的半实现。
