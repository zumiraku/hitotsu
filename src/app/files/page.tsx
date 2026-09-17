import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "ファイル" };

export default function Page() {
  return <ComingSoon title="ファイル" stage={6} items={["案件・顧客に紐づけたアップロード", "同名ファイルの版管理（v2, v3…）", "検索・種類での絞り込み"]} />;
}
