# ヒトツ

顧客・取引先、案件、タスク、対応履歴、ファイル、社内メモを 1 か所で管理する業務管理システム。
Excel やスプレッドシートに散らばった情報を集約し、担当者が変わっても引き継ぎで困らない状態を作る。

## 構成

- Next.js 16（App Router / TypeScript）
- PostgreSQL 17 + Prisma 7
- Tailwind CSS 4

## セットアップ

前提: Node.js 20 以上、PostgreSQL 17（ローカル）

```bash
# 1. 依存関係
npm install

# 2. 環境変数
cp .env.example .env
# DATABASE_URL を自分の環境に合わせて編集

# 3. DB 作成（初回のみ）
psql -U postgres -c "CREATE DATABASE hitotsu ENCODING 'UTF8' TEMPLATE template0;"

# 4. マイグレーションとサンプルデータ
npm run db:migrate
npm run db:seed

# 5. 起動
npm run dev
```

http://localhost:3000 で開く。DB 接続の確認は http://localhost:3000/api/health 。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルドと起動 |
| `npm run lint` | ESLint |
| `npm run db:migrate` | スキーマ変更をマイグレーションとして作成・適用 |
| `npm run db:deploy` | 本番環境で未適用のマイグレーションを適用 |
| `npm run db:seed` | サンプルデータ投入（既存データは消える） |
| `npm run db:reset` | DB を作り直してマイグレーションと seed をやり直す |
| `npm run db:studio` | Prisma Studio で DB を見る |

## ファイルの保存先

アップロードされたファイルの本体は既定でプロジェクト直下の `storage/`（git 管理外）に保存されます。
S3 互換ストレージ（AWS S3、MinIO、Cloudflare R2 など）に切り替えるときは `.env` で次を設定します。

```
STORAGE_DRIVER=s3
S3_BUCKET=hitotsu-files
S3_REGION=ap-northeast-1
S3_ENDPOINT=              # MinIO / R2 のときだけ
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

1 ファイルの上限は `MAX_UPLOAD_MB`（既定 50）。実行できる形式（exe, bat, js など）は受け付けません。

## ディレクトリ

```
prisma/          スキーマ、マイグレーション、seed
src/app/         画面（App Router）と API
src/components/  共通 UI
src/lib/         DB クライアント、ラベル、日付などのユーティリティ
src/generated/   Prisma Client の生成物（コミットしない）
docs/            開発計画などのドキュメント
storage/         アップロードされたファイルの本体（コミットしない）
```

## 開発の進め方

[docs/開発計画.md](docs/開発計画.md) の 10 ステージに沿って進める。各ステージは動く状態でコミットし、`npm run build` と `npm run lint` が通ることを確認する。
