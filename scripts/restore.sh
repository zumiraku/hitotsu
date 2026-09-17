#!/bin/sh
# バックアップから復元する。いま入っているデータは消えるので、実行前に必ず現在のバックアップを取ること
# 使い方: ./scripts/restore.sh backups/db_20260917_030000.dump [backups/storage_20260917_030000.tar.gz]
set -eu
cd "$(dirname "$0")/.."
DB_DUMP="${1:?DB のダンプファイルを指定してください}"
STORAGE_TAR="${2:-}"

echo "アプリを止めます"
docker compose stop app
echo "DB を復元します: $DB_DUMP"
docker compose exec -T db psql -U hitotsu -d postgres -c "DROP DATABASE IF EXISTS hitotsu_restore;" >/dev/null
docker compose exec -T db psql -U hitotsu -d postgres -c "CREATE DATABASE hitotsu_restore;" >/dev/null
docker compose exec -T db pg_restore -U hitotsu -d hitotsu_restore --no-owner < "$DB_DUMP"
docker compose exec -T db psql -U hitotsu -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='hitotsu';" >/dev/null
docker compose exec -T db psql -U hitotsu -d postgres -c "DROP DATABASE hitotsu;" >/dev/null
docker compose exec -T db psql -U hitotsu -d postgres -c "ALTER DATABASE hitotsu_restore RENAME TO hitotsu;" >/dev/null

if [ -n "$STORAGE_TAR" ]; then
  echo "ファイルを復元します: $STORAGE_TAR"
  docker run --rm -v hitotsu_storage:/data -v "$(pwd)/$(dirname "$STORAGE_TAR"):/backup" alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$STORAGE_TAR") -C /data"
fi

docker compose up -d app
echo "復元完了"
