# Windows（ローカルの PostgreSQL）向けの簡易バックアップ
# 使い方: powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "backups"
New-Item -ItemType Directory -Force $dest | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$env:PGPASSWORD = $env:DB_PASSWORD
& $pgDump -U postgres -h localhost -d hitotsu --no-owner --format=custom -f (Join-Path $dest "db_$stamp.dump")
Compress-Archive -Path (Join-Path $root "storage\*") -DestinationPath (Join-Path $dest "storage_$stamp.zip") -Force
Get-ChildItem $dest -Filter "db_*.dump" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
Get-ChildItem $dest -Filter "storage_*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
Write-Host "backup done: $dest\db_$stamp.dump"
