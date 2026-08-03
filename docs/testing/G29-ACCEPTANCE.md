# G29 评价系统验收手册

## 1. 验收范围与结论规则

本手册验收 G29 评价：订单完成后评价（限制每订单项一次）、评分/文本/图片、商家回复、平台隐藏违规内容、商品聚合评分。

每个用例同时满足"接口/页面结果"和"数据不变量"才算通过。出现未完成订单的可评价、同订单项重复评价、非本店商家回复、隐藏操作不可审计、评分范围溢出（1-5 之外），均直接判定不通过。

关键约定：

- 只有 `COMPLETED` 订单的订单项可以评价，每订单项 `unique` 约束限制一次。
- 评分范围 1–5，整数。
- 聚合评分：`averageRating` 保留一位小数、`reviewCount`、`ratingDistribution`（1-5 各星级数量）。
- 商家回复仅限 `storeId` 匹配的商家，且每条评价只能回复一次。
- 平台隐藏操作写 `AuditLog`，隐藏后评价不出现在商品页，但后台仍可见。

## 2. 准备工作

1. 迁移 `20260802150843_g29_reviews` 已应用（`Review` 表存在）。
2. `pnpm run dev` 启动 API。
3. 准备测试数据：
   - 两个 CUSTOMER 账号 A/B；
   - 一个 ACTIVE 商家（商家 1）及商家账号；
   - 一个 PLATFORM_OPERATOR；
   - 客户 A 有一笔 `COMPLETED` 订单，至少含两个订单项；
   - 客户 B 有一笔 `PAID` 订单（未完成）。

## 3. G29-01 评价创建与约束

操作：客户 A 对已完成订单的某个订单项创建评价，评分 4，文本"质量不错"。

验收标准：

- `POST /api/v1/reviews` 返回 201，`rating=4`、`content="质量不错"`、`isHidden=false`、`images=[]`；
- 对该订单项再次评价返回 `409 REVIEW_ALREADY_EXISTS`；
- 评分设为 0 或 6 返回 `409 REVIEW_INVALID_RATING`；
- 客户 B 对已完成订单的订单项评价返回 `404 ORDER_ITEM_NOT_FOUND`（不是自己的订单）；
- 客户 A 对 `PAID` 订单的订单项评价返回 `409 REVIEW_ORDER_NOT_COMPLETED`。

## 4. G29-02 评价列表与聚合评分

操作：客户 A 再创建一条评分 5 的评价（不同订单项），客户 B 也创建一条评分 3 的评价。

验收标准：

- `GET /api/v1/reviews/product/:productId` 分页返回公开评价（`isHidden=false`），含买家 displayName、评分、内容、创建时间；
- `GET /api/v1/reviews/product/:productId/rating` 返回 `averageRating`（精确一位小数）、`reviewCount`、`ratingDistribution`（按 1–5 星级分布）；
- 聚合评分排除已隐藏评价。

## 5. G29-03 商家回复

操作：商家 1 在管理端 `/commerce/reviews` 对某条评价输入回复内容并提交。

验收标准：

- `PATCH /api/v1/admin/reviews/:id/reply` 返回评价含 `reply` 字段（`content`、`repliedBy`、`repliedAt`）；
- 已回复的评价再次回复返回 `409 REVIEW_ALREADY_REPLIED`；
- 非本店商家回复返回 403。

## 6. G29-04 平台隐藏

操作：PLATFORM_OPERATOR 在管理端对违规评价点击"隐藏"，填写原因。

验收标准：

- `PATCH /api/v1/admin/reviews/:id/hide` 返回 `isHidden=true`；
- 隐藏后前台商品评价列表不出现该评价，聚合评分重新计算；
- 管理端筛选"仅显示已隐藏"可见该评价，可取消隐藏（`isHidden=false`）；
- `AuditLog` 记录 `review.hidden`/`review.unhidden`，含操作人和原因；
- 普通商家调用 hide 返回 403。

## 7. 自动化回归命令

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
