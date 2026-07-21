#!/usr/bin/env sh
set -eu

: "${MYSQL_HOST:?set MYSQL_HOST}"
: "${MYSQL_DATABASE:?set MYSQL_DATABASE}"
: "${MYSQL_USER:?set MYSQL_USER}"
: "${MYSQL_PASSWORD:?set MYSQL_PASSWORD}"
: "${BACKUP_FILE:?set BACKUP_FILE}"

if [ "${RESTORE_CONFIRM:-}" != "RESTORE_${MYSQL_DATABASE}" ]; then
  echo "refusing restore; set RESTORE_CONFIRM=RESTORE_${MYSQL_DATABASE}" >&2
  exit 1
fi
if [ ! -f "$BACKUP_FILE" ]; then
  echo "backup file does not exist: $BACKUP_FILE" >&2
  exit 1
fi

MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_PWD="$MYSQL_PASSWORD" mysql \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" \
  "$MYSQL_DATABASE" < "$BACKUP_FILE"

echo "restore completed: $BACKUP_FILE -> $MYSQL_DATABASE"
