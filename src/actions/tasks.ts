"use server";

import { revalidatePath } from "next/cache";
import { diffChanges, writeAudit } from "@/lib/audit";
import { requirePerm } from "@/lib/current-user";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { parseTaskForm, type TaskFieldErrors } from "@/lib/schemas/task";

export type TaskFormState = {
  ok?: boolean;
  errors?: TaskFieldErrors;
  message?: string;
  values?: Record<string, string>;
} | null;

function revalidate(projectId?: string | null) {
  revalidatePath("/");
  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

async function nameOf(id: string | null) {
  if (!id) return "（未割当）";
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return u?.name ?? "（不明）";
}

async function projectLabel(id: string | null) {
  if (!id) return "（案件なし）";
  const p = await db.project.findUnique({ where: { id }, select: { name: true } });
  return p?.name ?? "（不明）";
}

export async function createTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const projectId = parsed.data.projectId || null;
  if (projectId) {
    const p = await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
    if (!p) return { errors: { projectId: ["案件が見つかりません"] }, values: parsed.raw };
  }

  await db.$transaction(async (tx) => {
    const t = await tx.task.create({
      data: { title: parsed.data.title, projectId, assigneeId: parsed.data.assigneeId || null, dueDate: parsed.data.dueDate, createdById: me.id },
    });
    if (projectId) await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, {
      userId: me.id,
      action: "CREATE",
      targetType: "task",
      targetId: t.id,
      targetLabel: t.title,
      changes: [
        { field: "案件", from: "—", to: await projectLabel(projectId) },
        { field: "担当", from: "—", to: await nameOf(t.assigneeId) },
        { field: "期限", from: "—", to: t.dueDate ? fmtDate(t.dueDate) : "期限なし" },
      ],
    });
  });

  revalidate(projectId);
  return { ok: true };
}

export async function updateTask(id: string, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const before = await db.task.findUnique({ where: { id } });
  if (!before) return { message: "このタスクはすでに削除されています" };

  const data = { title: parsed.data.title, projectId: parsed.data.projectId || null, assigneeId: parsed.data.assigneeId || null, dueDate: parsed.data.dueDate };
  const changes = diffChanges(before, data, [
    ["title", "タスク名"],
    ["dueDate", "期限", (v) => (v ? fmtDate(v as Date) : "期限なし")],
  ]);
  if (before.assigneeId !== data.assigneeId) changes.push({ field: "担当", from: await nameOf(before.assigneeId), to: await nameOf(data.assigneeId) });
  if (before.projectId !== data.projectId) changes.push({ field: "案件", from: await projectLabel(before.projectId), to: await projectLabel(data.projectId) });

  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data });
    if (changes.length) await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "task", targetId: id, targetLabel: data.title, changes });
  });

  revalidate(before.projectId);
  if (data.projectId !== before.projectId) revalidate(data.projectId);
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const t = await db.task.findUnique({ where: { id }, select: { title: true, done: true, projectId: true } });
  if (!t) return { message: "このタスクはすでに削除されています" };
  if (t.done === done) return {};

  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data: { done, doneAt: done ? new Date() : null } });
    if (t.projectId) await tx.project.update({ where: { id: t.projectId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, {
      userId: me.id,
      action: "UPDATE",
      targetType: "task",
      targetId: id,
      targetLabel: t.title,
      changes: [{ field: "状態", from: done ? "未完了" : "完了", to: done ? "完了" : "未完了" }],
    });
  });

  revalidate(t.projectId);
  return {};
}

export async function deleteTask(id: string): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const t = await db.task.findUnique({ where: { id }, select: { title: true, projectId: true } });
  if (!t) return { message: "このタスクはすでに削除されています" };

  await db.$transaction(async (tx) => {
    await tx.task.delete({ where: { id } });
    await writeAudit(tx, { userId: me.id, action: "DELETE", targetType: "task", targetId: id, targetLabel: t.title });
  });

  revalidate(t.projectId);
  return {};
}
