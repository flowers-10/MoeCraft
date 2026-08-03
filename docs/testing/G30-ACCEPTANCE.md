# G30 收藏与通知验收手册

## 1. 验收范围与结论规则

本手册验收 G30 收藏与通知：收藏商品/店铺（toggle/add/remove/list）、站内信通知列表/已读/未读数/全部已读。

每个用例同时满足"接口/页面结果"和"数据不变量"才算通过。出现未登录可收藏、同一用户重复收藏同一目标、已读标记可跨用户篡改、未登录查看通知，均直接判定不通过。

关键约定：

- 收藏以 `userId + targetType + targetId` 唯一约束保证幂等，toggle 模式同一端点管理收藏/取消。
- 通知 `userId` 隔离，`isRead` 默认 false；markRead 批量更新仅影响调用者自己的通知。
- 通知类型覆盖：`ORDER`、`PAYMENT`、`SHIPMENT`、`AFTER_SALE`、`REVIEW`、`SETTLEMENT` 等。

## 2. 准备工作

1. 迁移 `20260802155436_g30_favorites_notifications` 已应用（`Favorite`、`Notification` 表存在）。
2. `pnpm run dev` 启动 API。
3. 准备测试数据：
   - 两个 CUSTOMER 账号 A/B；
   - 至少一个 ACTIVE 商品和一个 ACTIVE 店铺；
   - 在 Notification 表中预先插入几条客户 A 的通知（含已读和未读）。

## 3. G30-01 收藏商品与店铺

操作：客户 A 在 storefront 商品详情页/店铺页点击收藏，再点击取消收藏。

验收标准：

- `POST /api/v1/favorites`（`targetType=PRODUCT, targetId=xxx`）首次返回 `{ favorited: true }`；
- `Favorite` 表新增一条 `userId=A, targetType=PRODUCT, targetId=xxx`；
- 再次调用同一参数返回 `{ favorited: false }`，记录已删除；
- 客户 B 调用不删除客户 A 的收藏；
- 未登录调用返回 401。

## 4. G30-02 收藏列表与筛选

操作：客户 A 分别收藏商品和店铺后访问 `/account/favorites`。

验收标准：

- `GET /api/v1/favorites` 返回全部收藏列表，按 `createdAt` 降序；
- `GET /api/v1/favorites?type=PRODUCT` 仅返回商品收藏；
- `GET /api/v1/favorites?type=STORE` 仅返回店铺收藏；
- 列表为空时页面展示空态，不报错；
- `GET /api/v1/favorites/check/PRODUCT/:id` 返回当前收藏状态；
- 客户 B 列表不包含客户 A 的收藏。

## 5. G30-03 站内信通知

操作：客户 A 在 storefront Header 看到未读角标数字，点击进入通知列表。

验收标准：

- `GET /api/v1/notifications/unread-count` 返回 `{ count: N }`；
- `GET /api/v1/notifications?unread=true` 仅返回未读通知，含 `type`、`title`、`body`、`isRead`、`createdAt`；
- `GET /api/v1/notifications`（不带参数）返回全部通知；
- `PATCH /api/v1/notifications/:id/read` 将指定通知标记为已读，不可逆；
- 标记他人通知返回 200 但不实际更新（只更新 own userId 匹配的行）；
- 页面刷新后未读数递减。

## 6. G30-04 全部已读

操作：点击"全部已读"。

验收标准：

- `PATCH /api/v1/notifications/read-all` 将所有未读通知标记为已读；
- `unread-count` 返回 `{ count: 0 }`；
- 客户 B 的通知不受影响；
- 商家和平台账号也可使用通知系统（`RequireRoles` 包含全部角色）。

## 7. 自动化回归命令

```powershell
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api build
pnpm --filter @moecraft/storefront build
pnpm typecheck
pnpm build
pnpm check:migrations
pnpm secrets:check
```
