import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "社内メモ・引き継ぎ" };

export default function Page() {
  return <ComingSoon title="社内メモ・引き継ぎ" stage={5} items={["引き継ぎ・ルール・メモの分類", "ピン留め・案件への紐づけ", "対応履歴の記録"]} />;
}
