import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "案件" };

export default function Page() {
  return <ComingSoon title="案件" stage={3} items={["案件一覧とかんばんボード（ドラッグでステータス変更）", "案件詳細（タスク・対応履歴・ファイル・社内メモ）", "登録・編集・ステータス変更"]} />;
}
