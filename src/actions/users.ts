"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { hashPassword, temporaryPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { requirePerm } from "@/lib/current-user";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLE_ORDER } from "@/lib/permissions";

const COLORS = ["#1F5F8B", "#7A3E9D", "#1F8A4C", "#B7791F", "#C2413B", "#2C7A7B", "#8A5A1F", "#3C6E9E", "#6B4A9E", "#66727F"];

const inviteSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50, "50文字以内で入力してください"),
  loginId: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "ログインIDは3文字以上にしてください")
    .max(30, "ログインIDは30文字以内にしてください")
    .regex(/^[a-z0-9][a-z0-9._-]*$/, "ログインIDは半角の英数字と . _ - で入力してください"),
  department: z.string().trim().max(50, "50文字以内で入力してください"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"], { error: "ロールを選んでください" }),
});

export type InviteState = {
  errors?: Partial<Record<"name" | "loginId" | "department" | "role", string[]>>;
  message?: string;
  values?: Record<string, string>;
  created?: { name: string; loginId: string; password: string };
} | null;

export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user: me, denied } = await requirePerm("users");
  if (denied) return { message: denied };
  const raw = Object.fromEntries(["name", "loginId", "department", "role"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: NonNullable<InviteState>["errors"] = {};
    for (const i of parsed.error.issues) (errors[i.path[0] as keyof typeof errors] ??= []).push(i.message);
    return { errors, values: raw };
  }
  if (await db.user.findUnique({ where: { loginId: parsed.data.loginId }, select: { id: true } })) {
    return { errors: { loginId: ["このログインIDはすでに使われています"] }, values: raw };
  }

  const password = temporaryPassword();
  const count = await db.user.count();
  const created = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: parsed.data.name,
        loginId: parsed.data.loginId,
        department: parsed.data.department || null,
        role: parsed.data.role,
        color: COLORS[count % COLORS.length],
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    await writeAudit(tx, { userId: me.id, action: "CREATE", targetType: "user", targetId: u.id, targetLabel: u.name, changes: [{ field: "ロール", from: "—", to: ROLE_LABEL[u.role] }] });
    return u;
  });

  revalidatePath("/users");
  return { created: { name: created.name, loginId: created.loginId, password } };
}

export async function changeRole(userId: string, role: Role): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("users");
  if (denied) return { message: denied };
  if (!ROLE_ORDER.includes(role)) return { message: "不正なロールです" };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { message: "ユーザーが見つかりません" };
  if (target.role === role) return {};
  if (target.id === me.id && role !== "ADMIN") return { message: "自分自身の管理者権限は外せません" };

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    await writeAudit(tx, { userId: me.id, action: "ROLE", targetType: "user", targetId: userId, targetLabel: target.name, changes: [{ field: "ロール", from: ROLE_LABEL[target.role], to: ROLE_LABEL[role] }] });
  });
  revalidatePath("/users");
  return {};
}

export async function setActive(userId: string, isActive: boolean): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("users");
  if (denied) return { message: denied };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { message: "ユーザーが見つかりません" };
  if (target.id === me.id) return { message: "自分自身は無効にできません" };
  if (target.isActive === isActive) return {};

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) await tx.session.deleteMany({ where: { userId } });
    await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "user", targetId: userId, targetLabel: target.name, changes: [{ field: "状態", from: isActive ? "無効" : "有効", to: isActive ? "有効" : "無効" }] });
  });
  revalidatePath("/users");
  return {};
}

export async function resetPassword(userId: string): Promise<{ message?: string; password?: string }> {
  const { user: me, denied } = await requirePerm("users");
  if (denied) return { message: denied };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { message: "ユーザーが見つかりません" };

  const password = temporaryPassword();
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } });
    await tx.session.deleteMany({ where: { userId } });
    await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "user", targetId: userId, targetLabel: target.name, changes: [{ field: "パスワード", from: "（変更前）", to: "（仮パスワードを発行）" }] });
  });
  revalidatePath("/users");
  return { password };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50, "50文字以内で入力してください"),
  department: z.string().trim().max(50, "50文字以内で入力してください"),
});

export async function updateProfile(userId: string, formData: FormData): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("users");
  if (denied) return { message: denied };
  const parsed = profileSchema.safeParse({ name: String(formData.get("name") ?? ""), department: String(formData.get("department") ?? "") });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { message: "ユーザーが見つかりません" };
  const data = { name: parsed.data.name, department: parsed.data.department || null };
  const changes: { field: string; from: string; to: string }[] = [];
  if (target.name !== data.name) changes.push({ field: "名前", from: target.name, to: data.name });
  if ((target.department ?? "") !== (data.department ?? "")) changes.push({ field: "所属", from: target.department ?? "（空）", to: data.department ?? "（空）" });
  if (!changes.length) return {};
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data });
    await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "user", targetId: userId, targetLabel: data.name, changes });
  });
  revalidatePath("/users");
  return {};
}
