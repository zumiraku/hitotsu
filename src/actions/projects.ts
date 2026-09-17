"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { diffChanges, writeAudit } from "@/lib/audit";
import { nextProjectCode } from "@/lib/codes";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { fmtDate, yen } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { parseProjectForm, type ProjectFieldErrors } from "@/lib/schemas/project";

export type ProjectFormState = {
  errors?: ProjectFieldErrors;
  message?: string;
  values?: Record<string, string>;
} | null;

async function userNames(ids: (string | null)[]) {
  const wanted = ids.filter((x): x is string => !!x);
  const users = wanted.length ? await db.user.findMany({ where: { id: { in: wanted } }, select: { id: true, name: true } }) : [];
  const map = new Map(users.map((u) => [u.id, u.name]));
  return (id: string | null) => (id ? (map.get(id) ?? "（不明）") : "（未割当）");
}

function revalidate(id?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/customers");
  if (id) revalidatePath(`/projects/${id}`);
}

export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const parsed = parseProjectForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const { memberIds, ...rest } = parsed.data;
  const ownerId = rest.ownerId || null;
  const customer = await db.customer.findFirst({ where: { id: rest.customerId, deletedAt: null }, select: { id: true } });
  if (!customer) return { errors: { customerId: ["顧客が見つかりません"] }, values: parsed.raw };

  const created = await db.$transaction(async (tx) => {
    const code = await nextProjectCode(tx);
    const p = await tx.project.create({
      data: {
        ...rest,
        ownerId,
        code,
        members: { create: memberIds.filter((m) => m !== ownerId).map((userId) => ({ userId })) },
      },
    });
    await writeAudit(tx, { userId: me.id, action: "CREATE", targetType: "project", targetId: p.id, targetLabel: p.name });
    return p;
  });

  revalidate(created.id);
  redirect(`/projects/${created.id}`);
}

export async function updateProject(id: string, _prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const parsed = parseProjectForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const before = await db.project.findFirst({ where: { id, deletedAt: null }, include: { members: { select: { userId: true } }, customer: { select: { name: true } } } });
  if (!before) return { message: "この案件はすでに削除されています" };

  const { memberIds, ...rest } = parsed.data;
  const data = { ...rest, ownerId: rest.ownerId || null };
  const newMembers = [...new Set(memberIds.filter((m) => m !== data.ownerId))].sort();
  const oldMembers = before.members.map((m) => m.userId).sort();

  const changes = diffChanges(before, data, [
    ["name", "案件名"],
    ["status", "ステータス", (v) => STATUS_LABEL[v as ProjectStatus]],
    ["priority", "優先度", (v) => PRIORITY_LABEL[v as keyof typeof PRIORITY_LABEL]],
    ["amount", "金額", (v) => yen(Number(v))],
    ["startDate", "開始日", (v) => fmtDate(v as Date | null)],
    ["dueDate", "納期", (v) => fmtDate(v as Date | null)],
    ["summary", "概要"],
    ["tags", "タグ"],
  ]);
  const nameOf = await userNames([before.ownerId, data.ownerId, ...oldMembers, ...newMembers]);
  if (before.ownerId !== data.ownerId) changes.push({ field: "担当", from: nameOf(before.ownerId), to: nameOf(data.ownerId) });
  if (oldMembers.join() !== newMembers.join()) {
    changes.push({ field: "メンバー", from: oldMembers.map(nameOf).join("、") || "（なし）", to: newMembers.map(nameOf).join("、") || "（なし）" });
  }
  if (before.customerId !== data.customerId) {
    const c = await db.customer.findFirst({ where: { id: data.customerId, deletedAt: null }, select: { name: true } });
    if (!c) return { errors: { customerId: ["顧客が見つかりません"] }, values: parsed.raw };
    changes.push({ field: "顧客", from: before.customer.name, to: c.name });
  }

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: { ...data, members: { deleteMany: {}, create: newMembers.map((userId) => ({ userId })) } },
    });
    if (changes.length) {
      await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "project", targetId: id, targetLabel: data.name, changes });
    }
  });

  revalidate(id);
  redirect(`/projects/${id}`);
}

export async function changeProjectStatus(id: string, status: ProjectStatus): Promise<{ message?: string }> {
  if (!STATUS_ORDER.includes(status)) return { message: "不正なステータスです" };
  const me = await currentUser();
  const p = await db.project.findFirst({ where: { id, deletedAt: null }, select: { name: true, status: true } });
  if (!p) return { message: "この案件はすでに削除されています" };
  if (p.status === status) return {};

  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { status } });
    await writeAudit(tx, {
      userId: me.id,
      action: "STATUS",
      targetType: "project",
      targetId: id,
      targetLabel: p.name,
      changes: [{ field: "ステータス", from: STATUS_LABEL[p.status], to: STATUS_LABEL[status] }],
    });
  });

  revalidate(id);
  return {};
}

export async function deleteProject(id: string): Promise<{ message: string } | undefined> {
  const me = await currentUser();
  const p = await db.project.findFirst({ where: { id, deletedAt: null }, select: { name: true } });
  if (!p) return { message: "この案件はすでに削除されています" };

  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { userId: me.id, action: "DELETE", targetType: "project", targetId: id, targetLabel: p.name });
  });

  revalidate();
  redirect("/projects?deleted=1");
}
