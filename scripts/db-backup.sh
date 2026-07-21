#!/usr/bin/env sh
set -eu

: "${MYSQL_HOST:?set MYSQL_HOST}"
: "${MYSQL_DATABASE:?set MYSQL_DATABASE}"
: "${MYSQL_USER:?set MYSQL_USER}"
: "${MYSQL_PASSWORD:?set MYSQL_PASSWORD}"

MYSQL_PORT="${MYSQL_PORT:-3306}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="${BACKUP_FILE:-${BACKUP_DIR}/${MYSQL_DATABASE}-${timestamp}.sql}"

mkdir -p "$(dirname "$output")"
MYSQL_PWD="$MYSQL_PASSWORD" mysqldump \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --hex-blob \
  --set-gtid-purged=OFF \
  "$MYSQL_DATABASE" > "$output"

chmod 600 "$output"
echo "backup created: $output"
