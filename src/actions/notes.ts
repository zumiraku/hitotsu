"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { NoteCategory } from "@/generated/prisma/enums";
import { diffChanges, writeAudit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { NOTE_CATEGORY_LABEL } from "@/lib/labels";
import { parseNoteForm, type NoteFieldErrors } from "@/lib/schemas/note";

export type NoteFormState = {
  errors?: NoteFieldErrors;
  message?: string;
  values?: Record<string, string>;
} | null;

function revalidate(projectId?: string | null, customerId?: string | null) {
  revalidatePath("/");
  revalidatePath("/notes");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

async function resolveLinks(projectId: string, customerId: string) {
  const p = projectId ? await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, name: true } }) : null;
  const c = customerId ? await db.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true, name: true } }) : null;
  return { projectId: p?.id ?? null, customerId: c?.id ?? null, projectName: p?.name ?? "（なし）", customerName: c?.name ?? "（なし）" };
}

export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const parsed = parseNoteForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const links = await resolveLinks(parsed.data.projectId, parsed.data.customerId);

  const note = await db.$transaction(async (tx) => {
    const n = await tx.note.create({
      data: { title: parsed.data.title, category: parsed.data.category, body: parsed.data.body, pinned: parsed.data.pinned, projectId: links.projectId, customerId: links.customerId, authorId: me.id },
    });
    await writeAudit(tx, {
      userId: me.id,
      action: "CREATE",
      targetType: "note",
      targetId: n.id,
      targetLabel: n.title,
      changes: [{ field: "種類", from: "—", to: NOTE_CATEGORY_LABEL[n.category] }],
    });
    return n;
  });

  revalidate(links.projectId, links.customerId);
  redirect(`/notes?created=1#note-${note.id}`);
}

export async function updateNote(id: string, _prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const parsed = parseNoteForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const before = await db.note.findUnique({ where: { id }, include: { project: { select: { name: true } }, customer: { select: { name: true } } } });
  if (!before) return { message: "このメモはすでに削除されています" };
  const links = await resolveLinks(parsed.data.projectId, parsed.data.customerId);
  const data = { title: parsed.data.title, category: parsed.data.category, body: parsed.data.body, pinned: parsed.data.pinned, projectId: links.projectId, customerId: links.customerId };

  const changes = diffChanges(before, data, [
    ["title", "タイトル"],
    ["category", "種類", (v) => NOTE_CATEGORY_LABEL[v as NoteCategory]],
    ["pinned", "ピン留め", (v) => (v ? "あり" : "なし")],
    ["body", "本文", (v) => (String(v).length > 40 ? String(v).slice(0, 40) + "…" : String(v))],
  ]);
  if (before.projectId !== data.projectId) changes.push({ field: "案件", from: before.project?.name ?? "（なし）", to: links.projectName });
  if (before.customerId !== data.customerId) changes.push({ field: "顧客", from: before.customer?.name ?? "（なし）", to: links.customerName });

  await db.$transaction(async (tx) => {
    await tx.note.update({ where: { id }, data });
    if (changes.length) await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "note", targetId: id, targetLabel: data.title, changes });
  });

  revalidate(before.projectId, before.customerId);
  revalidate(links.projectId, links.customerId);
  redirect(`/notes?saved=1#note-${id}`);
}

export async function togglePin(id: string, pinned: boolean): Promise<{ message?: string }> {
  const me = await currentUser();
  const n = await db.note.findUnique({ where: { id }, select: { title: true, pinned: true, projectId: true, customerId: true } });
  if (!n) return { message: "このメモはすでに削除されています" };
  if (n.pinned === pinned) return {};
  await db.$transaction(async (tx) => {
    await tx.note.update({ where: { id }, data: { pinned } });
    await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "note", targetId: id, targetLabel: n.title, changes: [{ field: "ピン留め", from: pinned ? "なし" : "あり", to: pinned ? "あり" : "なし" }] });
  });
  revalidate(n.projectId, n.customerId);
  return {};
}

export async function deleteNote(id: string): Promise<{ message?: string }> {
  const me = await currentUser();
  const n = await db.note.findUnique({ where: { id }, select: { title: true, projectId: true, customerId: true } });
  if (!n) return { message: "このメモはすでに削除されています" };
  await db.$transaction(async (tx) => {
    await tx.note.delete({ where: { id } });
    await writeAudit(tx, { userId: me.id, action: "DELETE", targetType: "note", targetId: id, targetLabel: n.title });
  });
  revalidate(n.projectId, n.customerId);
  return {};
}
