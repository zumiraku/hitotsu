import { db } from "@/lib/db";
import { dueLabel, fileSize, fmtDate, fmtMD } from "@/lib/format";
import { ACTIVITY_LABEL, NOTE_CATEGORY_LABEL, STATUS_LABEL } from "@/lib/labels";

export type SearchKind = "customer" | "project" | "task" | "note" | "file" | "activity";
export type SearchHit = { id: string; kind: SearchKind; title: string; sub: string; href: string };
export type SearchGroup = { kind: SearchKind; label: string; hits: SearchHit[]; total: number };

export const KIND_LABEL: Record<SearchKind, string> = { customer: "顧客・取引先", project: "案件", task: "タスク", note: "社内メモ", file: "ファイル", activity: "対応履歴" };

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

// 空白区切りの語をすべて含むものを探す（AND）
function terms(q: string) {
  return q.replace(/　/g, " ").split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 5);
}

export async function searchAll(q: string, opts: { limit?: number; kinds?: SearchKind[] } = {}): Promise<SearchGroup[]> {
  const words = terms(q);
  if (!words.length) return [];
  const limit = opts.limit ?? 5;
  const want = (k: SearchKind) => !opts.kinds || opts.kinds.includes(k);
  const groups: SearchGroup[] = [];

  if (want("customer")) {
    const where = { deletedAt: null, AND: words.map((w) => ({ OR: [{ name: ci(w) }, { kana: ci(w) }, { code: ci(w) }, { contactName: ci(w) }, { industry: ci(w) }, { tags: { has: w } }] })) };
    const [rows, total] = await Promise.all([
      db.customer.findMany({ where, take: limit, orderBy: { updatedAt: "desc" }, include: { owner: { select: { name: true } } } }),
      db.customer.count({ where }),
    ]);
    if (total) groups.push({ kind: "customer", label: KIND_LABEL.customer, total, hits: rows.map((c) => ({ id: c.id, kind: "customer", title: c.name, sub: [c.code, c.industry, c.owner ? `担当 ${c.owner.name}` : null].filter(Boolean).join(" · "), href: `/customers/${c.id}` })) });
  }

  if (want("project")) {
    const where = { deletedAt: null, AND: words.map((w) => ({ OR: [{ name: ci(w) }, { code: ci(w) }, { summary: ci(w) }, { customer: { name: ci(w) } }, { tags: { has: w } }] })) };
    const [rows, total] = await Promise.all([
      db.project.findMany({ where, take: limit, orderBy: { updatedAt: "desc" }, include: { customer: { select: { name: true } }, owner: { select: { name: true } } } }),
      db.project.count({ where }),
    ]);
    if (total) groups.push({ kind: "project", label: KIND_LABEL.project, total, hits: rows.map((p) => ({ id: p.id, kind: "project", title: p.name, sub: [p.customer.name, STATUS_LABEL[p.status], p.owner?.name, p.dueDate ? `納期 ${fmtDate(p.dueDate)}` : null].filter(Boolean).join(" · "), href: `/projects/${p.id}` })) });
  }

  if (want("task")) {
    const where = { OR: [{ projectId: null }, { project: { deletedAt: null } }], AND: words.map((w) => ({ OR: [{ title: ci(w) }, { project: { name: ci(w) } }, { assignee: { name: ci(w) } }] })) };
    const [rows, total] = await Promise.all([
      db.task.findMany({ where, take: limit, orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }], include: { project: { select: { id: true, name: true } }, assignee: { select: { name: true } } } }),
      db.task.count({ where }),
    ]);
    if (total) groups.push({ kind: "task", label: KIND_LABEL.task, total, hits: rows.map((t) => ({ id: t.id, kind: "task", title: t.title, sub: [t.done ? "完了" : t.dueDate ? `${fmtDate(t.dueDate)}（${dueLabel(t.dueDate)}）` : "期限なし", t.assignee?.name, t.project?.name].filter(Boolean).join(" · "), href: t.project ? `/projects/${t.project.id}` : "/tasks" })) });
  }

  if (want("note")) {
    const where = { AND: words.map((w) => ({ OR: [{ title: ci(w) }, { body: ci(w) }] })) };
    const [rows, total] = await Promise.all([
      db.note.findMany({ where, take: limit, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }], include: { author: { select: { name: true } } } }),
      db.note.count({ where }),
    ]);
    if (total) groups.push({ kind: "note", label: KIND_LABEL.note, total, hits: rows.map((n) => ({ id: n.id, kind: "note", title: n.title, sub: [NOTE_CATEGORY_LABEL[n.category], n.author?.name, n.body.split("\n")[0].slice(0, 60)].filter(Boolean).join(" · "), href: `/notes#note-${n.id}` })) });
  }

  if (want("file")) {
    const where = { OR: [{ projectId: null }, { project: { deletedAt: null } }], AND: words.map((w) => ({ OR: [{ name: ci(w) }, { project: { name: ci(w) } }, { customer: { name: ci(w) } }] })) };
    const [rows, total] = await Promise.all([
      db.file.findMany({ where, take: limit, orderBy: { createdAt: "desc" }, include: { project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } } }),
      db.file.count({ where }),
    ]);
    if (total) groups.push({ kind: "file", label: KIND_LABEL.file, total, hits: rows.map((f) => ({ id: f.id, kind: "file", title: f.name, sub: [`v${f.version}`, fileSize(f.size), f.project?.name ?? f.customer?.name].filter(Boolean).join(" · "), href: f.project ? `/projects/${f.project.id}` : f.customer ? `/customers/${f.customer.id}` : "/files" })) });
  }

  if (want("activity")) {
    const where = { AND: words.map((w) => ({ OR: [{ body: ci(w) }, { project: { name: ci(w) } }, { customer: { name: ci(w) } }] })) };
    const [rows, total] = await Promise.all([
      db.activity.findMany({ where, take: limit, orderBy: { occurredAt: "desc" }, include: { user: { select: { name: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } } }),
      db.activity.count({ where }),
    ]);
    if (total) groups.push({ kind: "activity", label: KIND_LABEL.activity, total, hits: rows.map((a) => ({ id: a.id, kind: "activity", title: a.body.length > 80 ? a.body.slice(0, 80) + "…" : a.body, sub: [ACTIVITY_LABEL[a.type], a.user?.name, fmtMD(a.occurredAt), a.project?.name ?? a.customer?.name].filter(Boolean).join(" · "), href: a.project ? `/projects/${a.project.id}` : a.customer ? `/customers/${a.customer.id}` : "/" })) });
  }

  return groups;
}

