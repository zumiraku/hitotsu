import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "データ入出力" };

export default function Page() {
  return <ComingSoon title="データ入出力" stage={8} items={["CSVエクスポート（顧客・案件・タスク・対応履歴）", "CSVインポート（見出しの自動対応づけ・プレビュー）", "既存Excel・スプレッドシートからの移行"]} />;
}
