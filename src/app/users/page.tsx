import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "ユーザー・権限" };

export default function Page() {
  return <ComingSoon title="ユーザー・権限" stage={7} items={["ログイン・ユーザー招待", "ロール（管理者／マネージャー／一般／閲覧のみ）", "権限マトリクス"]} />;
}
