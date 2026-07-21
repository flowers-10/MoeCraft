# 权限矩阵与审查记录

> 审查范围：当前 API 与 admin 路由；审查日期 2026-07-21。API 是最终授权方，前端菜单只改善体验。

## 角色矩阵

| 角色 | 自己的认证/入驻申请 | 商家店铺/成员 | 自己商家的商品 | 平台类目/IP | 商家入驻审核 | 商品审核 | 审计/指标 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CUSTOMER` | 读写自己的会话和申请 | 无 | 无 | 公开目录只读 | 无 | 无 | 无 |
| `MERCHANT_OWNER` | 读写自己的会话/申请 | 自己店铺；员工创建、权限、停用 | 自己商家，按按钮权限 | 读取目录 | 无 | 无 | 无 |
| `MERCHANT_STAFF` | 自己会话/申请按业务需要 | 仅被授予的 route/button，不能管理成员 | 自己商家，按被授予按钮 | 读取目录 | 无 | 无 | 无 |
| `PLATFORM_OPERATOR` | 自己会话 | 不得修改商家成员 | 不得替商家写商品事实 | 管理目录/IP | 审核申请 | 审核商品 | `audit:read`；无系统指标 |
| `PLATFORM_ADMIN` | 自己会话 | 当前无跨商家成员写端点 | 审核/治理；不代商家写草稿 | 管理目录/IP | 审核并启停 | 审核商品 | 审计和 `system:manage` 指标 |

## 当前端点抽查

- `auth/*`：公开登录/注册/刷新有限流；`me`、access profile 和注销由服务端验证会话。
- `merchant-applications/mine*`：仅申请人角色；队列和审核需要 `merchant:review`；启停商家需要 `merchant:manage`。
- `merchant/*` 与 `merchant/products/*`：角色 + admin route/button + 服务层当前用户/商家 scope 三层约束。
- `catalog/*`：公开目录只读；写操作需要 `catalog:manage`。
- `platform/product-reviews/*`：`product:review` + 平台 route/button；普通商家没有审核权限。
- `audit-logs`：`audit:read`；`metrics`：`system:manage`；异常响应不返回数据库文本。
- `files`：创建需要登录角色并写入 owner；签名下载、扫描和 provider 权限尚未实现，不能把当前元数据端点当成文件访问完成。

## 必须在业务模块接入时复核

1. 每个对象读取、导出、批量操作和下载都要使用资源 owner/merchantId 断言，不能只检查角色。
2. 角色授予、商家成员迁移和平台治理操作需要高权限、审计、前后值和防止自我升权。
3. 多商家会员当前只取一个 membership；多店铺上线前必须改为显式 merchant context，禁止依赖“第一条记录”。
4. 订单、支付、退款、库存和回调要加入重复请求、乱序事件、并发冲突及越权测试。
5. 每次权限矩阵变更同步 shared 常量、API 装饰器、admin route meta、OpenAPI 和测试。

## 放行签字

工程负责人：`<name>`　安全负责人：`<name>`　业务/平台负责人：`<name>`　审查证据链接：`<internal-review-url>`

联系人和链接不写入公开仓库；上线前必须在内部审查系统补齐并关联 commit SHA。
