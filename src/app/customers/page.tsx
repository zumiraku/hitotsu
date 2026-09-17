import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "顧客・取引先" };

export default function Page() {
  return <ComingSoon title="顧客・取引先" stage={2} items={["顧客・取引先の一覧（検索・絞り込み・並び替え）", "詳細画面（基本情報・先方担当・関連案件・対応履歴・ファイル）", "登録・編集・削除"]} />;
}
