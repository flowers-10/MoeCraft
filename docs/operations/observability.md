# API 可观测性基线

## 信号与入口

- `/health`：存活检查，不访问数据库。
- `/readiness`：就绪检查，执行轻量数据库探针；失败返回 `503 READINESS_FAILED`。
- `/api/v1/metrics`：仅 `system:manage` 可读，返回请求总数、5xx 数量、状态分组、平均耗时和进程运行时间。
- `/api/openapi.json`：运行时 OpenAPI；仓库基线位于 `apps/api/openapi/api-v1.json`。
- HTTP 响应透传 `X-Request-Id` 和 W3C `traceparent`；日志包含 `requestId`、`traceId`、状态与耗时。

设置 `TELEMETRY_EXPORT_URL` 后，API 会向 JSON collector 发送请求 span 和脱敏异常事件；`TELEMETRY_EXPORT_TOKEN` 仅用于传输鉴权。导出超时为 2 秒，失败不会影响业务请求。

## 初始 SLO

| 信号 | 目标 | 告警建议 |
| --- | --- | --- |
| API 可用性 | 月度 99.9% | 5 分钟窗口低于 99% 触发 P1 |
| 公共读接口 P95 | 小于 500ms | 连续 10 分钟超过 800ms 触发 P2 |
| 写接口 P95 | 小于 1000ms | 连续 10 分钟超过 1500ms 触发 P2 |
| 5xx 比例 | 小于 1% | 5 分钟超过 2% 触发 P1 |
| `/readiness` | 持续成功 | 连续 3 次失败触发 P1 并停止接流量 |
| 支付回调失败 | 0 个未处理超过 5 分钟 | 任一超时事件触发 P1 |
| 队列死信 | 0 个未确认超过 15 分钟 | 达到阈值触发 P2 |

交易指标在订单、支付和库存模块落地时追加；不得用当前缺少业务数据的指标伪造上线容量结论。

## 数据边界

日志和 telemetry 不发送请求体、Authorization、Cookie、密码、token、证件号、完整联系方式或支付数据。生产 collector 必须使用 HTTPS、独立密钥、最小保留期和访问审计。
