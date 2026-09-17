import type { ProjectStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { dueLabel, endOfWeek, fileSize, fmtDate, fmtMD, startOfToday } from "@/lib/format";
import { ACTIVITY_LABEL, NOTE_CATEGORY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { liveProject, liveRefs } from "@/lib/scope";

export type SearchKind = "customer" | "project" | "task" | "note" | "file" | "activity";
export type SearchHit = { id: string; kind: SearchKind; title: string; sub: string; href: string };
export type SearchGroup = { kind: SearchKind; label: string; hits: SearchHit[]; total: number };
export type TimeFilter = "overdue" | "today" | "week" | "next" | "month";

export type SearchFilters = {
  words: string[];
  assigneeId?: string | null;
  customerId?: string | null;
  status?: ProjectStatus | null;
  time?: TimeFilter | null;
  kinds?: SearchKind[] | null;
};

export const KIND_LABEL: Record<SearchKind, string> = { customer: "顧客・取引先", project: "案件", task: "タスク", note: "社内メモ", file: "ファイル", activity: "対応履歴" };

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export function splitWords(q: string) {
  return q.replace(/　/g, " ").split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 5);
}

// 期限の条件を DATE 列の範囲に直す
function dueRange(time: TimeFilter | null | undefined) {
  if (!time) return null;
  const today = startOfToday();
  const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const add = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const we = endOfWeek();
  switch (time) {
    case "overdue":
      return { lt: utc(today) };
    case "today":
      return { equals: utc(today) };
    case "week":
      return { gte: utc(today), lte: utc(we) };
    case "next":
      return { gte: utc(add(we, 1)), lte: utc(add(we, 7)) };
    case "month":
      return { gte: utc(new Date(today.getFullYear(), today.getMonth(), 1)), lte: utc(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
}

export async function searchAll(f: SearchFilters, opts: { limit?: number } = {}): Promise<SearchGroup[]> {
  const words = f.words;
  const hasFilter = !!(f.assigneeId || f.customerId || f.status || f.time);
  if (!words.length && !hasFilter) return [];
  const limit = opts.limit ?? 5;
  const want = (k: SearchKind) => !f.kinds || f.kinds.includes(k);
  const groups: SearchGroup[] = [];
  const due = dueRange(f.time);
  const wordsAnd = (build: (w: string) => object) => words.map((w) => build(w));
  // 期限やステータスの条件は、それを持たない種類（顧客・メモ・ファイル・履歴）には合わないので飛ばす
  const timeOrStatus = !!(f.time || f.status);

  if (want("customer") && !timeOrStatus) {
    const where = {
      deletedAt: null,
      ...(f.assigneeId ? { ownerId: f.assigneeId } : {}),
      ...(f.customerId ? { id: f.customerId } : {}),
      AND: wordsAnd((w) => ({ OR: [{ name: ci(w) }, { kana: ci(w) }, { code: ci(w) }, { contactName: ci(w) }, { industry: ci(w) }, { tags: { has: w } }] })),
    };
    const [rows, total] = await Promise.all([db.customer.findMany({ where, take: limit, orderBy: { updatedAt: "desc" }, include: { owner: { select: { name: true } } } }), db.customer.count({ where })]);
    if (total) groups.push({ kind: "customer", label: KIND_LABEL.customer, total, hits: rows.map((c) => ({ id: c.id, kind: "customer", title: c.name, sub: [c.code, c.industry, c.owner ? `担当 ${c.owner.name}` : null].filter(Boolean).join(" · "), href: `/customers/${c.id}` })) });
  }

  if (want("project")) {
    const openStatuses: ProjectStatus[] = ["LEAD", "ACTIVE", "HOLD"];
    const where = {
      deletedAt: null,
      ...(f.assigneeId ? { OR: [{ ownerId: f.assigneeId }, { members: { some: { userId: f.assigneeId } } }] } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.status ? { status: f.status } : due ? { status: { in: openStatuses } } : {}),
      ...(due ? { dueDate: due } : {}),
      AND: wordsAnd((w) => ({ OR: [{ name: ci(w) }, { code: ci(w) }, { summary: ci(w) }, { customer: { name: ci(w) } }, { tags: { has: w } }] })),
    };
    const [rows, total] = await Promise.all([
      db.project.findMany({ where, take: limit, orderBy: due ? { dueDate: "asc" } : { updatedAt: "desc" }, include: { customer: { select: { name: true } }, owner: { select: { name: true } } } }),
      db.project.count({ where }),
    ]);
    if (total) groups.push({ kind: "project", label: KIND_LABEL.project, total, hits: rows.map((p) => ({ id: p.id, kind: "project", title: p.name, sub: [p.customer.name, STATUS_LABEL[p.status], p.owner?.name, p.dueDate ? `納期 ${fmtDate(p.dueDate)}（${dueLabel(p.dueDate)}）` : null].filter(Boolean).join(" · "), href: `/projects/${p.id}` })) });
  }

  if (want("task")) {
    const projectCond = { ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.status ? { status: f.status } : {}) };
    const where = {
      ...liveProject,
      ...(f.assigneeId ? { assigneeId: f.assigneeId } : {}),
      ...(Object.keys(projectCond).length ? { project: projectCond } : {}),
      ...(due ? { dueDate: due, done: false } : hasFilter ? { done: false } : {}),
      AND: wordsAnd((w) => ({ OR: [{ title: ci(w) }, { project: { name: ci(w) } }, { assignee: { name: ci(w) } }] })),
    };
    const [rows, total] = await Promise.all([
      db.task.findMany({ where, take: limit, orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }], include: { project: { select: { id: true, name: true } }, assignee: { select: { name: true } } } }),
      db.task.count({ where }),
    ]);
    if (total) groups.push({ kind: "task", label: KIND_LABEL.task, total, hits: rows.map((t) => ({ id: t.id, kind: "task", title: t.title, sub: [t.done ? "完了" : t.dueDate ? `${fmtDate(t.dueDate)}（${dueLabel(t.dueDate)}）` : "期限なし", t.assignee?.name, t.project?.name].filter(Boolean).join(" · "), href: t.project ? `/projects/${t.project.id}` : "/tasks" })) });
  }

  if (want("note") && !timeOrStatus) {
    const where = {
      ...(f.assigneeId ? { authorId: f.assigneeId } : {}),
      ...(f.customerId ? { OR: [{ customerId: f.customerId }, { project: { customerId: f.customerId } }] } : {}),
      AND: [...liveRefs.AND, ...wordsAnd((w) => ({ OR: [{ title: ci(w) }, { body: ci(w) }] }))],
    };
    const [rows, total] = await Promise.all([db.note.findMany({ where, take: limit, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }], include: { author: { select: { name: true } } } }), db.note.count({ where })]);
    if (total) groups.push({ kind: "note", label: KIND_LABEL.note, total, hits: rows.map((n) => ({ id: n.id, kind: "note", title: n.title, sub: [NOTE_CATEGORY_LABEL[n.category], n.author?.name, n.body.split("\n")[0].slice(0, 60)].filter(Boolean).join(" · "), href: `/notes#note-${n.id}` })) });
  }

  if (want("file") && !timeOrStatus) {
    const where = {
      ...(f.assigneeId ? { uploaderId: f.assigneeId } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      AND: [...liveRefs.AND, ...wordsAnd((w) => ({ OR: [{ name: ci(w) }, { project: { name: ci(w) } }, { customer: { name: ci(w) } }] }))],
    };
    const [rows, total] = await Promise.all([db.file.findMany({ where, take: limit, orderBy: { createdAt: "desc" }, include: { project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } } }), db.file.count({ where })]);
    if (total) groups.push({ kind: "file", label: KIND_LABEL.file, total, hits: rows.map((x) => ({ id: x.id, kind: "file", title: x.name, sub: [`v${x.version}`, fileSize(x.size), x.project?.name ?? x.customer?.name].filter(Boolean).join(" · "), href: x.project ? `/projects/${x.project.id}` : x.customer ? `/customers/${x.customer.id}` : "/files" })) });
  }

  if (want("activity") && !timeOrStatus) {
    const where = {
      ...(f.assigneeId ? { userId: f.assigneeId } : {}),
      ...(f.customerId ? { OR: [{ customerId: f.customerId }, { project: { customerId: f.customerId } }] } : {}),
      AND: [...liveRefs.AND, ...wordsAnd((w) => ({ OR: [{ body: ci(w) }, { project: { name: ci(w) } }, { customer: { name: ci(w) } }] }))],
    };
    const [rows, total] = await Promise.all([
      db.activity.findMany({ where, take: limit, orderBy: { occurredAt: "desc" }, include: { user: { select: { name: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } } }),
      db.activity.count({ where }),
    ]);
    if (total) groups.push({ kind: "activity", label: KIND_LABEL.activity, total, hits: rows.map((a) => ({ id: a.id, kind: "activity", title: a.body.length > 80 ? a.body.slice(0, 80) + "…" : a.body, sub: [ACTIVITY_LABEL[a.type], a.user?.name, fmtMD(a.occurredAt), a.project?.name ?? a.customer?.name].filter(Boolean).join(" · "), href: a.project ? `/projects/${a.project.id}` : a.customer ? `/customers/${a.customer.id}` : "/" })) });
  }

  return groups;
}
