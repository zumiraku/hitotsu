import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "変更履歴" };

export default function Page() {
  return <ComingSoon title="変更履歴" stage={7} items={["誰が・いつ・何を変えたかの自動記録", "対象・ユーザーでの絞り込み", "変更前後の値の表示"]} />;
}
