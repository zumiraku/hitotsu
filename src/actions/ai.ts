"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { draftHandover, type HandoverDraft } from "@/lib/ai/handover";
import { writeAudit } from "@/lib/audit";
import { requirePerm } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export async function draftHandoverAction(projectId: string): Promise<{ draft?: HandoverDraft; message?: string }> {
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const draft = await draftHandover(projectId, { authorName: me.name, showAmount: can(me, "amount") });
  if (!draft) return { message: "案件が見つかりません" };
  return { draft };
}

export async function saveHandoverAction(projectId: string, title: string, body: string): Promise<{ message?: string }> {
  const { user: me, denied } = await requirePerm("activity");
  if (denied) return { message: denied };
  const t = title.trim().slice(0, 120);
  const b = body.trim().slice(0, 8000);
  if (!t || !b) return { message: "タイトルと本文を入力してください" };
  const p = await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, customerId: true } });
  if (!p) return { message: "案件が見つかりません" };

  const note = await db.$transaction(async (tx) => {
    const n = await tx.note.create({ data: { title: t, body: b, category: "HANDOVER", pinned: true, projectId: p.id, customerId: p.customerId, authorId: me.id } });
    await writeAudit(tx, { userId: me.id, action: "CREATE", targetType: "note", targetId: n.id, targetLabel: n.title, changes: [{ field: "種類", from: "—", to: "引き継ぎ（下書きから作成）" }] });
    return n;
  });
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/notes?created=1#note-${note.id}`);
}
