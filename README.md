# ヒトツ — 業務管理システム

> **Service.02　システム開発・インフラ**ーーNext.js 16 / TypeScript / PostgreSQL 17 / Prisma 7 / Tailwind CSS 4

顧客・取引先、案件、タスク、対応履歴、ファイル、社内メモを 1 か所で管理する業務管理システム。

## 課題

案件の情報が Excel とスプレッドシートとメールに散らばっていると、**担当者が変わった瞬間に引き継げなくなります。** 「この件の経緯は前の担当者しか知らない」が積み上がると、顧客対応の品質がそのまま落ちます。

## やったこと

**散らばっていた情報を1か所に集約し、担当者が変わっても引き継げる状態をつくりました。**

横断検索をヘッダーに置き、顧客・案件・タスク・メモ・ファイル・対応履歴をまとめて引けるようにしています。日本語の部分一致を速くするため PostgreSQL の `pg_trgm` を使っています。

Excel からの移行を想定して、CSV インポートは見出し名から列を自動で対応づけ、Excel からの貼り付け（タブ区切り）と Shift_JIS のファイルも読めるようにしました。エラー行は理由付きで表示します。

**AI が無くても全機能が動きます。** 引き継ぎメモの組み立てと自然文検索はルールベースで実装し、`ANTHROPIC_API_KEY` があるときだけ文章整形に Claude を使います。AI が落ちても業務が止まらないようにするためです。事実の追加は AI に許可していません（渡した骨組みの整形のみ）。

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

seed 投入後は次のアカウントでログインできます（パスワードはすべて `password`）。

| ログインID | 名前 | ロール |
| --- | --- | --- |
| admin | 佐藤 健太 | 管理者 |
| takahashi | 高橋 美咲 | マネージャー |
| tanaka | 田中 大輔 | 一般 |
| suzuki | 鈴木 あかね | 一般 |
| yamamoto | 山本 拓也 | 閲覧のみ |

本番ではこれらのパスワードを変えるか無効化し、「ユーザー・権限」画面から実際のユーザーを登録してください。ログインはメールアドレスではなくログインID（半角英数字）で行います。

## テスト

```bash
# 初回のみ: テスト用 DB を作る
psql -U postgres -c "CREATE DATABASE hitotsu_test ENCODING 'UTF8' TEMPLATE template0;"
cp .env.test.example .env.test
npm run test:db      # マイグレーションと seed

npm test             # 単体 + 統合（Server Action と権限）。実行のたびにテスト DB を seed に戻す
npm run test:unit    # 単体だけ（DB 不要）
npm run test:e2e     # 起動中のアプリに対する画面の通し確認（BASE_URL、ローカルの Chrome が必要）
```

## 本番で動かす

Docker Compose で DB・アプリ・マイグレーションをまとめて起動できます。手順は [docs/デプロイ手順.md](docs/デプロイ手順.md)、日々の運用は [docs/運用マニュアル.md](docs/運用マニュアル.md)。

```bash
cp .env.docker.example .env   # DB_PASSWORD を設定
docker compose up -d --build
docker compose run --rm migrate npx tsx scripts/create-admin.ts admin "管理者 太郎" "仮パスワード"
```

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
| `npm test` | テスト（単体 + 統合） |
| `npx tsx scripts/create-admin.ts` | 最初の管理者を作る |
| `scripts/backup.sh` / `scripts/restore.sh` | バックアップと復元（Docker 環境） |

## 認証と権限

- Cookie セッション（30日、HttpOnly）。パスワードは bcrypt でハッシュ化
- ロールは 管理者／マネージャー／一般／閲覧のみ の4つ。できることの一覧は「ユーザー・権限」画面に表示
- **権限は画面の表示だけでなく、すべての Server Action と API で確認しています。** 画面を隠すだけでは、URLを直接叩かれたときに通ってしまうためです
- ユーザー登録時は仮パスワードを発行し、初回ログインで変更を求める。メールは送信しない

## 検索と CSV

- ヘッダーの検索ボックスから顧客・案件・タスク・メモ・ファイル・対応履歴を横断検索できる（空白区切りで AND）
- 日本語の部分一致を速くするため PostgreSQL の `pg_trgm` 拡張を使う（マイグレーションで自動作成。DB ユーザーに拡張作成の権限が必要）
- CSV エクスポートは「データ入出力」から。UTF-8（BOM 付き）
- CSV インポートは顧客・案件・タスクに対応。見出し名から自動で列を対応づけ、Excel からの貼り付け（タブ区切り）と Shift_JIS のファイルも読める。エラー行は理由付きで表示し、全件成功か、エラー行を飛ばすかを選べる

## AI アシスト（任意）

AI がなくても全機能が動きます。ルールベースで次を提供します。

- 案件詳細の「引き継ぎメモ作成」：対応履歴・未完了タスク・社内メモ・資料から引き継ぎメモを組み立て、社内メモとして保存できる
- 検索ボックスの自然文（「田中さんの今週期限のタスク」「サクラ物産の進行中案件」）を担当・顧客・ステータス・期限・種類に分解して検索
- ホームの「本日の状況」

`.env` に `ANTHROPIC_API_KEY` を設定すると、引き継ぎメモの文章整形と、ルールで読み取れなかった検索文の解釈に Claude を使います（モデルは `AI_MODEL`、既定 `claude-opus-5`）。AI が使えないときや失敗したときは自動でルールベースに戻ります。

## ファイルの保存先

アップロードされたファイルの本体は既定でプロジェクト直下の `storage/`（git 管理外）に保存されます。S3 互換ストレージ（AWS S3、MinIO、Cloudflare R2 など）に切り替えるときは `.env` で次を設定します。

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
docs/            開発計画・デプロイ手順・運用マニュアル
scripts/         管理者作成、バックアップ・復元
tests/           単体・統合・画面テスト
storage/         アップロードされたファイルの本体（コミットしない）
```

## 開発の進め方

[docs/開発計画.md](docs/開発計画.md) の 10 ステージに沿って進めます。各ステージは動く状態でコミットし、`npm run build` と `npm run lint` が通ることを確認します。

---

## 制作

**図美楽（ずみらく / zumiraku）** — システム・アプリのAIエンジニア

Web・アプリ開発／システム開発・インフラ／AI活用・セキュリティ。設計から運用まで、ひとりで通しています。実務12年。

| 媒体 | リンク | 表示名 |
|---|---|---|
| note | [note.com/zumiraku](https://note.com/zumiraku) | 図美楽 |
| Qiita | [qiita.com/zumiraku](https://qiita.com/zumiraku) | ずみらく |
| Zenn | [zenn.dev/zumiraku](https://zenn.dev/zumiraku) | ズミラク |
| YOUTRUST | [youtrust.jp/users/zumiraku](https://youtrust.jp/users/zumiraku) | 図ミラク |

表記は媒体によって揺れていますが、どれも同じ人間です。英字は zumiraku で統一しています。

返信は平日なら4時間以内、土日祝でも12時間以内。お仕事のご相談は、要件が固まっていない段階からでも構いません。NDAも対応します。
