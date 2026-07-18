# MoeCraft AI 协作指南

## 项目概览

MoeCraft 是一个面向同人手办与周边商城的 `pnpm` + Turborepo Monorepo。

- `apps/storefront`：Nuxt 3 商城前台（`@moecraft/storefront`，端口 `3100`）
- `apps/admin`：Vue 3 + Vite 运营后台（`@moecraft/admin`，端口 `3101`）
- `apps/api`：NestJS API（`@moecraft/api`，端口 `3102`）
- `packages/shared`：共享 TypeScript 类型与常量（`@moecraft/shared`）

使用 Node.js 20+ 与 `pnpm` 10+。

## 常用命令

除非任务明确针对单个包，否则在仓库根目录运行命令。

```bash
pnpm dev
pnpm build
pnpm typecheck

pnpm --filter @moecraft/admin dev
pnpm --filter @moecraft/admin build
pnpm --filter @moecraft/storefront dev
pnpm --filter @moecraft/api dev
```

交付前运行最小范围的相关构建或类型检查。除非明确要求，否则不要运行 `pnpm clean`，它会删除所有工作区依赖。

## 实现规则

- 改动应限制在任务涉及的应用或包内；工作区有未提交修改时，不要改动无关文件。
- 所有新增应用代码使用严格的 TypeScript；除非不可避免且能说明原因，否则不要引入 `any`。
- 两个及以上应用需要使用的领域类型、DTO、常量或枚举，应放入 `packages/shared`。
- 不要将凭据写入源码。API 本地配置使用 `apps/api/.env`，且不得提交该文件。
- 保留现有包管理器、工作区目录和构建工具；任务不需要时不要新增依赖。

## 前端规范

### 后台（`apps/admin`）

- 使用 Vue 3 Composition API 与 `<script setup lang="ts">`。
- `App.vue` 只处理页面组合和页面级状态；可复用 UI 拆分至 `src/components`。
- 桌面布局必须同时实现响应式行为，并优先匹配现有后台视觉风格。
- Props、emits 和复杂数据结构必须显式类型化。仅在跨页面共享时才引入全局状态。

### 前台（`apps/storefront`）

- 遵循 Nuxt 3 的页面、布局和 composable 文件约定。
- UI 数据与展示逻辑分离；适用时使用共享类型描述商城实体。

## API 规范（`apps/api`）

- 遵循 NestJS 的模块、控制器、服务分层。
- 传输 DTO 必须明确；API 引入验证后，所有外部输入都应验证。
- 控制器不得承载数据库逻辑；通过适当的服务层处理持久化。
- `/health` 必须保持轻量、稳定的健康检查接口。

## 验证要求

- 仅后台 UI 改动：运行对应应用的 `build`。
- 共享类型改动：运行 `pnpm --filter @moecraft/shared typecheck`，并检查受影响的消费者。
- API 改动：运行 `pnpm --filter @moecraft/api build` 或 `typecheck`。
- 未实际运行或检查的内容，不能声称已完成运行时或视觉验证。

## 测试边界

仓库目前没有配置单元、组件或端到端测试运行器。不要在无关任务中顺带新增测试框架、浏览器自动化依赖、数据库或 CI 服务。

- 修改既有行为时，仅在已存在相关测试运行器和相邻测试模式时补充测试。
- 新增认证、定价、库存预占、支付状态、权限等关键流程时，如果尚无测试体系，应先提出最小测试方案。
- 尽可能将确定性的业务逻辑写为独立函数，便于后续单元测试。
- 自动化验证不得使用生产凭据、支付网关或共享数据库。
- 不要只使用快照测试验证后台样式；优先验证数据转换、渲染状态、事件派发和权限结果。

### 最小验证矩阵

| 改动范围 | 必须检查 | 适用时追加检查 |
| --- | --- | --- |
| `apps/admin` UI | `pnpm --filter @moecraft/admin build` | 布局改动时手动检查桌面与移动端 |
| `apps/storefront` UI | `pnpm --filter @moecraft/storefront build` | 手动检查关键购物状态 |
| `apps/api` | `pnpm --filter @moecraft/api build` | 使用本地安全数据检查变更的 HTTP 接口 |
| `packages/shared` | `pnpm --filter @moecraft/shared typecheck` | 构建或类型检查每个受影响消费者 |
| 跨包改动 | `pnpm typecheck` | 交付前运行 `pnpm build` |

## 交付清单

完成任务前，核对并只报告实际执行过的项目：

1. 最小范围的构建或类型检查通过。
2. 新文件符合当前目录对应的 `AGENTS.md` 规则。
3. 补丁未包含环境变量、凭据、构建产物或本地数据库。
4. 未改动任务范围外的用户已有修改。
5. 最终回复说明改动区域、实际执行的验证，以及有意未验证的行为。
