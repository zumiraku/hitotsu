import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { DENIED, can, type Perm } from "@/lib/permissions";

// ログイン中のユーザー。未ログインならログイン画面へ
export async function currentUser() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  return user;
}

// Server Action 用。権限がなければメッセージを返す側で使う
export async function requirePerm(perm: Perm) {
  const user = await currentUser();
  if (!can(user, perm)) return { user, denied: DENIED };
  return { user, denied: null };
}
