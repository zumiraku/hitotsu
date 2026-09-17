import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "タスク" };

export default function Page() {
  return <ComingSoon title="タスク" stage={4} items={["期限ごとのグループ表示（超過・今日・今週・来週以降）", "担当者・案件での絞り込み", "完了チェック・追加"]} />;
}
