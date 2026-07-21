# Staging 发布与回滚

## 不可变构建

API 镜像只从提交 SHA 构建，发布时记录镜像 digest，禁止复用或覆盖同名 tag。构建上下文必须是仓库根目录：

```bash
docker build -f apps/api/Dockerfile -t ghcr.io/<organization>/moecraft-api:<git-sha> .
docker push ghcr.io/<organization>/moecraft-api:<git-sha>
docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/<organization>/moecraft-api:<git-sha>
```

镜像不包含 `.env`、源码构建目录或本地依赖，进程以非 root 用户运行。staging 和 production 分别从密钥服务注入配置，不得共享数据库、对象存储、支付或通知凭据。

## Staging 发布

1. 从 `deploy/staging.env.example` 创建未跟踪的 `deploy/staging.env`，把 `API_IMAGE` 固定到 digest。
2. 运行 CI 全部门禁；发布提交必须可追溯到已通过的 workflow run。
3. 发布前执行数据库备份，并记录文件校验和、存储位置与恢复期限。
4. 使用 staging 的 `DATABASE_URL` 执行 `pnpm --filter @moecraft/api db:deploy`。迁移必须遵守 expand/migrate/contract，新旧两个应用版本都能在本次 schema 上运行。
5. 执行 `docker compose --env-file deploy/staging.env -f deploy/docker-compose.staging.yml up -d`。
6. 确认 `/health`、`/readiness`、登录、RBAC 和商品审核路径，再开放 staging 流量。
7. 支付/退款、邮件和对象存储尚无真实 provider；接入对应业务模块后，必须在独立沙箱完成验签、最小权限和失败重试演练，当前不得勾选这些上线项。

生产编排器使用 readiness gate 和 `maxUnavailable=0` 的滚动发布；需要蓝绿时并行部署新 digest，完成 smoke check 后只切换路由。不得让应用启动命令自动执行迁移。

## 快速回滚

回滚负责人先判断 schema 是否仍兼容旧镜像。兼容时把 `API_IMAGE` 改回上一个已验证 digest，重新执行 compose/orchestrator rollout，并观察 readiness、5xx 和登录错误率。迁移不可通过删除列或覆盖历史 SQL 回滚；不兼容时先发布前向修复迁移，再恢复旧应用流量。

回滚完成后记录当前/目标 digest、操作者、时间线、迁移版本和验证结果。支付、订单、库存落地后，回滚前还必须暂停产生新副作用的入口并核对事件积压。
