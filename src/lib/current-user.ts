import { db } from "@/lib/db";

// ログインはステージ7で入れる。それまでは固定ユーザーで動かす
export async function currentUser() {
  const user = await db.user.findFirst({ where: { email: "takahashi@example.com", isActive: true } });
  if (!user) throw new Error("ユーザーが見つかりません。npm run db:seed を実行してください");
  return user;
}
