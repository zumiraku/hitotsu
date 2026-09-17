export const metadata = { title: "開発計画" };

const STAGES: { n: number; title: string; done?: boolean; items: string[] }[] = [
  { n: 1, title: "基盤構築", done: true, items: ["Next.js + TypeScript + Tailwind の雛形", "PostgreSQL 17 と Prisma、全テーブルのスキーマとマイグレーション", "シードデータ、共通レイアウト、ダッシュボードの土台"] },
  { n: 2, title: "顧客・取引先管理", done: true, items: ["一覧（検索・絞り込み・並び替え）", "詳細（基本情報・先方担当・関連案件・対応履歴・ファイル）", "登録・編集・削除、コード自動採番"] },
  { n: 3, title: "案件・進捗管理", done: true, items: ["一覧とかんばんボード", "案件詳細（タスク・対応履歴・ファイル・社内メモ）", "ステータス変更と要確認アラート"] },
  { n: 4, title: "タスク・期限・ダッシュボード", done: true, items: ["期限グループ表示と完了操作", "ダッシュボードの本実装（KPI・14日カレンダー・分布）"] },
  { n: 5, title: "対応履歴・社内メモ・引き継ぎ", done: true, items: ["電話／メール／訪問／来社／メモの記録", "引き継ぎ・ルール・メモの分類、ピン留め"] },
  { n: 6, title: "ファイル管理", items: ["案件・顧客に紐づけたアップロード", "同名ファイルの版管理、ストレージ抽象化"] },
  { n: 7, title: "ユーザー・権限・変更履歴", items: ["ログイン・招待", "4 ロールの権限を画面と処理の両方で強制", "変更履歴の自動記録"] },
  { n: 8, title: "検索・絞り込み・CSV 入出力", items: ["横断検索（全文検索）", "CSV エクスポート／インポート（自動対応づけ・プレビュー）"] },
  { n: 9, title: "AI アシスト", items: ["引き継ぎメモの自動下書き", "自然言語での検索"] },
  { n: 10, title: "テスト・本番導入", items: ["自動テスト、本番ビルド", "Docker Compose、バックアップ、運用マニュアル"] },
];

export default function PlanPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold">開発計画</h1>
        <p className="mt-0.5 text-[13px] text-muted">MVP を早く動かし、運用しながら段階的に育てる。詳細は docs/開発計画.md</p>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {STAGES.map((s) => (
          <li key={s.n} className={`card ${s.done ? "border-good" : ""}`}>
            <div className="card-body">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`badge ${s.done ? "bg-good-soft text-good" : "bg-neutral-soft text-neutral"}`}>ステージ {s.n}</span>
                <h2 className="text-[15px] font-bold">{s.title}</h2>
                {s.done ? <span className="ml-auto text-[12px] font-bold text-good">完了</span> : null}
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-ink-2">
                {s.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
