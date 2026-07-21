# MySQL 备份与恢复手册

## 备份

`scripts/db-backup.sh` 需要本机 MySQL 客户端，并只从环境变量读取连接信息：

```bash
MYSQL_HOST=127.0.0.1 MYSQL_DATABASE=moecraft MYSQL_USER=<user> \
MYSQL_PASSWORD=<password> BACKUP_DIR=backups ./scripts/db-backup.sh
```

脚本使用一致性快照并保存 routines、triggers 和二进制字段，输出权限为 `0600`。完成后计算 SHA-256、加密并上传到独立备份存储；数据库主机本地副本不算有效备份。备份保留期和删除审批由环境合规策略决定。

## 恢复演练

恢复只允许在空白隔离数据库或事故负责人批准的目标上执行：

```bash
MYSQL_HOST=127.0.0.1 MYSQL_DATABASE=moecraft_restore MYSQL_USER=<user> \
MYSQL_PASSWORD=<password> BACKUP_FILE=backups/<backup>.sql \
RESTORE_CONFIRM=RESTORE_moecraft_restore ./scripts/db-restore.sh
```

恢复后必须执行 Prisma migration status、`/readiness`、关键表计数和抽样业务查询，并对比备份 SHA-256。演练记录至少包含备份时间、恢复开始/结束时间、RPO/RTO、校验结果和执行人；未实际演练前不得标记 production 恢复能力已通过。

## 迁移兼容门禁

`pnpm check:migrations` 总会执行 Prisma schema 校验、迁移文件完整性和破坏性 SQL 拦截。CI 另外提供独立 MySQL shadow database，并设置 `SHADOW_DATABASE_URL`，从迁移历史重建 schema 后与当前 `schema.prisma` 做 diff；不一致即失败。

已进入共享环境的迁移文件不可编辑。删除列、重命名、收紧非空约束和大表回填应拆成 expand/migrate/contract 多次发布，并在每次发布前保留可恢复备份。
