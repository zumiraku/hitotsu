#!/bin/sh
# DB とアップロードファイルをまとめてバックアップする（docker compose 環境用）
# 使い方: ./scripts/backup.sh [保存先ディレクトリ]   既定は ./backups
# 例: 毎日3時に取る → crontab に  0 3 * * * cd /opt/hitotsu && ./scripts/backup.sh >> backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
KEEP_DAYS="${KEEP_DAYS:-30}"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U hitotsu -d hitotsu --no-owner --format=custom > "$DEST/db_$STAMP.dump"
docker compose run --rm -T --no-deps -v "$(pwd)/$DEST:/backup" app sh -c "cd /app && tar czf /backup/storage_$STAMP.tar.gz storage" 2>/dev/null \
  || docker run --rm -v hitotsu_storage:/data -v "$(pwd)/$DEST:/backup" alpine tar czf "/backup/storage_$STAMP.tar.gz" -C /data .

find "$DEST" -name 'db_*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DEST" -name 'storage_*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "backup done: $DEST/db_$STAMP.dump, $DEST/storage_$STAMP.tar.gz"
