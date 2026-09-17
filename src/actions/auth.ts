"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroyOtherSessions, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/rate-limit";

export type AuthState = { message?: string; values?: Record<string, string> } | null;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "メールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
  next: z.string().optional(),
});

// ログインの失敗理由は分けない（存在するメールかどうかを推測させない）
const LOGIN_FAILED = "メールアドレスまたはパスワードが違います";

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""), next: String(formData.get("next") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { message: parsed.error.issues[0].message, values: { email: raw.email } };

  // 同じ相手からの連続失敗だけを止める（他人のアカウントを外からロックできないように IP も鍵に入れる）
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const limitKey = `${ip}|${parsed.data.email}`;
  const blockedFor = loginBlocked(limitKey);
  if (blockedFor) return { message: `失敗が続いたため、あと${blockedFor}分ほどログインできません`, values: { email: raw.email } };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user && user.isActive && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!ok) {
    // 実在しないユーザーでも同じくらいの時間がかかるようにしておく
    if (!user) await verifyPassword(parsed.data.password, "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345678");
    recordLoginFailure(limitKey);
    return { message: LOGIN_FAILED, values: { email: raw.email } };
  }
  clearLoginFailures(limitKey);

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit(db, { userId: user.id, action: "LOGIN", targetType: "user", targetId: user.id, targetLabel: user.name });

  if (user.mustChangePassword) redirect("/settings/password?first=1");
  const next = parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/";
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

const passwordSchema = z
  .object({
    current: z.string(),
    password: z.string().min(8, "新しいパスワードは8文字以上にしてください").max(100, "100文字以内にしてください"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "確認用のパスワードが一致しません" })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "今と同じパスワードは使えません" });

export type PasswordState = { errors?: Partial<Record<"current" | "password" | "confirm", string[]>>; message?: string; ok?: boolean } | null;

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const me = await currentUser();
  const raw = { current: String(formData.get("current") ?? ""), password: String(formData.get("password") ?? ""), confirm: String(formData.get("confirm") ?? "") };
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: NonNullable<PasswordState>["errors"] = {};
    for (const i of parsed.error.issues) (errors[i.path[0] as keyof typeof errors] ??= []).push(i.message);
    return { errors };
  }
  if (!(await verifyPassword(parsed.data.current, me.passwordHash))) return { errors: { current: ["今のパスワードが違います"] } };

  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } });
  await destroyOtherSessions(me.id);
  await writeAudit(db, { userId: me.id, action: "UPDATE", targetType: "user", targetId: me.id, targetLabel: me.name, changes: [{ field: "パスワード", from: "（変更前）", to: "（変更後）" }] });
  return { ok: true };
}
