"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { ACTIVITY_LABEL } from "@/lib/labels";
import { parseActivityForm, type ActivityFieldErrors } from "@/lib/schemas/activity";

export type ActivityFormState = {
  ok?: boolean;
  errors?: ActivityFieldErrors;
  message?: string;
  values?: Record<string, string>;
} | null;

const excerpt = (s: string) => (s.length > 40 ? s.slice(0, 40) + "…" : s);

function revalidate(projectId: string | null, customerId: string | null) {
  revalidatePath("/");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

// 案件があれば案件、なければ顧客を監査ログの対象にする
async function target(projectId: string | null, customerId: string | null) {
  if (projectId) {
    const p = await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, name: true, customerId: true } });
    if (!p) return null;
    return { targetType: "project", targetId: p.id, targetLabel: p.name, projectId: p.id, customerId: null };
  }
  const c = await db.customer.findFirst({ where: { id: customerId ?? "", deletedAt: null }, select: { id: true, name: true } });
  if (!c) return null;
  return { targetType: "customer", targetId: c.id, targetLabel: c.name, projectId: null, customerId: c.id };
}

export async function createActivity(_prev: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const parsed = parseActivityForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const t = await target(parsed.data.projectId || null, parsed.data.customerId || null);
  if (!t) return { message: "案件または顧客が見つかりません", values: parsed.raw };

  await db.$transaction(async (tx) => {
    await tx.activity.create({
      data: { type: parsed.data.type, body: parsed.data.body, occurredAt: parsed.data.occurredAt, projectId: t.projectId, customerId: t.customerId, userId: me.id },
    });
    if (t.projectId) await tx.project.update({ where: { id: t.projectId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, {
      userId: me.id,
      action: "UPDATE",
      targetType: t.targetType,
      targetId: t.targetId,
      targetLabel: t.targetLabel,
      changes: [{ field: `対応履歴を追加（${ACTIVITY_LABEL[parsed.data.type]}）`, from: "—", to: excerpt(parsed.data.body) }],
    });
  });

  revalidate(t.projectId, t.customerId);
  return { ok: true };
}

export async function updateActivity(id: string, _prev: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const parsed = parseActivityForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const before = await db.activity.findUnique({ where: { id } });
  if (!before) return { message: "この対応履歴はすでに削除されています" };
  const t = await target(parsed.data.projectId || null, parsed.data.customerId || null);
  if (!t) return { message: "案件または顧客が見つかりません", values: parsed.raw };

  const changed = before.body !== parsed.data.body || before.type !== parsed.data.type || before.occurredAt.getTime() !== parsed.data.occurredAt.getTime() || before.projectId !== t.projectId || before.customerId !== t.customerId;

  await db.$transaction(async (tx) => {
    await tx.activity.update({
      where: { id },
      data: { type: parsed.data.type, body: parsed.data.body, occurredAt: parsed.data.occurredAt, projectId: t.projectId, customerId: t.customerId },
    });
    if (changed) {
      await writeAudit(tx, {
        userId: me.id,
        action: "UPDATE",
        targetType: t.targetType,
        targetId: t.targetId,
        targetLabel: t.targetLabel,
        changes: [{ field: `対応履歴を修正（${ACTIVITY_LABEL[parsed.data.type]}）`, from: excerpt(before.body), to: excerpt(parsed.data.body) }],
      });
    }
  });

  revalidate(before.projectId, before.customerId);
  revalidate(t.projectId, t.customerId);
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<{ message?: string }> {
  const me = await currentUser();
  const a = await db.activity.findUnique({ where: { id } });
  if (!a) return { message: "この対応履歴はすでに削除されています" };
  const t = await target(a.projectId, a.customerId);

  await db.$transaction(async (tx) => {
    await tx.activity.delete({ where: { id } });
    if (t) {
      await writeAudit(tx, {
        userId: me.id,
        action: "UPDATE",
        targetType: t.targetType,
        targetId: t.targetId,
        targetLabel: t.targetLabel,
        changes: [{ field: `対応履歴を削除（${ACTIVITY_LABEL[a.type]}）`, from: excerpt(a.body), to: "—" }],
      });
    }
  });

  revalidate(a.projectId, a.customerId);
  return {};
}
