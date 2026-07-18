# MoeCraft UI 组件库协作规范

本文件适用于 `packages/ui`。通用仓库规则仍遵循根目录 `AGENTS.md`，冲突时以本文件更具体的 UI 包规则为准。

## 包职责

- `@moecraft/ui` 是 admin 与 storefront 共用的 Vue 3 基础组件库，只包含框架级 UI、通用布局、交互原语和相关类型。
- 不包含订单、商家、库存等业务语义，不直接请求 API，不读取路由、登录态、localStorage 或应用环境变量。
- 领域类型继续放在 `packages/shared`；业务页面和模块组件留在各应用的业务域目录。

## 目录结构

```text
packages/ui/
├── src/
│   ├── components/     # Button、Card、Input、Table 等 UI 原子/组合组件
│   ├── layout/         # PageContainer、PageHeader、SplitLayout 等通用布局
│   ├── composables/    # 仅 UI 行为相关的通用 composable
│   ├── types.ts        # 公共组件类型
│   └── index.ts        # 唯一公共导出入口
└── docs/               # Vite + Vue 文档站
    └── src/
        ├── App.vue
        ├── catalog.ts
        └── main.ts
```

- 新组件必须从 `src/index.ts` 显式导出；应用不得依赖包内深层路径。
- 仅一个组件内部使用的子组件与其就近存放；两个以上公共组件使用时再提升目录层级。

## Vue 与 TypeScript

- 使用 Vue 3 Composition API 和 `<script setup lang="ts">`。
- Props、emits、slots 和公开类型必须显式声明；禁止用 `any` 逃避组件 API 设计。
- 表单组件使用标准 `modelValue` / `update:modelValue` 协议，并透传合理的原生属性。
- 组件不得修改传入对象；复杂状态优先由使用方控制，组件保持可控和可组合。
- 公共 API 命名使用稳定、语义明确的英文；视觉变体使用有限联合类型，避免任意字符串。

## 样式与主题

- 公共组件不得依赖某个应用的 Less 文件、scoped 全局选择器或私有 class。
- 运行时颜色、阴影和表面层级使用带回退值的 CSS Variables，以便 admin 和 storefront 分别换肤。
- 组件内部样式默认 `scoped`；禁止污染 `body`、`:root` 或应用级布局。
- 尺寸与状态保持一致：focus、hover、active、disabled、loading、invalid 都必须有明确视觉反馈。
- 不在组件中引入在线字体、远程图片或应用品牌资产。

## 可访问性

- 优先使用原生语义元素；不得用 `div` 模拟 button、input、table 或 list。
- 所有交互必须支持键盘操作和清晰的 `:focus-visible` 状态。
- 图标按钮需要可访问名称；加载、错误、选中、展开等状态使用适当的 ARIA 属性。
- 文本与背景保持足够对比度；不能只依靠颜色表达状态。

## 文档要求

- 每个公开组件必须在 `docs/src/catalog.ts` 登记用途、示例、Props、Slots 和 Events。
- 文档示例应直接渲染真实 `@moecraft/ui` 组件，不得维护一套静态 HTML 仿制品。
- 新增或修改公共 API 时，组件代码、`src/index.ts` 和文档必须在同一变更中同步。
- 文档站保持 Vite + Vue + TypeScript 架构，交互逻辑不得退化成手写 DOM 脚本。

## 验证

- 修改组件：运行 `pnpm --filter @moecraft/ui typecheck`。
- 修改文档：运行 `pnpm --filter @moecraft/ui docs:build`。
- 修改公共 API：额外构建或类型检查至少一个实际消费者。
- 不提交 `dist-docs`、临时截图、依赖缓存或本地预览产物。
